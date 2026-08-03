# Bookkin — Codex Build Plan

> **Working name:** Bookkin  
> **Document purpose:** Turn the product concept into a controlled, reviewable implementation plan for Codex or another coding agent.  
> **Primary rule:** Complete **one checkpoint at a time**, present the results for human review, and **do not continue until explicitly approved**.

---

## 1. Instructions to Codex

You are acting as a staff software engineer, product-minded architect, and careful implementation agent.

### Operating rules

1. Read this entire document before changing any file.
2. Begin with **Checkpoint 0 only**.
3. Never implement more than one checkpoint without explicit human approval.
4. At the end of every checkpoint:
   - Stop making changes.
   - Summarize what you did.
   - List every important file added or modified.
   - Report commands run and whether they passed.
   - Explain material architecture or UX decisions.
   - Identify unresolved questions, risks, and compromises.
   - Give the human a short manual review checklist.
   - Ask for approval to continue.
5. Do not interpret approval of one checkpoint as approval of later checkpoints.
6. Prefer a small, complete vertical slice over a broad prototype.
7. Do not add functionality merely because it seems useful.
8. Do not replace deterministic application logic with an LLM call.
9. Never invent:
   - ISBNs
   - Authors
   - Book metadata
   - Library availability
   - User reading history
   - Library capabilities
10. Do not scrape authenticated library pages or store library credentials.
11. Keep child data minimal and private.
12. Build accessible loading, empty, success, and error states for every user-facing workflow.
13. Write automated tests for important domain behavior.
14. Preserve a clean boundary between:
   - Core product logic
   - Book metadata providers
   - Library-system integrations
   - AI providers
15. When the repository state differs from this plan, explain the conflict before changing direction.

---

## 2. Product summary

Bookkin is a family reading companion that learns what a child and caregiver enjoy reading together, then recommends books to find at their local library.

It is **not primarily a reading tracker** and should not feel like Goodreads for children.

### Core promise

> Track what worked in seconds. Build a better library bag next time.

### Core loop

1. Scan or search for a book.
2. Classify how the family encountered it.
3. Record what happened during reading.
4. Record separate child and parent reactions.
5. Learn from behavioral signals.
6. Generate a small, curated library bag.
7. Open recommendations in the user’s library catalog.
8. Connect later scans and reading events back to recommendations.

### Initial target user

A parent or caregiver who:

- Reads picture books or early-reader books with a child.
- Uses a public library regularly.
- Borrows multiple books per trip.
- Wants better recommendations.
- Does not want to write detailed reviews.
- Cares about both the child’s reaction and the adult read-aloud experience.

### Initial age focus

Approximately ages 2–8, beginning with parent-led picture-book reading.

---

## 3. Product principles

### 3.1 Behavior over ratings

The strongest signals are events:

- Suggested
- Saved
- Borrowed
- Started
- Finished
- Stopped
- Rejected
- Read again
- Returned
- Child selected
- Parent selected

A simple explicit reaction is still useful:

**Child**
- Love
- Like
- Not for me

**Parent**
- Love
- Like
- Dislike

Do not force users to write reviews.

### 3.2 Parent and child preferences remain separate

A child may love a book that the parent dislikes reading. The system must preserve both reactions rather than averaging them into one rating.

### 3.3 Logging must be nearly effortless

The common reading-log interaction should take roughly ten seconds or less.

### 3.4 Scanning is the universal integration layer

Many library systems do not expose checkout history or third-party account access.

ISBN/barcode scanning must therefore work independently of library APIs and support:

- Library books
- Books owned at home
- Gifts
- Books seen in stores
- Books borrowed from friends
- Books read at school
- Previously suggested books

Scanning should gradually construct the family’s personal library and reading history.

### 3.5 Library integrations are capability-based enhancements

The application must remain useful when a library supports only catalog links.

Never assume a library supports:

- Real-time availability
- Holds
- Checkout import
- Borrowing-history import
- Authenticated third-party access

### 3.6 Recommendations should be curated and explainable

Show a small collection of strong choices, not an endless feed.

Each recommendation should explain why it fits using actual family signals.

### 3.7 AI is assistance, not authority

Use AI for:

