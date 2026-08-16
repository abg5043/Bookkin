# Library adapters

Library integration is a capability-based external handoff. Core recommendation behavior remains useful when a library supports only official catalog search links.

The owner-approved Checkpoint 6 architecture, trust boundaries, lifecycle, persistence decision, and diagrams are recorded in `checkpoint-6-library-adapter-proposal.md`.

Checkpoint 6 is limited to:

- A generic `LibraryAdapter` capability contract.
- Johnson County Library official catalog-search URL construction.
- ISBN search with tested title fallback.
- Unsupported-capability behavior.
- Honest handoff wording.
- Preferred library system only when first needed.

Preferred branch storage and UI are deferred because V0.1 has no approved branch-specific capability. Bookkin must not request library credentials or claim current checkouts, borrowing history, availability, holds, authentication, or branch filtering.

Opening a catalog result or scanning a book does not mark it borrowed. `Mark as borrowed` is an explicit user action.

## Checkpoint 6 implementation boundary

- The application-owned contract is `src/application/libraries/library-adapter.ts`.
- The Johnson County implementation is `src/infrastructure/libraries/johnson-county-library.ts`.
- The code-owned resolver is `src/infrastructure/libraries/library-adapters.ts` and fails closed for unknown adapter IDs.
- The adapter constructs `https://jocolibrary.bibliocommons.com/v2/search` links with only `query` and `searchType=smart`.
- A valid ISBN is primary. When a verified title is also present, the adapter returns a separate title fallback for a later user-invoked action.
- A malformed supplied ISBN is a typed invalid input, not a silent title fallback.
- URL construction is synchronous and makes no network request, database write, history mutation, or availability claim.

Persisted `catalogBaseUrl` and capability strings are not trusted runtime navigation configuration. Johnson County's protocol, host, path, and supported capability are owned by adapter code and regression tested. The external URL contract was manually verified against the official Johnson County catalog and BiblioCommons search guidance on 2026-08-15; it must be reverified if those regression tests need to change.
