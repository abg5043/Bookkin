# Data model

This document describes the historical model and the owner-approved Checkpoint 5B transition now in bounded implementation. The canonical PostgreSQL schema and active provider-specific migration history live in `prisma/`; the unchanged historical SQLite migrations are archived under `docs/architecture/migrations/sqlite/`.

## Current implemented concepts

- `Household` is the private ownership boundary.
- `ChildProfile` contains minimal family context.
- `BookWork` is the conceptual recommendation identity.
- `BookEdition` is a specific ISBN-bearing edition.
- `FamilyBook` is an explicitly created household-to-work shelf record.
- `FamilyBookEdition` records encountered editions without duplicating the work on the shelf.
- `ReadingEvent` and `Reaction` record history.
- Recommendation and library records in the historical schema do not authorize their future workflows.

`FamilyBook.shelfStatus` represents exactly one current relationship: `owned`, `borrowed`, or `wishlist`. Discovery, a recommendation, a scan, and reading history are not shelf statuses.

## Checkpoint 5B approved extensions

The owner approved the exact phase-one types, constraints, ownership, deletion, migration, and rollback boundaries on 2026-08-15. Implementation remains limited to the Checkpoint 5B plan.

### PreferenceObservation

A durable observation links to a verified work and records:

- Declaration time.
- Provenance.
- Subject: child, caregiver, or family reference.
- Reporter separately from subject.
- Unknown reading time unless a separate truthful event exists.

A family reference is weaker distinct evidence and is never expanded into child and caregiver reactions. A child-subject observation defaults to caregiver-reported unless an approved direct-child interaction supplies other provenance.

Creating an observation must not implicitly create a shelf record, reading event, reaction, status, finish, reread, or borrowing fact.

An incorrect observation uses source-preserving retract or replace semantics. Retracted or superseded observations are excluded immediately from taste, scoring, explanations, and attribution. Privacy deletion remains separate.

### RecommendationRequestReference

A verified work used only for `More like this` belongs to one request or result. It is not durable taste evidence and creates no shelf, history, reaction, or preference record.

### ReadingEventAmendment

Reading events remain append-only. A retract amendment excludes the original event from current timelines, reread counts, taste inputs, and attribution while retaining audit history. A replace amendment retracts the original and links a new valid event. Corrected reactions attach to the replacement.

### Interest history

Current and ended interests remain distinct and time-aware. Ending an interest does not erase it. Exact records and decay behavior require the Checkpoint 5B and 7B gates respectively.

Incorrect interest entries and reactions use source-preserving retract, replace, or supersession semantics. Only currently valid chains contribute to taste and recommendation inputs.

### Recommendation records

The model must support:

- Request context and request-scoped references.
- Verified candidate provenance and field coverage.
- Eligibility and exclusion evidence.
- Persisted scoring and composition versions.
- Source signals and deterministic explanations.
- Requested target and actual result count.
- Typed result: `normal`, `limited_verified_pool`, or `no_eligible_candidates`.
- Limited-pool reason.
- Explicit recommendation actions and links to later events or editions.

## History and correction rules

- `ReadingEvent` is limited to reading-session outcomes or explicit reading decisions: finished, reread, stopped, or internal rejected shown to consumers as `Decided not to read`.
- `RecommendationAction` records save, `Not for us`, catalog open, replacement, and attribution links.
- Borrowed and returned are explicit shelf-relationship transitions, not reading events.
- Child-selected and caregiver-selected are provenance on the relevant action or encounter, not reading events.
- A finish or reread attribution links to one valid reading event; it does not duplicate or replace that event.
- Reading events and recommendation actions are append-only facts.
- Reactions remain separate by subject and attach to one currently valid reading event.
- No event or reaction is preselected in the UI.
- Reread counts derive only from valid event chains.
- Current recommendation disposition is derived from action history rather than destructive mutation.

## Privacy and deletion

Household-owned records cascade or are otherwise fully removed through an approved household-deletion operation. Shared verified metadata may remain for other households. Application use cases and request boundaries enforce household scope; database relations do not substitute for authorization.

Exact birthdates, legal names, child photos, schools, location history, library credentials, card numbers, and PINs are outside the model.

## Validation and serialization

- ISBNs are normalized and validated before persistence.
- Partial provider dates remain partial strings rather than invented exact dates.
- Times are stored in UTC and localized only for display.
- Serialized fields are owned by versioned validation schemas; UI and adapters do not parse arbitrary JSON.
- Household, child, work, edition, event, and observation ownership is validated together in application use cases.
- Repeated mutations are idempotent where appropriate.

## Database decision

PostgreSQL 18 is canonical for local development and CI and is the required database family for later hosting. The approved Checkpoint 5B decision selected:

- Windows-local PostgreSQL method.
- Canonical migration history.
- Current SQLite data disposition; no automatic copy is assumed.
- Forward migration and rollback.
- Backup and restore implications.
- Blocking Prisma and use-case debt only.

There is no dual-write or dual-provider runtime. The SQLite migration history is audit-only, the ignored local SQLite data was privately backed up, and PostgreSQL starts from the approved minimal seed. Hosted provisioning remains Checkpoint 8A.