- Interpreting a natural-language request
- Summarizing a family taste profile
- Inferring controlled descriptive attributes
- Explaining verified recommendations

Do not use AI as the source of truth for:

- ISBNs
- Author names
- Publication facts
- Library availability
- Reading history
- Whether a library supports a feature

---

## 4. Initial product scope

## V0.1 must support

- One household
- One child profile
- Manual ISBN entry
- Title and author search
- Camera barcode scanning
- Batch scanning
- Book metadata normalization
- A family shelf
- Owned, borrowed, discovered, suggested, and wishlist classifications
- Finished, reread, stopped, and rejected reading events
- Separate child and parent reactions
- Reread counts
- A chronological book history
- Five-book recommendation batches
- Recommendation explanations
- Recommendation feedback
- A generic library integration boundary
- Johnson County Library catalog links
- Preferred library and branch settings
- Recommendation-to-scan attribution
- Responsive mobile and desktop layouts
- Installable PWA behavior
- Straightforward Windows development and deployment instructions

## Explicitly outside V0.1

- Logging into a library account
- Storing library card numbers or PINs
- Scraping authenticated library pages
- Claiming real-time availability without an approved data source
- Placing holds inside Bookkin
- Automatic borrowing-history import
- Multiple caregivers
- Multiple children
- Public child profiles
- Social feeds
- Leaderboards
- Reading streak pressure
- Reading assessments
- A general-purpose chatbot
- Purchases or affiliate links
- Native mobile applications
- Microservices
- Complex production-scale recommendation infrastructure

---

## 5. Recommended technical direction

Treat this as a starting proposal to validate during Checkpoint 0.

### Application

- Next.js App Router
- TypeScript
- Responsive web application
- Progressive Web App
- Server-side route handlers or server actions where appropriate

### UI

- Tailwind CSS
- A small internal component system
- Accessible semantic HTML
- Mobile-first layouts

A component library may be introduced only if it materially improves consistency without creating a generic dashboard appearance.

### Persistence

- Prisma ORM
- SQLite for local development
- PostgreSQL for hosted production

### Validation and testing

- Zod
- Unit tests for domain logic
- Integration tests for route and persistence behavior
- Playwright for critical end-to-end workflows
- ESLint
- TypeScript type checking
- Production build validation

### External integrations

- `BookMetadataProvider` interface
- Open Library provider
- One fallback metadata provider if needed
- `LibraryAdapter` interface
- Johnson County Library adapter with supported public actions only
- `AIProvider` interface

### Deployment

- Easy local use on Windows
- `.env.example`
- PowerShell setup and validation scripts
- Hosted HTTPS preview for phone-camera testing
- Standard Node.js deployment
- Optional Docker support only after the basic setup works

### Architectural principle

Start as a modular monolith. Do not create separate services until there is demonstrated need.

---

## 6. UX direction

The interface should feel like a premium reading application, not generic SaaS.

### Visual character

- Warm paper or cream surfaces
- Ink-like dark typography
- One restrained accent color
- Editorial hierarchy
- Large, high-quality book covers
- Generous whitespace
- Minimal icon use
- Soft depth used sparingly
- Sophisticated parent-facing screens
- Playful child reactions only where appropriate

### Avoid

- Dense dashboards
- Excessive rounded cards
- Purple-gradient AI styling
- Gamified streaks
- Childish decoration across the entire application
- Long forms
- Walls of tags
- Chat as the main navigation model
- Fake library availability

### Primary navigation

- Home
- Shelf
- Scan
- Library Bag
- Profile/Settings

### Core screens

1. Home
2. Scan
3. Scan result
4. Batch scan
5. Quick reading log
6. Book detail/history
7. Family shelf
8. Library bag setup
9. Library bag results
10. Taste profile
11. Library settings
12. Empty/error/loading states

---

## 7. Domain model

Codex should propose and review the precise schema before implementation.

### Household

Represents a family account.

### ChildProfile

Suggested fields:

- ID
- Household ID
- Display name or nickname
- Birth month/year or age band
- Current interests
- Optional content preferences
- Created and updated timestamps

Avoid requiring a legal name or exact birthdate.

### BookWork

The conceptual book:

- Title
- Subtitle
- Authors
- Description
- Subjects
- Series
- Language
- Normalized metadata
- Metadata provenance

