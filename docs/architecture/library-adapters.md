# Library adapters

Library integration is a capability-based external handoff. Core recommendation behavior remains useful when a library supports only official catalog search links.

Checkpoint 6 is limited to:

- A generic `LibraryAdapter` capability contract.
- Johnson County Library official catalog-search URL construction.
- ISBN search with tested title fallback.
- Unsupported-capability behavior.
- Honest handoff wording.
- Preferred library system only when first needed.

Preferred branch storage and UI are deferred because V0.1 has no approved branch-specific capability. Bookkin must not request library credentials or claim current checkouts, borrowing history, availability, holds, authentication, or branch filtering.

Opening a catalog result or scanning a book does not mark it borrowed. `Mark as borrowed` is an explicit user action.
