# Plan: rate limiting for the preview unlock endpoint

Status: **plan only.** Nothing here is implemented. It exists so a known weakness is scheduled rather than remembered.

Source: independent security review of the Checkpoint 7P preview gate, 2026-08-16. The review found the gate sound for its stated purpose and flagged this as the one issue that scales badly.

## The problem

`POST /preview-unlock` (`src/proxy.ts`) accepts unlimited passphrase attempts from any origin. Nothing counts attempts, throttles them, or locks out. A script can guess continuously at network speed.

Two properties make this worse than it first looks:

- Serverless functions are stateless per invocation, so there is no natural in-memory counter to lean on. Any real fix needs shared state or a platform control.
- Possessing the cookie digest is equivalent to possessing the passphrase, and the cookie has no server-side expiry. A single successful guess yields indefinite access until the passphrase is manually rotated.

## Current risk, stated honestly

**Low right now, and not a reason to delay the preview.** The protected data is synthetic, there are no real accounts, the audience is a handful of named reviewers, and the runbook already instructs the owner to use a multi-word passphrase, which is not realistically guessable online.

**Unacceptable once real data exists.** At Checkpoint 12A the same surface would guard actual family and child records. The severity changes entirely at that point even though the code does not.

## Trigger conditions

Implement before whichever comes first:

1. The preview URL is shared beyond a small group of individually named reviewers.
2. Any non-synthetic data is loaded into a hosted environment.
3. Checkpoint 12A begins, which is the hard deadline regardless of the above.

Until one of those is reached, no work is required.

## Options

| Option | Cost | Fit |
| --- | --- | --- |
| **A. Vercel WAF / firewall rule** rate-limiting `/preview-unlock` by IP | Paid tiers only | Zero application code, and it stops traffic before it reaches a function. Conflicts with the $0 constraint today. |
| **B. Durable counter in PostgreSQL**, keyed by IP with a short window | $0 | Uses the database already provisioned. Adds a write on every unlock attempt, which is acceptable at this volume. Works on any host. |
| **C. Managed KV/Redis counter** (Vercel KV, Upstash) | Free tiers exist | Purpose-built and fast, but adds a vendor and a dependency for one endpoint. |
| **D. Progressive delay** in the handler, no shared state | $0 | Ineffective on serverless: each invocation is a fresh process, so an attacker simply parallelizes. Rejected. |

**Recommendation: option B while the preview is free, revisited at 12A.** It costs nothing, adds no vendor, works regardless of host, and the volume is trivially small. If 12A moves the project onto paid infrastructure anyway, option A becomes attractive because it keeps abusive traffic out of the application entirely.

## Proposed behavior, if option B is chosen

- Count failed attempts per client IP in a fixed window, roughly ten attempts per fifteen minutes.
- On exceeding the limit, return `429` with a generic message and a `Retry-After` header. The message must not reveal whether any attempt was close, nor whether the endpoint is configured.
- Count only failures. A successful unlock clears that IP's counter.
- Record no passphrase, no attempted value, and no user agent. The counter stores an IP, a count, and a window timestamp, and rows are pruned on write.
- Fail **open on counter error**, not closed. A database hiccup must not lock the owner out of their own preview; the passphrase check itself still runs and is the real control. This is a deliberate inversion of the gate's own fail-closed rule, and it is correct here because the counter is a mitigation, not the protection.
- Apply to `/preview-unlock` only. Ordinary gated requests already fail fast on a cookie check and are not a guessing oracle.

## Testing requirements

Extend `tests/unit/preview-gate.test.ts`:

- The limit permits the configured number of failures and rejects the next with `429`.
- A successful unlock resets the counter for that IP.
- Two different IPs are counted independently.
- A counter backend failure does not block a correct passphrase.
- No attempted passphrase value is persisted or logged.

## Related hardening to consider at the same time

Both were raised by the same review and are cheap to fold in:

- **Bind the cookie to an issue time**, for example an HMAC over passphrase plus issued-at, so a captured cookie genuinely expires server-side instead of relying on the browser honoring `maxAge`. Until then, the runbook should not describe this as a twelve-hour session.
- **Reconsider excluding `/_next/image`** from the gate. It is currently scoped by `next.config.ts` to `covers.openlibrary.org` only, so it is not an open proxy, but it is unauthenticated surface with no current justification.

## Explicitly out of scope

This is preview-gate hardening only. It is not application authentication, does not alter the Checkpoint 12A identity design, and grants no authority to provision a vendor. Choosing option A or C requires the owner's separate authorization for that account and cost.