### BookEdition

A specific edition:

- Work ID
- ISBN-10
- ISBN-13
- Publisher
- Publication date
- Format
- Page count
- Cover URLs
- Metadata provenance

A scan identifies an edition. Recommendations generally target a work.

### FamilyBook

Connects a household to a work or edition:

- Owned
- Borrowed
- Wishlist
- Discovered
- Suggested
- Seen at library
- Read elsewhere
- First seen timestamp
- Last seen timestamp
- Added via scan, search, import, or recommendation

Avoid forcing these into one mutually exclusive status when multiple facts can be true.

### ReadingEvent

Append-only event record:

- Child ID
- Book/work ID
- Edition ID when known
- Event type
- Timestamp
- Optional context
- Optional stop reason
- Optional notes

Core event types:

- Finished
- Read again
- Stopped
- Rejected
- Borrowed
- Returned
- Child selected
- Parent selected

### Reaction

Attached to a reading event or reading session:

- Subject: child or parent
- Value
- Optional controlled tags

### RecommendationBatch

Stores the context in which recommendations were generated:

- Child
- Requested mood/context
- Filters
- Generation timestamp
- Model/scoring version

### Recommendation

Stores:

- Batch
- Recommended work
- Deterministic score
- Source signals
- Explanation
- Rank
- Saved timestamp
- Rejected timestamp
- Catalog-opened timestamp
- Later scanned timestamp
- Later borrowed timestamp
- Later finished timestamp
- Later reread count

### LibrarySystem

Stores:

- Name
- Adapter identifier
- Catalog base information
- Selected branches
- Supported capabilities

---

## 8. Required adapter boundaries

### Book metadata

```ts
interface BookMetadataProvider {
  lookupByIsbn(isbn: string): Promise<BookLookupResult | null>;
  search(query: string): Promise<BookSearchResult[]>;
}
```

Provider responses must be normalized before reaching UI components.

Store field-level or record-level provenance where practical.

### Libraries

```ts
type LibraryCapabilities = {
  catalogSearch: boolean;
  titleLinks: boolean;
  availability: boolean;
  holds: boolean;
  currentLoans: boolean;
  borrowingHistory: boolean;
};

interface LibraryAdapter {
  id: string;
  displayName: string;
  capabilities: LibraryCapabilities;

  buildCatalogSearchUrl(book: BookWork): string;

  buildTitleUrl?(book: BookWork): Promise<string | null>;

  getAvailability?(
    book: BookWork,
    branches?: string[]
  ): Promise<LibraryAvailability[]>;

  importCurrentLoans?(): Promise<ImportedLoan[]>;

  importBorrowingHistory?(): Promise<ImportedHistoryItem[]>;
}
```

Optional capabilities must remain genuinely optional.

### AI

```ts
interface AIProvider {
  summarizeTasteProfile(
    input: TasteProfileInput
  ): Promise<TasteProfileSummary>;

  explainRecommendation(
    input: RecommendationExplanationInput
  ): Promise<RecommendationExplanation>;
}
```

Every AI response must be validated against a schema.

---

## 9. Johnson County Library constraints

The initial Johnson County Library integration should be conservative.

### V0.1 may support

- Selecting Johnson County Library as the library system
- Saving preferred branches
- Constructing official catalog-search links
- Opening ISBN/title searches in the official catalog
- Manually recording that a book was borrowed
- Connecting a later scan to an earlier recommendation

### V0.1 must not claim

- That Bookkin knows the user’s current checkouts
- That Bookkin knows historical checkouts
- That a copy is available
- That a hold was placed
- That Bookkin is authenticated with the library

### Product wording

Use wording such as:

- “Find at Johnson County Library”
- “Open catalog”
- “Mark as borrowed”
- “Check availability in library catalog”

Do not use:

- “Available now” unless verified
- “Place hold” unless the official link reliably supports that action
- “Your checkouts” unless imported through an approved capability

---

## 10. Recommendation system V0.1

The first version must be deterministic and inspectable.

### Candidate set

Use verified books from:

- The local book catalog
- Books entered by users
- Carefully seeded verified records
- Metadata-provider search results

Never let an LLM invent the candidate catalog.

### Example scoring signals

