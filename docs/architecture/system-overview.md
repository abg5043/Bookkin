# System overview

Bookkin is a modular monolith.

The intended boundaries are:

- `src/app/` - Next.js routes, pages, and request entry points.
- `src/domain/` - Pure product rules, types, and recommendation contracts.
- `src/application/` - Household-scoped use cases and provider ports.
- `src/infrastructure/` - Prisma persistence and external adapters.
- `src/components/` - Reusable presentation components.

First-party mutations remain thin entry points that delegate to application use cases. Provider responses are normalized and validated before persistence or presentation. UI components do not call external providers directly.

## Planned hosted topology

```text
Protected responsive browser
        | HTTPS
Hosted Next.js modular monolith and first-party request handlers
        |
Managed PostgreSQL
        |
Approved metadata and narrow library adapters
```

PostgreSQL is a proposal until the Checkpoint 5B human gate approves the schema, Windows-local method, migration and rollback plan, CI behavior, and disposition of current SQLite development data.

V0.1 implements responsive protected web, not a PWA. It does not implement a service worker, offline writes, private-response caching, or an installability promise. Each requires a separately approved future checkpoint. A protected hosted preview precedes camera testing.

## Recommendation flow

1. Collect coarse age or reading stage plus either one current interest, one explicitly retained verified preference observation, or one verified request-scoped reference. The user chooses whether a reference is durable or request-only.
2. Read durable preference observations, valid reading events, separate reactions, interest phases, and explicit recommendation outcomes.
3. Source, hydrate, normalize, deduplicate, and exclude candidate works through metadata-provider boundaries.
4. Score and compose candidates deterministically with persisted versions and source signals.
5. Return a typed normal, limited-pool, or no-candidate result with deterministic explanations.
6. Open the official library catalog through a capability-declaring adapter.
7. Attribute only explicit later actions and feed them into later deterministic requests.

AI is not part of the V0.1 critical path. A future local provider may only reword verified deterministic explanation clauses after a separate gate. A hosted provider requires a separate scope and child-privacy decision.

## Measurement and public boundary

Domain records remain authoritative for reading and recommendation outcomes. A separate allowlisted measurement boundary may record only non-content funnel and reliability events, works as a no-op, and rejects sensitive child and book payloads.

Household alpha remains private behind platform-level protection. Application authentication and household authorization are Checkpoint 12A prerequisites for multiple households. Any optional public acquisition surface is separately gated in Checkpoint 12B but remains within the modular monolith, with no path into private household data. A separate deployable application or service would require another explicit owner-gated architecture decision.
