# Checkpoint 7P phase-one proposal — protected preview foundation

Status: **awaiting human product-owner authorization.** This document creates no account, incurs no cost, provisions nothing, handles no secret, deploys nothing, and invites no one. Conceptual approval of Checkpoint 7P is not execution authority; each action below requires explicit authorization naming that action.

Prepared: 2026-08-16, after Checkpoint 7A delivery (`6ad3468`).

## Decision requested

Authorize a protected, synthetic-data-only preview of the approved application, reachable on real phones by the owner and explicitly invited reviewers, so later checkpoints receive continuous device feedback and the final design direction can be chosen on real hardware.

## Why now

Three things are currently blocked by the absence of a hosted preview:

1. The **design-direction lock** recorded in the plan requires comparing Refined Brighter against Original Bright Snap on real devices, and is due no later than this checkpoint's review. Every prototype built until that decision costs double.
2. **Real-phone validation** of Checkpoint 7A's Reading profile has not happened. It has been verified in a desktop browser only; the responsive behavior at 375px is asserted by CSS inspection, not by a thumb in a library.
3. The **per-household cost baseline** that section 9.2 requires has no first data point, and every later cost and monetization decision compounds from it.

## Two findings the owner should weigh before choosing

**1. Vercel's free tier may not permit this product's future.** Current Vercel terms restrict the Hobby plan to non-commercial personal projects. A private, unmonetized preview plausibly qualifies today, but the plan's section 9.2 explicitly anticipates charging families later. Building the preview on a tier whose terms exclude commercial use means either migrating at exactly the moment the product starts earning, or upgrading to Pro at roughly **$20/month**. This should be a deliberate choice now, not a discovery later.

**2. Platform-level password protection is likely a paid feature.** Vercel's built-in Deployment Protection has historically required Pro. I could not confirm its current tier from public pricing pages, and I am not going to assert a specific gating claim I have not verified. This matters because the checkpoint requires "platform-level access control," and if that feature is Pro-only, the free-tier path needs a different protection mechanism (option B below). **Whoever executes this must verify the current terms at authorization time rather than relying on this document.**

## Vendor options

### Application hosting

| Option | Cost | Protection | Notes |
| --- | --- | --- | --- |
| **A. Vercel Hobby** | $0 | Requires verification; may need the middleware in option B | First-party Next.js support, zero-config deploys. Non-commercial terms are the open question above. |
| **B. Vercel Hobby + app-level gate** | $0 | Middleware password gate we write and control | Removes dependence on a possibly-paid platform feature. Adds a small amount of code we own and must review as a security surface. |
| **C. Vercel Pro** | ~$20/mo + usage | Platform Deployment Protection | Removes both the commercial-terms and protection-feature questions. Buys certainty rather than capability. |
| **D. Render / Fly.io / Railway** | Varies, free tiers exist | Platform or app-level | Avoids the Vercel terms question but loses first-party Next.js integration and adds build configuration this project does not currently need. |

### Managed PostgreSQL

The plan requires "the same canonical database family as local and CI," which is PostgreSQL 18 via Docker locally. Both candidates satisfy that.

| Option | Free tier | Paid | Notes |
| --- | --- | --- | --- |
| **Neon** | 0.5 GB storage, 100 CU-hours/month, scales to zero after 5 min idle | ~$0.106/CU-hour, ~$0.35/GB-month, no monthly minimum | Serverless Postgres with database branching. Scale-to-zero suits a preview used in bursts. Acquired by Databricks in 2025; pricing has moved *down* since. |
| **Supabase** | Free project tier | Paid tiers available | Bundles auth we explicitly do not want yet (application authentication is excluded from 7P). |

**Recommendation: Neon.** A preview used intermittently is close to the ideal scale-to-zero workload, the free tier's 0.5 GB is far beyond synthetic showcase data, and there is no monthly floor if it ever exceeds free.

## Recommended path

**Vercel Hobby + Neon free tier, with an app-level password gate (option B), at $0/month** — on the explicit condition that the executor verifies Vercel's current commercial-use terms first. If those terms are judged incompatible with the product's intended future, **option C at ~$20/month** is the honest alternative, and worth it to avoid migrating under pressure later.

## Protection model

- No public registration, no search-engine indexing (`X-Robots-Tag: noindex`, `robots.txt` disallow), no unrestricted link sharing.
- A single shared preview passphrase, owner-held, rotatable without redeploying application code.
- Unauthenticated access must be **denied**, not merely unlinked. Acceptance requires demonstrating a denied request, not just a working authorized one.
- The gate is not application authentication and must not be presented as such. Real household auth remains Checkpoint 12A.
- No secret is committed. All credentials live in the hosting platform's environment configuration, owner-owned.

## Data policy

- **Synthetic showcase data only.** No copy of any local household database, and no real child profile.
- A deterministic seed produces the same showcase household, readers, shelf, and history on every reset, so reviewers see a consistent product and any bug is reproducible.
- A one-command preview reset restores that known state.
- Migrations run through the existing `prisma migrate deploy` path already used locally and in CI, so the preview cannot drift from the canonical schema.

## Migration, rollback, and teardown

- **Migration:** deploy applies committed migrations only; no ad-hoc schema edits against the hosted database.
- **Rollback:** redeploy the previous known-good commit; the database rolls back by reseed, which is safe precisely because the data is synthetic.
- **Teardown:** a written, owner-executable sequence that deletes the deployment, the database, and the environment secrets, leaving no billable resource. The checkpoint's acceptance evidence requires a teardown rehearsal or a verified dry run — teardown is not documented and assumed, it is exercised.

## Cost baseline method

The first per-household cost figure required by section 9.2 will be recorded as: hosting cost + database cost + any provider cost, divided by households served, stated at the observed tier with the free-tier allowances explicitly named. Because the preview serves one household, this figure is a **ceiling, not a projection** — it will be labeled as such so it is never mistaken for a scaling estimate. Section 9.2's caution applies: it must not quietly exclude owner support time.

## Excluded from this checkpoint

Public registration, public indexing, unrestricted sharing, application authentication, production family-data migration, custom domain or DNS, PWA or offline caching, external focus-group invitations, and zero-setup local demo implementation.

## Owner decisions required

1. **Hosting option A, B, C, or D**, accepting the commercial-terms tradeoff stated above.
2. **Neon**, or an alternative managed PostgreSQL.
3. **A monthly spend ceiling** you are willing to absorb before revenue exists, which section 9.2 makes the trigger for pausing enrollment later.
4. **Who may access the preview** besides you, and by what means the passphrase reaches them. Inviting reviewers is an external action requiring its own authorization with exact recipients and wording.
5. **Whether the preview-only styling toggle** ships in the first deployment or a follow-up, given it exists to serve the design-direction decision.

## Explicit authorization required before execution

No account creation, billable use, remote deployment, secret handling, database provisioning, invitation, or DNS change may occur until the owner authorizes those exact actions. Approval of this proposal authorizes preparation and presentation only.