```text
+8  Similar to a child-loved book
+8  Similar to a repeatedly read book
+5  Similar to a parent-loved book
+4  Same successful author or series
+4  Matches requested context
+3  Appropriate age and estimated length
+2  Adjacent exploration
-8  Similar to rejected books
-6  Parent strongly disliked similar books
-5  Already read, unless rereads are requested
-4  Too similar to other books in the same bag
```

Codex should implement a versioned scoring module with unit tests.

### Library bag composition

Initially return five books:

- Two high-confidence matches
- One author or series extension
- One adjacent discovery
- One exploratory choice

### AI explanation

The LLM receives only verified structured facts and explains the selected result in approximately 20–40 words.

The explanation must not add unsupported claims.

---

## 11. Success metrics

### North-star metric

Percentage of recommended books that are:

1. Acted upon,
2. Finished, and
3. Positively received.

A stronger long-term metric is the percentage of recommendations later reread.

### Initial activation

A household:

- Adds at least five books
- Records child and parent reactions
- Generates a library bag
- Opens at least one library catalog link

### Initial quality indicators

- Time to log a completed read
- Successful scan rate
- Duplicate-book rate
- Recommendation save rate
- Catalog-open rate
- Recommendation-to-scan conversion
- Finish rate
- Reread rate
- Rejection rate

Do not optimize for time spent in the app.

---

# 12. Controlled implementation checkpoints

---

## Checkpoint 0 — Repository audit and proposed implementation

### Objective

Understand the current repository and produce a concrete implementation proposal without modifying product code.

### Codex tasks

1. Inspect the repository.
2. Report:
   - Current framework and versions
   - Existing files and structure
   - Current scripts
   - Existing tests
   - Existing CI
   - Existing documentation
   - Whether the repository is empty, scaffolded, or partially implemented
3. Compare the current repository with this plan.
4. Propose:
   - Final initial stack
   - Directory structure
   - Package additions
   - Test strategy
   - Checkpoint-by-checkpoint implementation order
   - Risks or conflicts
5. Identify decisions that need human approval.
6. Do not alter application files.
7. A documentation-only proposal file may be created only if asked.

### Required output

- Repository audit
- Architecture proposal
- Proposed file structure
- Proposed dependencies
- Proposed commands
- Risks
- Questions requiring decisions

### Human approval checklist

- Is the application still a modular monolith?
- Is the Windows setup simple?
- Is the stack understandable?
- Are unnecessary services avoided?
- Does the proposal preserve library adapters?
- Does the proposal preserve metadata-provider adapters?
- Is the test plan credible?
- Does any proposed package add unnecessary complexity?

### Mandatory stop

**Stop after presenting the audit and proposal. Do not scaffold or install anything until approved.**

---

## Checkpoint 1 — Foundation and repository guardrails

### Objective

Create a clean, runnable application foundation and persistent agent instructions.

### Codex tasks

Depending on the approved Checkpoint 0 plan:

1. Scaffold or normalize the Next.js TypeScript application.
2. Add:
   - `AGENTS.md`
   - Product documentation directory
   - Architecture documentation directory
   - Story/issue template directory
   - `.env.example`
3. Add or confirm:
   - Linting
   - Type checking
   - Unit-test runner
   - Playwright
   - Production build script
4. Create a minimal health/home page.
5. Add CI that runs:
   - Install
   - Lint
   - Type check
   - Unit tests
   - Production build
6. Add Windows setup instructions.
7. Do not add Prisma, book lookup, scanning, or recommendations unless explicitly approved as part of the foundation.

### Acceptance criteria

- A new developer can clone the repository on Windows and run it.
- The app starts locally.
- The production build succeeds.
- Tests run.
- CI configuration is present.
- `AGENTS.md` tells future agents to follow checkpoint and scope rules.
- No secrets are committed.

### Human review checklist

- Run the documented setup steps.
- Open the app.
- Confirm the repository structure is understandable.
- Review `AGENTS.md`.
- Review all added dependencies.
- Confirm CI passes.

### Mandatory stop

**Stop after the foundation works. Do not begin the database model until approved.**

---

## Checkpoint 2 — Domain model and persistence

### Objective

Define and implement the minimum durable data model.

### Codex tasks

