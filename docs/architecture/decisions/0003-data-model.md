# ADR 0003: Durable domain model

## Status

Historical accepted decision for the Checkpoint 2 SQLite implementation. ADR 0004 supersedes its correction and reaction-provenance behavior, and ADR 0005 supersedes its database-provider and portability choices as of the approved Checkpoint 5B phase-one decision on 2026-08-15. Work/edition identity and the historical facts below remain descriptive where they do not conflict with those newer decisions.

## Work versus edition

`BookWork` represents the conceptual book used by recommendations and the household shelf. `BookEdition` represents an ISBN-bearing publication encountered through a provider, manual entry, or scan. `FamilyBook` is unique per household and work; `FamilyBookEdition` records the editions that household has encountered.

This prevents the shelf from showing duplicate conceptual books while preserving edition-specific ISBN history.

## Append-only reading events

`ReadingEvent` records a reading-session outcome or explicit reading decision: finished, reread, stopped, or the historical internal rejected value shown to consumers as `Decided not to read`. It has no mutable status field. Event types are validated in the domain layer. Reread counts and timelines derive only from currently valid reading-event chains.

Reactions are separate records attached to a reading event. The historical implementation used child and parent subjects; the revised SDD uses child and caregiver terminology and requires source-preserving correction. Exact migration behavior belongs to Checkpoint 5B.

All persisted timestamps are UTC. The domain layer must validate that the child, household, work, and optional edition belong to the same household context before creating an event.

## Family-book shelf status

`FamilyBook.shelfStatus` records one current state: owned, borrowed, or wishlist. Discovery and suggestion are events/provenance, not current shelf states. The migration preserves an unambiguous legacy status and marks mixed legacy records for review rather than guessing.

## Recommendation attribution

Recommendations target works and preserve score, rank, scoring version through the batch, source signals, and explanation. Saves, `Not for us`, catalog opens, replacement requests, scans, and attribution links are append-only `RecommendationAction` records. A finish or reread attribution links to a valid later `ReadingEvent`; it does not replace or duplicate that reading event. Borrowed and returned are explicit shelf-relationship transitions. Child or caregiver selection is provenance on the relevant action or encounter.

This keeps attribution truthful and avoids mutating a recommendation into one irreversible status.

Repeated actions are allowed. The latest save or `Not for us` action determines the current recommendation disposition. Catalog opens and scans remain cumulative actions; linked valid reading events and shelf transitions remain their own authoritative facts.

## Privacy and portability

Household-owned records cascade on household deletion. Shared book metadata remains separate from household data. Exact birthdates and legal names are not required. JSON-like provider and signal fields are stored as validated strings in the first migration to avoid database-specific JSON behavior.

The historical schema intentionally uses string domain values, normalized ISBN fields, UTC timestamps, validated JSON-string shapes, and no raw SQL or database-specific enum/array features. These portability choices remain facts about the current SQLite implementation, not requirements for an approved future canonical PostgreSQL design.