1. Produce a short architecture decision record for:
   - Work versus edition
   - Append-only reading events
   - Family-book classifications
   - Recommendation attribution
2. Propose the Prisma schema before applying migrations.
3. After schema approval within this checkpoint:
   - Configure SQLite for local development
   - Add Prisma
   - Create initial migration
   - Add seed data
4. Add domain types and validation schemas.
5. Add tests for:
   - ISBN normalization
   - Event validation
   - Reaction validation
   - Duplicate-edition prevention
   - Family-book classification behavior

### Acceptance criteria

- Schema represents works and editions separately.
- Reading history is append-only.
- Parent and child reactions remain separate.
- Recommendations can later be connected to scans and reads.
- Local migration succeeds.
- Seed command succeeds.
- Domain tests pass.

### Human review checklist

- Inspect the entity relationship explanation.
- Confirm the model does not reduce history to one mutable status.
- Confirm exact child birthdates are not required.
- Confirm multiple classifications can coexist where appropriate.
- Inspect sample seeded records.

### Mandatory stop

**Stop after schema, migration, seed data, and tests are complete. Do not build UI workflows until approved.**

---

## Checkpoint 3 — Manual ISBN lookup and family shelf vertical slice

### Objective

Create the first complete product path from verified book lookup to saved family book.

### Codex tasks

1. Implement ISBN-10 and ISBN-13 validation.
2. Implement `BookMetadataProvider`.
3. Implement the first external metadata provider.
4. Normalize and cache metadata.
5. Build:
   - Manual ISBN entry screen
   - Lookup result state
   - Not-found/error state
   - Classification choice
   - Save-to-family-shelf action
6. Build a minimal family shelf.
7. Handle duplicate scans/lookups safely.
8. Add integration and end-to-end tests.

### Acceptance criteria

- A valid ISBN returns a verified book when the provider has it.
- Invalid check digits are rejected before external lookup.
- Missing metadata is not invented.
- A book can be marked owned, borrowed, discovered, or wishlist.
- Duplicate editions are not created.
- Saved books survive restart.
- Shelf displays cover, title, author, and classifications.
- Error and empty states are clear.
- Tests cover valid, invalid, missing, and duplicate ISBNs.

### Human review checklist

- Add a real book by ISBN.
- Add it again and verify no duplicate appears.
- Try an invalid ISBN.
- Try an unknown ISBN.
- Restart the application and verify persistence.
- Inspect mobile and desktop layouts.

### Mandatory stop

**Stop after manual ISBN → saved shelf works. Do not implement camera scanning yet.**

---

## Checkpoint 4 — Reading events and reactions

### Objective

Capture useful family reading behavior in seconds.

### Codex tasks

1. Add the quick-log workflow:
   - Finished
   - Read again
   - Stopped
   - Rejected
2. Add child reaction:
   - Love
   - Like
   - Not for me
3. Add parent reaction:
   - Love
   - Like
   - Dislike
4. Add optional controlled reasons for stopped/rejected.
5. Add a book-history timeline.
6. Calculate reread counts from events.
7. Add tests for event ordering and derived summaries.

### Acceptance criteria

- Common logging takes few interactions.
- Reading events are append-only.
- Reread count is derived correctly.
- Parent and child reactions are visibly separate.
- A rejected book can later be finished without erasing the earlier event.
- History survives restart.
- Loading, error, and success feedback exist.

### Human review checklist

- Log a finished book.
- Log a reread.
- Log a stopped book.
- Log a rejection, then later a finish.
- Confirm the timeline is truthful.
- Judge whether the interaction feels fast enough.

### Mandatory stop

**Stop after reading behavior is complete. Do not implement recommendations until approved.**

---

## Checkpoint 5 — Modern design system and core-screen refinement

### Objective

Establish the product’s distinctive visual and interaction language before expanding features.

### Codex tasks

1. Create a lightweight design token system:
   - Color
   - Typography
   - Spacing
   - Radius
   - Shadow
   - Motion
2. Refine:
   - Home
   - Shelf
   - Book detail
   - Quick log
   - Add book
3. Create reusable components without over-generalizing.
4. Add accessibility checks.
5. Add screenshots or visual artifacts if the environment supports them.
6. Preserve functionality from earlier checkpoints.

### Acceptance criteria

- The product feels editorial and reading-focused.
- Book covers are visually prominent.
- There is one obvious primary action per screen.
- The app does not look like a generic admin dashboard.
- Text contrast and keyboard navigation are acceptable.
- Mobile layout is first-class.
- Existing end-to-end workflows still pass.

### Human review checklist

- Review every primary screen at phone width.
- Review desktop width.
- Check hierarchy without reading every label.
- Confirm the UI feels appropriate for a parent.
- Confirm reaction controls can be used by a child.
- Identify anything that feels generic or overly decorative.

### Mandatory stop

**Stop after presenting the refined screens. Do not add library integrations until the visual direction is approved.**

---

## Checkpoint 6 — Generic library adapter and Johnson County Library handoff

### Objective

Make recommendations and books actionable without pretending to have unsupported library access.

### Codex tasks

1. Implement `LibraryAdapter`.
2. Implement capability flags.
3. Implement Johnson County Library V0.1:
   - System selection
   - Preferred branches
   - Official catalog search link
   - Manual borrowed action
4. Ensure UI wording reflects actual capabilities.
5. Add tests for URL construction and unsupported capabilities.
6. Document how another library adapter would be added.

### Acceptance criteria

- The core application does not contain Johnson County-specific logic.
- Johnson County links open official catalog searches.
- The application never claims unverified availability.
- Unsupported actions are hidden or clearly handed off.
- Preferred branches can be stored without implying filtered availability.
- Adapter tests pass.

### Human review checklist

- Open several books in the JCL catalog.
- Confirm title/ISBN searches are useful.
- Review every library-related label for accuracy.
- Confirm no library credentials are requested.
- Review the “add another library” documentation.

### Mandatory stop

**Stop after the generic adapter and JCL handoff work. Do not implement recommendation scoring until approved.**

---

## Checkpoint 7 — Recommendation engine V0.1

### Objective

Rank verified books using transparent family signals.

### Codex tasks

1. Define a versioned candidate-scoring module.
2. Implement initial scoring signals.
3. Ensure rejected and already-read books are handled correctly.
4. Add diversity logic for one recommendation batch.
5. Persist:
   - Score
   - Rank
   - Source signals
   - Scoring version
6. Add an explainability/debug view available only in development.
7. Add extensive unit tests.
8. Do not require an LLM yet unless separately approved.

### Acceptance criteria

- Given fixed input data, ranking is deterministic.
- Every score can be explained by stored source signals.
- Rejected books are strongly suppressed.
- Reread books strongly influence similar candidates.
- Parent dislikes and child likes can both affect ranking.
- One bag is not filled with nearly identical books.
- Tests demonstrate expected ordering.

### Human review checklist

- Seed several loved, liked, disliked, and reread books.
- Inspect ranked candidates.
- Review why each score was produced.
- Adjust weights only with recorded rationale.
- Confirm candidates are real verified books.

### Mandatory stop

**Stop after deterministic recommendations are reviewable. Do not add AI explanations until ranking quality is approved.**

---

## Checkpoint 8 — Library bag and AI explanations

### Objective

Turn ranked candidates into a calm, curated, actionable library-trip experience.

### Codex tasks

1. Build library-bag setup:
   - General trip
   - Bedtime
   - Quick read
   - Funny
   - Try something different
   - More like a favorite
2. Persist a five-book recommendation batch.
3. Compose the bag using confidence and exploration roles.
4. Add:
   - Save
   - Not for us
   - Open library catalog
   - Replace one book
5. Implement `AIProvider`.
6. Generate short explanations from verified structured signals.
7. Validate AI output.
8. Provide a deterministic fallback when AI is unavailable.
9. Track recommendation actions.

### Acceptance criteria

- Refreshing does not silently generate a new bag.
- Each book has a concise, evidence-based reason.
- AI output contains no unsupported facts.
- The bag contains a deliberate mix rather than five near-duplicates.
- Catalog opens are recorded.
- Saves and rejections are recorded.
- The workflow works without the AI provider configured.

### Human review checklist

- Generate bags for multiple contexts.
- Read explanations critically.
- Disable the AI key and confirm graceful fallback.
- Replace one recommendation.
- Save and reject books.
- Open catalog links.
- Decide whether at least two of five books feel worth pursuing.

### Mandatory stop

**Stop after library bags work. Do not add camera scanning until approved.**

---

## Checkpoint 9 — Camera and batch ISBN scanning

### Objective

Make physical books the universal mechanism for building history and the home library.

### Codex tasks

1. Build camera permission flow.
2. Implement barcode detection with feature detection and fallback.
3. Reuse the existing ISBN lookup path.
4. Prevent duplicate rapid detections.
5. Add clear success feedback.
6. Add manual entry fallback.
7. Implement batch mode:
   - Select batch classification
   - Scan repeatedly
   - Review results
   - Resolve duplicates/errors
8. Detect when a scanned book was previously recommended.
9. Ask whether the suggestion led to borrowing or ownership.
10. Add appropriate tests and device-testing documentation.

### Acceptance criteria

- A supported phone can scan an ISBN barcode over HTTPS.
- Manual entry always remains available.
- The same barcode is not repeatedly added.
- Batch scanning supports a library haul efficiently.
- Existing books are recognized.
- Previously recommended books connect to recommendation attribution.
- Owned and borrowed books can be distinguished.

### Human review checklist

- Scan five books.
- Batch scan ten books.
- Scan the same book repeatedly.
- Scan an owned book.
- Scan a borrowed book.
- Scan a previously recommended book.
- Judge whether scanning is faster than manual search.

### Mandatory stop

**Stop after real-device scanning is demonstrated. Do not proceed to deployment hardening until approved.**

---

## Checkpoint 10 — PWA, Windows setup, and deployment

### Objective

Make the product easy to run locally and easy to test on a phone.

### Codex tasks

1. Add PWA manifest and installability.
2. Add production environment documentation.
3. Add:
   - Windows PowerShell setup script
   - Environment validation script
   - Database migration instructions
   - Seed instructions
4. Configure a hosted preview/production approach with HTTPS.
5. Prepare PostgreSQL migration configuration.
6. Add backup and restore documentation.
7. Validate production build and end-to-end tests.
8. Add optional Docker only if approved and genuinely useful.

### Acceptance criteria

- A Windows developer can set up the project from documented steps.
- Required environment variables are documented.
- The app can be installed as a PWA where supported.
- Phone-camera testing works over HTTPS.
- Production build passes.
- Database migrations are documented.
- No secrets are committed.

### Human review checklist

- Clone into a fresh Windows folder.
- Follow the setup instructions literally.
- Run all checks.
- Open hosted preview on a phone.
- Install the PWA.
- Test the full vertical flow.

### Mandatory stop

**Stop after deployment documentation and validation. Do not recruit external testers until approved.**

---

## Checkpoint 11 — Household alpha and correction pass

### Objective

Use real household behavior to correct the product before external testing.

### Required household test

1. Add at least 20 books.
2. Add at least five through manual ISBN.
3. Add at least five through scanning.
4. Mark a mixture of owned and borrowed books.
5. Record at least ten reading events.
6. Record several rereads.
7. Record at least two stopped or rejected books.
8. Generate multiple library bags.
9. Open recommendations in the JCL catalog.
10. Scan a previously recommended book.
11. Confirm recommendation attribution.
12. Generate another bag and confirm that results adapt.

### Codex tasks after human testing

Only after receiving human notes:

1. Categorize findings:
   - Blocking defects
   - Friction
   - Confusing language
   - Visual problems
   - Recommendation problems
   - Deferred ideas
2. Propose the smallest correction set.
3. Do not implement new feature categories.
4. Implement approved corrections.
5. Add regression tests.

### Exit criteria

- Logging feels fast.
- Scanning is reliable enough to prefer over typing.
- Duplicate handling works.
- Recommendation explanations use real signals.
- JCL wording is honest.
- At least two of five recommendations usually feel useful.
- The product is ready for five local families.

### Mandatory stop

**Stop and request approval before planning an external beta.**

---

# 13. Standard checkpoint report format

At the end of every checkpoint, use this exact structure:

```md
## Checkpoint [number] report

### Status
Complete / Partially complete / Blocked

### What changed
- ...

### Files added
- ...

### Files modified
- ...

### Commands run
- `...` — passed/failed

### Tests
- ...

### Decisions made
- ...

### Deviations from the plan
- None / ...

### Known limitations
- ...

### Risks
- ...

### Human review steps
1. ...
2. ...

### Decisions needed from you
1. ...

### Approval gate
I have stopped. Approve this checkpoint or request changes.
```

---

# 14. Definition of done for every implementation checkpoint

A checkpoint is not complete merely because the happy path appears on screen.

It is complete only when:

- Acceptance criteria are satisfied.
- Lint passes.
- Type checking passes.
- Relevant unit tests pass.
- Relevant integration tests pass.
- Relevant end-to-end tests pass.
- Production build passes.
- Errors are understandable.
- Empty and loading states exist.
- Documentation is updated.
- No secrets are committed.
- No unsupported library capability is implied.
- No unverified AI-generated facts are persisted as authoritative metadata.
- The checkpoint report is provided.
- Work has stopped for human approval.

---

# 15. Initial repository documentation to create

During the approved checkpoints, maintain:

```text
AGENTS.md
README.md
docs/
├── product/
│   ├── overview.md
│   ├── v0.1-scope.md
│   ├── success-metrics.md
│   └── vocabulary.md
├── architecture/
│   ├── system-overview.md
│   ├── data-model.md
│   ├── metadata-providers.md
│   ├── library-adapters.md
│   ├── ai-boundaries.md
│   └── decisions/
├── design/
│   ├── principles.md
│   ├── screen-inventory.md
│   └── accessibility.md
├── stories/
└── testing/
    ├── strategy.md
    └── household-alpha.md
```

Documentation should describe the implemented system, not an aspirational system that does not exist.

---

# 16. Suggested initial issue sequence

Create or track work in this order:

1. `FOUND-001` — Repository foundation and CI
2. `DATA-001` — Core domain schema and seed data
3. `BOOK-001` — ISBN validation and metadata lookup
4. `BOOK-002` — Add a book to the family shelf
5. `SHELF-001` — View and filter the family shelf
6. `READ-001` — Record reading events
7. `REACT-001` — Record separate reactions
8. `DESIGN-001` — Establish the visual system
9. `LIB-001` — Generic library adapter
10. `LIB-002` — Johnson County catalog handoff
11. `REC-001` — Deterministic candidate scoring
12. `BAG-001` — Persisted library bag
13. `AI-001` — Controlled recommendation explanations
14. `SCAN-001` — Single ISBN camera scan
15. `SCAN-002` — Batch scan
16. `ATTR-001` — Recommendation-to-scan attribution
17. `PWA-001` — Installable PWA
18. `DEPLOY-001` — Windows and hosted deployment
19. `E2E-001` — Complete critical-path test suite
20. `ALPHA-001` — Household alpha correction pass

Do not create all implementations in parallel. Respect checkpoint dependencies.

---

# 17. First prompt to run in Codex

Use the following prompt after adding this file to the repository:

```text
Read CODEX_BUILD_PLAN.md in full.

Begin Checkpoint 0 only: audit the repository and propose the initial
architecture and implementation sequence.

Do not modify application code, install dependencies, scaffold the app,
or begin Checkpoint 1.

Use the required checkpoint report format and stop for my approval.
```

---

# 18. Human product-owner rules

The human should approve checkpoints based on observable product behavior, not merely code volume.

At each gate, ask:

1. Does this solve the intended user problem?
2. Is the behavior truthful?
3. Is the interaction simpler than the alternative?
4. Is the code structure understandable?
5. Did the agent introduce scope that was not requested?
6. Can the next checkpoint build on this without rework?
7. Would I personally use the completed workflow?

When uncertain, request a smaller correction before continuing.

---

# 19. Product vision beyond V0.1

Do not implement these yet, but preserve a path toward:

- Multiple children
- Multiple caregivers
- Shared family accounts
- Multiple library systems
- Approved availability and hold integrations
- Taste evolution over time
- Context-aware recommendations
- Child-facing cover selection
- Family reading memories
- Printable lists for grandparents
- Anonymized collaborative recommendation signals
- Librarian-curated collections
- Import/export tools

The long-term product vision is:

> Every family has a personal librarian that grows up with the child.
