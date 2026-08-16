# Bookkin Software Development Document and Agentic Build Plan

Status: canonical planning document; Checkpoint 5B delivered; Checkpoint 6 in progress

Last revised: 2026-08-15

The human product owner approved this SDD on 2026-08-14, approved and delivered Checkpoints 4R and 5A, and approved and delivered Checkpoint 5B on 2026-08-15. The owner explicitly authorized Checkpoint 6 to begin after the Checkpoint 5B commit and push. This does not authorize deployment, hosted resources, later-checkpoint implementation, or public actions.

## 1. Purpose

This document is the canonical software development document (SDD) and execution plan for Bookkin. It is written for human owners, lead coding agents, specialist agents, and independent reviewers.

The plan has two separate state machines:

- Technical state: proposed, in progress, implemented, verified, or blocked.
- Authorization state: awaiting human review, changes requested, or explicitly approved.

Technical completion never implies authorization. A reviewer PASS, passing tests, CI success, agent consensus, or lead-agent confidence cannot approve a checkpoint.

## 2. Product definition

Bookkin is a private family preference engine that helps caregivers choose better books for public-library trips.

It is not primarily:

- A reading tracker.
- A personal catalog.
- A social reading product.
- A library-account client.
- An engagement, reward, or streak system.
- An AI-generated book universe.

The V0.1 promise is:

> Give Bookkin a small amount of truthful family context, receive a verified library bag in under approximately ten minutes, check candidates in the official library catalog, and record what happened so later bags improve.

The initial target is a caregiver reading picture books or early readers with one child approximately ages 2-8 and visiting a public library at least monthly.

### 2.1 Primary loop

1. Collect the minimum truthful family context.
2. Source and normalize verified candidate works.
3. Rank and compose candidates deterministically.
4. Present a small evidence-based recommendation bag.
5. Hand the caregiver to the official library catalog.
6. Learn from explicit saves, recommendation-level `Not for us` actions, scans, borrowing confirmations, reading events including `Decided not to read`, separate reactions, and rereads.

First value must not require shelf construction, five logged books, a library branch, camera permission, a reaction, or a prior reading event.

### 2.2 Cold-start contract

The minimum context for a first recommendation request is:

> A coarse age or reading-stage band and either one declared current interest or one verified reference work.

A nickname is optional. Exact birthdate, child photo, school, address, voice, and location history are not requested.

The verified reference may be either an explicitly retained durable `PreferenceObservation` (for example, "A book that worked for us") or a request-scoped `RecommendationRequestReference` (for example, "More like this"). The user chooses the meaning; neither path creates implicit shelf, history, event, reaction, status, or borrowing facts.

### 2.3 Product invariants

- Metadata, candidates, ranking inputs, history, and library capabilities are verified or explicitly user-declared.
- Missing metadata remains missing; the system never fills gaps by invention.
- Child evidence, caregiver evidence, and family-level references remain distinguishable.
- A family-level reference is never translated into "both liked it."
- The subject of an observation and the person who reported it are separate fields.
- Reactions are optional and separate from reading events.
- Reading events and reactions are never preselected.
- Reread counts derive only from currently valid reading events.
- AI cannot create candidates, metadata, rankings, facts, availability, history, or preference evidence.
- The official library catalog is the only V0.1 source for availability.
- Bookkin does not request or store library credentials, card numbers, or PINs.
- Private household data is not publicly exposed or intentionally cached for offline reload.
- Human approval is required at every checkpoint.

## 3. Experience direction: bounded Bright Snap

Bright Snap is the visual language for Bookkin. It combines child-friendly energy with parent-facing polish and restraint.

Required characteristics:

- Yellow, ink, white, and restrained supporting accents.
- Focus, lens, crop, flash, or capture motifs used as identity cues.
- Energetic capture, confirmation, and recommendation-reveal moments.
- Calmer shelf, history, profile, quick-log, modal, and bedtime surfaces.
- Sentence-case consumer copy except for short intentional display labels.
- Clear hierarchy, generous whitespace, refined typography, and polished transitions.
- Large imagery where it supports recognition, with density controls for large collections.
- Fast search and filtering wherever collection size can grow.
- One persistent, elegant thumb-reachable action control for Add book and Log a read on mobile.
- Add and Log workflows open in focused modal or sheet experiences and do not require page scrolling to start.
- Contextual Back returns to the immediate entry surface. Book history opened from Shelf returns to the same Shelf state; book history opened from household History returns to that History list. Restore scroll and focus to the triggering book. Browser Back follows the same stack and restoration rule. The persistent History navigation is the direct route to household History, so do not add a redundant "All history" action.
- No unexplained numerical markers inside the product UI.

Accessibility and sensory constraints:

- WCAG 2.2 AA contrast target.
- Visible keyboard focus and logical focus return.
- Semantic names, descriptions, and live status announcements.
- 44 x 44 CSS pixels minimum touch target; 48 x 48 preferred for primary and reaction controls.
- No color-only meaning.
- Reduced-motion support.
- No automatic pulsing, orbiting, confetti, audio, vibration, or flashing.
- Lower visual energy and luminance on repetitive and bedtime-oriented surfaces.
- No horizontal scroll at a 320 CSS-pixel viewport and no clipped content or focus at 400 percent zoom.

### 3.1 Required design review for user-facing checkpoints

Before implementation, the lead presents an interactive, marked-up HTML prototype using realistic non-sensitive fixtures. It includes representative phone, tablet, and desktop compositions, state controls, and selectable comments in a separate review panel.

The product frame must use polished end-user language throughout. Prototype labels, sample-data notices, implementation explanations, reviewer guidance, and placeholder narration belong only in the separate design-comments area and must never appear as product copy.

Until the owner selects a final system, every user-facing design review develops these two directions in parallel against the same content, states, and interactions:

- **Original Bright Snap:** the high-contrast graphic camera language established in `bookkin-concept-bright-snap.html` - yellow, ink, white, cyan, rose, geometric display type, crisp borders, and restrained offset shadows.
- **Refined Brighter:** the default review direction - the same bright Snap identity with editorial warmth, luminous cool neutrals, softer geometry, and parent-facing restraint. Do not regress to beige, brown, or a lower-energy default.

A designer may propose a third direction only when it tests a genuinely distinct product hypothesis; it must not blur or replace the two required comparison tracks.

Owner corrections made during design review are durable product decisions, not conversational memory. In the same review cycle, the lead records each accepted correction in this SDD or the owning document under `docs/design/`, keeps the interactive review aligned, and reports the changed decision record. Future agents must read those files instead of relying on chat history.

The prototype is a decision artifact, not implementation permission. After implementation, the working screen is reviewed at phone and desktop widths, and the interactive review is updated to reflect the implementation. Keyboard flow, focus, contrast, error recovery, loading, empty, limited, and offline states are checked before the checkpoint report.

### 3.2 Required architecture and data-design review

Every owner-facing decision that materially changes system architecture, data ownership, persistence, provider boundaries, deployment topology, or schema must include diagrams in both the owning proposal/ADR and the checkpoint presentation:

- A current-versus-proposed architecture or data-flow diagram.
- An entity-relationship, lifecycle, or sequence diagram when records or state transitions are involved.
- Labels for current, proposed, and deferred elements, plus household ownership, private-data, trust, and external-system boundaries.
- A short legend and decision callouts so the owner can recommend changes without reconstructing relationships from prose.

Keep diagrams bounded and readable rather than exhaustive. Diagrams are decision artifacts and do not grant implementation authority.

## 4. V0.1 scope

V0.1 ends only after Checkpoint 11 is explicitly approved.

Required:

- One protected household and one child profile.
- Protected responsive mobile web over HTTPS.
- PostgreSQL-backed hosted persistence after Checkpoint 5B approval.
- Optional nickname and coarse age or reading-stage band.
- Editable current interests with retained historical phases.
- Durable, source-attributed preference observations created only after explicit input.
- Request-scoped recommendation references without shelf or history side effects.
- Verified ISBN, title, author, camera, and batch discovery.
- Shelf records created only after explicit user action.
- Truthful owned, borrowed, or wishlist status where applicable.
- Append-only reading events and amendment or retraction corrections.
- Optional separate child and caregiver reactions.
- Derived reread counts from valid events.
- Verified candidate sourcing and provenance.
- Deterministic scoring, composition, and explanations.
- Normal bags of 3-5 works, limited results of 1-2 works, and zero-result recovery.
- Official Johnson County Library catalog search.
- Bounded Bright Snap visual language.
- Honest loading, empty, limited-evidence, limited-pool, no-result, provider-error, duplicate, permission, external-handoff, and offline states.
- Alpha-safe backup, restore, rollback, monitoring, deletion, export, and measurement.
- Explicit human approval after every checkpoint.

Deferred:

- Required LLM or AI behavior.
- PWA installability, service worker, and offline product promise.
- Private-response caching, queued writes, or synchronization.
- Preferred library branch.
- Real-time availability, holds, library login, current loans, or borrowing-history import.
- Multiple children, identified caregivers, or household invitations before controlled beta.
- Public child profiles or child accounts.
- Social graphs, feeds, sharing, popularity, streaks, or disappearing records.
- Public registration. Neither Checkpoint 12A nor 12B authorizes it; it requires a separately specified future checkpoint.
- Public acquisition work before explicit owner authorization to begin Checkpoint 12B, and publication before final Checkpoint 12B approval.
- Billing, paywalls, advertisements, sponsorships, affiliates, or sponsored ranking.
- Child-data monetization.
- Native applications, microservices, and large-scale recommendation infrastructure.

## 5. Domain contracts frozen at Checkpoint 5B

These semantics and their phase-one tables, constraints, indexes, lifecycle, and migration boundaries were approved at the Checkpoint 5B schema gate on 2026-08-15. Later-checkpoint deferrals remain in force.

### 5.1 PreferenceObservation

When a user explicitly selects "A book that has worked for us," Bookkin may create a durable, source-attributed `PreferenceObservation` recorded at declaration time.

It must:

- Link to a verified `BookWork`.
- Record declaration time and provenance.
- Keep reading time unknown unless a separate truthful reading event exists.
- Store observation subject separately from reporter.
- Allow `child`, `caregiver`, or `family_reference` as explicit subjects.
- Default a child-subject observation to caregiver-reported unless an approved interaction supports direct child selection.
- Treat `family_reference` as a distinct, weaker signal.

It must not implicitly create:

- A `ReadingEvent`.
- A `Reaction`.
- A `FamilyBook`.
- A shelf status.
- A finish or reread.
- A borrowing fact.

An incorrect observation is corrected through source-preserving retract or replace semantics. A retracted observation is excluded immediately from taste evidence, scoring, explanations, and attribution. Privacy deletion remains a separate operation.

### 5.2 RecommendationRequestReference

When a verified work is used only for "More like this," it is stored as a `RecommendationRequestReference` on the request or result.

It does not become durable taste evidence and does not create shelf, history, reaction, or preference records. Retaining it later as a preference is a separate confirmed action.

### 5.3 Reading corrections

Reading events remain append-only. "Correct entry" creates an amendment chain:

- `retract`: the original remains auditable but is excluded from current timelines, reread counts, taste inputs, and recommendation attribution.
- `replace`: retracts the original and links a new valid event.
- Corrected reactions attach to the replacement event.
- Derived views use the latest valid chain.
- Ordinary correction does not silently mutate or delete the original record.
- Household deletion remains a separate privacy operation that removes household-owned records.

Consumer wording distinguishes:

- "Stopped reading": reading began but did not finish.
- "Decided not to read": the household made an explicit reading decision, recorded as the internal `rejected` `ReadingEvent`.
- "Not for us": the family does not currently want the book recommended, recorded as a recommendation-level `RecommendationAction`.

Optional reasons are controlled and skippable.

### 5.4 Authoritative event taxonomy

- `ReadingEvent` records a reading-session outcome or explicit reading decision: `finished`, `reread`, `stopped`, or internal `rejected` shown to consumers as "Decided not to read."
- `RecommendationAction` records an explicit recommendation interaction: save, `Not for us`, catalog open, replacement request, or an attribution link.
- Borrowed and returned are explicit shelf-relationship transitions; they are not reading events.
- Child-selected and caregiver-selected are explicit selection provenance on the relevant action or encounter; they are not reading events.
- A recommendation may be attributed to a later finish or reread by linking to a valid `ReadingEvent`. The attribution does not replace or duplicate that event.
- Only valid `ReadingEvent` chains contribute to reading history and reread counts.

Reactions and interest phases also use source-preserving correction. A corrected reaction or interest is superseded or retracted, excluded immediately from current taste and scoring, and retained only as auditable history until household privacy deletion.

## 6. Recommendation contract

### 6.1 Result types

- `normal`: 3-5 verified eligible works; target 5.
- `limited_verified_pool`: 1-2 verified eligible works.
- `no_eligible_candidates`: 0 works.

The system never pads a result with an unverified, duplicate, excluded, or weakly eligible work. Limited evidence and limited candidate coverage are separate states.

Each returned work retains:

- Provider provenance.
- Eligibility evidence.
- Available and missing metadata.
- Deterministic score and source signals.
- Scoring and composition versions.
- Composition role.
- Deterministic explanation.
- Deduplication and exclusion behavior.

### 6.2 Deterministic baseline

V0.1 ranking, composition, and explanations are deterministic and inspectable. Fixed inputs and versions produce repeatable ranks and explanations. Missing attributes behave neutrally. Provider failure cannot introduce fabricated fallback books.

A local LLM is deferred. It may later be evaluated only behind `AIProvider` after a separate human privacy, cost, latency, and operational gate. It may reword approved explanation clauses using verified structured facts. It cannot change candidate inclusion, score, rank, composition, or facts. Deterministic wording remains available and LLM failure cannot block a bag.

## 7. Library contract

V0.1 library behavior is deliberately narrow:

- A generic capability-declaring `LibraryAdapter`.
- Johnson County Library official catalog-search URL construction.
- Tested ISBN and title fallback behavior.
- Honest external-handoff wording.
- Preferred library system stored only when first needed.

Approved wording includes:

- "Check in library catalog."
- "Open Johnson County Library catalog."
- "Availability is checked in the library catalog."
- "Mark as borrowed" only after explicit user action.

Forbidden claims include:

- "Available now."
- "Place hold" inside Bookkin.
- "Your checkouts."
- Borrowed status inferred from a catalog open or scan.

Preferred branch, branch filtering, availability, holds, loans, history import, library authentication, and credentials remain deferred.

## 8. Privacy, security, and operations

- Household scope is enforced in application use cases and request boundaries.
- Private responses use appropriate `Cache-Control: no-store` behavior.
- No service worker caches private routes or API responses.
- Offline warning appears before a private-data input workflow begins.
- Offline mutations are disabled in V0.1.
- Camera frames and images are not persisted or uploaded for ISBN scanning.
- Metadata-provider queries may include only minimized ISBN, title, or author search terms required by the approved discovery workflow. They do not include household identifiers, child names, interests, reactions, history, notes, credentials, or unrelated free text.
- Analytics rejects child names, interest text, titles, ISBNs, notes, credentials, raw provider payloads, and other content-bearing private data.
- Secrets do not enter source, logs, artifacts, screenshots, or reports.
- Household deletion, export, backup, restore, and recovery are documented and tested.
- Cross-household isolation is mandatory before external beta.

PostgreSQL 18 is the owner-approved canonical local and CI database as of the Checkpoint 5B phase-one decision on 2026-08-15. The approved Docker Compose Windows workflow, fresh provider-specific baseline, backup/reseed disposition, rollback plan, and CI integration are in bounded phase-two implementation. Hosted vendor selection and provisioning remain separately gated by Checkpoint 8A.

## 9. Measurement and growth

Synthetic-parent review produced hypotheses and test budgets, not research evidence. Only observed household behavior counts as alpha evidence.

Provisional effort budgets:

- First normal bag from an empty household: under approximately ten minutes.
- One ordinary quick log: approximately fifteen seconds or less.
- Four successive bedtime logs with recent books and "Log a different book or outcome": approximately one minute.
- Explicit reread from a recent book: one action followed by confirmation and Undo.

Required result metrics:

- Normal Bag Rate: normal results divided by all completed recommendation requests.
- Limited Pool Rate: 1-2-work results divided by all completed recommendation requests.
- No Candidate Rate: zero-work results divided by all completed recommendation requests.

Normal Bag Rate, Limited Pool Rate, and No Candidate Rate use the same denominator: all completed recommendation requests. Limited-pool results are excluded only from a separately named Useful Bag Rate among mature normal bags. Their frequency remains visible, and individual outcomes from limited-pool recommendations remain in per-recommendation quality metrics. Candidate count alone never defines usefulness.

Core activation is a household generating a normal bag and opening at least one official catalog result. Limited activation is reported separately.

The provisional north-star hypothesis is the share of verified recommendations that are pursued, explicitly obtained, read, and positively received. Checkpoint 10A must approve the exact outcome conditions, maturity window, reaction subject, and denominator before implementation. Caregiver reaction quality remains separate.

Growth remains free through controlled beta. Bookkin has no ads, affiliates, sponsored placement, commercial ranking influence, or child-data monetization. Monetization begins only as research at Checkpoint 13 after traction, privacy, reliability, support, and cost evidence.

### 9.1 Family experience research cadence

Major end-to-end experience reviews include a family perspective without turning every checkpoint into participant research:

- Checkpoints 8 and 9 use a structured multi-agent preflight with product design, product management, human factors, accessibility, and contrasting synthetic caregiver/child-context personas. These findings are hypotheses and never count as user evidence.
- Checkpoint 11 uses observed end-to-end behavior from the owner household across realistic library-trip and bedtime cycles. It produces corrections and a research protocol but is not generalized beyond that household.
- Checkpoint 12A is the first external family-usability cohort. Within the five invited households, target at least three separately moderated caregiver-child dyad sessions covering onboarding, recommendation choice, catalog handoff, and later outcome logging, plus longitudinal follow-up across real use. A parent may describe or observe a young child's reaction; the child is never required to identify themselves to Bookkin.
- Before Checkpoint 12C expands beyond five households, synthesize the dyad sessions, observed product behavior, support burden, accessibility findings, and recommendation outcomes. Expansion pauses when recurring comprehension, trust, effort, privacy, or safety failures remain unresolved.
- Parent-only group discussion may supplement Checkpoint 12B positioning and invitation-language review, but it does not replace task observation and cannot validate recommendation quality.

Individual caregiver-child sessions are preferred over placing children together in a conventional focus group, reducing peer influence and protecting privacy. Before any external recruitment, contact, incentive, recording, or child participation, the checkpoint's phase-one gate presents exact participants or criteria, consent and age-appropriate assent, caregiver presence, tasks, data collected, recording behavior, retention/deletion, compensation, moderator, and stop conditions for owner approval. No school, exact birthdate, child photo, location history, or unnecessary child identifier is collected.

## 10. Architecture

Bookkin remains a modular monolith unless demonstrated evidence and a separate human decision justify another architecture.

Required boundaries:

- Core product and domain logic.
- Application use cases.
- Book metadata providers.
- Library-system adapters.
- AI providers.
- Web and presentation components.

Provider responses are normalized and validated before entering domain persistence or user-facing components. UI components do not call external providers directly. Domain logic does not depend on framework request objects or provider payload shapes.

## 11. Agentic execution protocol

### 11.1 Lead authority

The lead agent owns:

- Checkpoint authorization state.
- Scope and dependency interpretation.
- Human approval evidence.
- Context packets and specialist assignments.
- The single-writer ledger.
- Shared-contract integration.
- Complete validation.
- Documentation synchronization.
- The evidence-backed checkpoint report.
- Enforcement of the mandatory stop.

The lead never treats agent consensus or reviewer PASS as human approval.

### 11.2 Single-writer ledger

One named writer at a time owns each of:

- `AGENTS.md` and `CODEX_BUILD_PLAN.md`.
- Prisma schema and migration history.
- Shared domain and provider contracts.
- Package manifest and lockfile.
- Global design tokens, root layout, and navigation shell.
- Analytics event dictionary.
- Environment, deployment, and CI configuration.

Parallel work is allowed only across disjoint paths after shared contracts are frozen.

### 11.3 Specialist context packet

Every writing specialist reads the complete governing instructions and receives:

- Current checkpoint and approval evidence.
- Included and forbidden scope.
- Allowed and forbidden paths.
- Frozen contracts and relevant ADRs.
- Approved design artifact.
- Verified fixtures and provenance.
- Required acceptance evidence.
- Permitted commands.
- Explicit prohibition on future-checkpoint, destructive, credentialed, billable, public, or external actions.

### 11.4 Handoff and independent verification

Every specialist supplies:

- Acceptance-criteria mapping.
- Files changed and diff scope.
- Commands and results.
- Fixture and data provenance.
- Accessibility, privacy, security, or provider evidence appropriate to the role.
- Contract and migration implications.
- Known limitations and unresolved decisions.
- Confirmation that later features and prohibited actions were not performed.

An independent reviewer who did not implement the material scope verifies it read-only. The lead resolves findings, integrates the work, and runs the complete relevant validation suite.

After two bounded failures with the same cause, the work is handed back as blocked. Agents may not widen scope, add dependencies, disable tests, invent facts, or perform a broad rewrite as recovery.

### 11.5 Mandatory human gate

Every checkpoint ends in this order:

1. Specialist work and self-check.
2. Independent verification by an agent who did not implement the material work.
3. Lead integration, full relevant validation, and checkpoint report.
4. Human product-owner inspection and guidance.
5. Any requested in-scope refinement and affected reverification.
6. Explicit human approval.
7. Scoped checkpoint commit and push to the approved GitHub remote and branch.
8. Only then may the next checkpoint begin.

Specialist completion, independent-review PASS, tests, CI, agent consensus, and lead technical completion do not approve a checkpoint. The lead must present evidence, stop all current and next-checkpoint work, receive the human product owner's review and guidance, rework and reverify requested current-checkpoint changes, and obtain explicit human approval before beginning, delegating, scaffolding, or researching implementation for the next checkpoint.

Git commit and push do not substitute for approval. Before approval, the report shows repository status, intended commit scope, and unrelated dirty files. After approval, the delivery record includes commit hash, branch, remote, push result, and CI result. Unrelated changes and secrets are never included. If remote CI or deployment is itself acceptance evidence, a checkpoint phase-one gate must authorize the exact branch, commit scope, remote, cost, and action before any push; this limited execution authorization does not approve the checkpoint or authorize later work.

## 12. Required checkpoint report format

Every checkpoint report uses this structure:

```text
# Checkpoint <number> report - <name>

Status: AWAITING HUMAN REVIEW | CHANGES REQUESTED | APPROVED | BLOCKED
Technical state: PROPOSED | IN PROGRESS | IMPLEMENTED | VERIFIED
Authorization state: AWAITING HUMAN REVIEW | CHANGES REQUESTED | APPROVED

## Outcome
## Scope completed
## Specialist work and handoffs
## Files changed
## Acceptance-criteria evidence
## Validation commands and results
## Interactive design review (when user-facing)
## Independent-review findings and disposition
## Product truth, privacy, security, and accessibility checks
## Risks, limitations, and deferred work
## Owner decisions required
## Repository and proposed commit scope
## Mandatory human approval state

No next-checkpoint work has begun or been delegated.
Explicit human approval is required before the checkpoint commit/push and before any next-checkpoint work.
```

After approval and delivery, append:

```text
## Approved delivery record
Human approval: <reference>
Commit: <hash>
Branch: <branch>
Remote: <remote>
Push: <result>
CI: <result or not applicable>
```

## 13. Historical checkpoint state

Checkpoints 0-5 were completed and approved in prior owner reviews. Checkpoint 5 consolidated the approved shelf, discovery, history, and quick-log surfaces with the current editorial design system; it did not implement the later Bright Snap shell. The implemented baseline remains subject to regression review and may be refined only within a later approved checkpoint. Much of that approved baseline is not yet tracked in Git, so the already authorized Checkpoint 4R must reconcile and deliver it before Checkpoint 5A begins.

Checkpoint 5A was approved and delivered on 2026-08-15. The Checkpoint 5B phase-one proposal was approved on 2026-08-15, and its bounded phase-two implementation is in progress under the current owner-decision section. Final Checkpoint 5B approval is still required before commit/push or Checkpoint 6.

## 14. Remaining checkpoint sequence

### Checkpoint 4R - Approved-baseline Git reconciliation

Goal: create an auditable Git and GitHub baseline for the already approved Checkpoints 0-5 and the owner-approved SDD before any Checkpoint 5A work. The `4R` label is retained because the owner explicitly authorized that checkpoint name before the historical inventory confirmed Checkpoint 5's approved design-system consolidation.

Included:

- Inventory tracked, modified, and untracked files.
- Map application, tests, schema, migrations, configuration, and documentation to approved Checkpoints 0-5.
- Identify generated output, local environment files, secrets, private fixtures, and unrelated work for exclusion.
- Verify `.gitignore`, repository identity, branch, and `origin` without changing the remote.
- Run the complete baseline validation supported by the existing repository.
- Present the exact proposed baseline and SDD commit scopes to the owner.
- After explicit approval, create deliberate scoped commit or commits on the approved branch and push to `https://github.com/abg5043/Bookkin.git`.
- Record hashes, branch, remote, push results, and CI results.

Excluded:

- Application changes, dependency installation, schema changes, migrations, refactors, new features, deployment, and Checkpoint 5A work.
- Committing `.env`, secrets, private data, generated build output, test reports, or unrelated files.

Acceptance evidence: complete file inventory; provenance to approved checkpoints; diff review; secret and generated-file audit; existing lint, type, test, and build results where runnable without new installation; clean post-delivery status except explicitly documented unrelated files.

Specialists: lead repository integrator; independent engineering and secret-scope reviewers.

Owner decisions: exact files and commit boundaries, target branch, and authorization to push.

Mandatory human stop: no inventory, validation, reviewer PASS, or prior checkpoint approval authorizes a commit or push. The lead presents the exact baseline scope, receives owner inspection and guidance, reverifies changes, and requires explicit approval before committing or pushing. After delivery, the owner receives the hashes and CI result. Checkpoint 5A does not begin until this gate is complete.

### Checkpoint 5A - Bounded Bright Snap shell and fast capture

Goal: apply the approved visual language to existing workflows and make Add and Log actions fast on phone without implementing later product capabilities.

Included:

- Approved Bright Snap tokens and primitives.
- Responsive phone, tablet, and desktop shell.
- Persistent elegant action control that fans out to Add book and Log a read.
- Modal or sheet entry that never requires scrolling to initiate on phone.
- Recent books and shelf search in Quick Log.
- "Log another" after save.
- One-tap reread event selection inside Quick Log, followed by the ordinary explicit Save action. Do not expose correction-backed Undo yet.
- No preselected event or reaction.
- Optional separate child and caregiver reactions.
- Search and filtering patterns for growing collections.
- Offline detection before Add or Log entry.
- Interactive pre-implementation and post-implementation design reviews.

Excluded:

- Working camera scan.
- Recommendations or a working Next Picks destination.
- Library adapter or catalog handoff.
- Profile or onboarding expansion.
- PWA or service worker.
- New dependencies unless separately justified and approved within the checkpoint.

Acceptance evidence:

- Phone, tablet, and desktop review with realistic fixtures.
- Keyboard-complete Add and Log paths.
- Primary phone actions are reachable without unnecessary scrolling.
- No event, reaction, book, or status is preselected.
- Contrast, focus, reduced motion, errors, and offline entry prevention pass review.
- Ordinary quick log and repeated bedtime-log budgets are measured as hypotheses.

Specialists: product/design implementer; human-factors and accessibility reviewer; independent engineering verifier.

Owner decisions: final Bright Snap balance, action-control interaction, copy vocabulary, and sensory restraint.

Mandatory human stop: specialist completion, independent PASS, tests, CI, agent consensus, and lead completion do not approve Checkpoint 5A. The lead presents the interactive result and evidence, stops, receives owner guidance, reverifies requested refinements, and waits for explicit approval before commit/push and before Checkpoint 5B work.

#### Approved delivery record

Human approval: owner approved Checkpoint 5A delivery and continuation to Checkpoint 5B on 2026-08-15.

Commit: `519efdc`

Branch: `codex/checkpoint-5a-bright-snap`

Remote: `origin` (`https://github.com/abg5043/Bookkin.git`)

Push: succeeded to `origin/codex/checkpoint-5a-bright-snap`

CI: no remote workflow reported; local lint, typecheck, production build, 22 unit tests, and 13 browser acceptance tests passed.

### Checkpoint 5B - Recommendation readiness, data integrity, and PostgreSQL gate

Goal: freeze the contracts and remove only blocking data-integrity debt required for recommendations.

Phase one is proposal only. Present:

- `PreferenceObservation` contract.
- `RecommendationRequestReference` contract.
- Subject and reporter provenance rules.
- Interest-history contract.
- Reading amendment and retraction ADR.
- Candidate, score, composition, explanation, and typed bag-result contracts.
- Proposed PostgreSQL canonical architecture.
- Windows-local PostgreSQL alternatives.
- Current SQLite data disposition.
- Proposed schema, migration, rollback, and CI plan.
- Bounded blocking-debt inventory with explicit exclusions.
- Single-writer ownership for schema and migration history.

No schema edit, database migration, dependency installation, implementation, or scaffolding occurs before the phase-one human decision.

After phase-one approval, included implementation is limited to:

- Approved PostgreSQL transition.
- Approved schema and migrations.
- Preference-observation and request-reference use cases.
- Source-preserving correction and retraction use cases for reading events, reactions, preference observations, and interest phases.
- Narrow Quick Log integration for immediate reread save, confirmation, and correction-backed Undo, with an updated interactive review.
- Household-scoping invariants.
- Typed `normal`, `limited_verified_pool`, and `no_eligible_candidates` result contract.
- Domain and integration tests.

Excluded:

- Profile UI.
- Candidate-provider implementation.
- Scoring and composition.
- Recommendation UI.
- Library UI.
- AI implementation.
- General repository cleanup.
- User-interface work other than the narrow correction and reread-Undo integration explicitly included above.

Acceptance evidence:

- Approved schema and database decision record.
- Tests proving reference selection has no implicit shelf, history, reaction, event, or status side effects.
- Tests proving correction chains affect derived counts and evidence correctly.
- Tests proving retracted or superseded observations, reactions, and interests are immediately excluded from taste, scoring inputs, and explanations.
- Household-scope and idempotency tests.
- Migration, rollback, and PostgreSQL CI evidence.

Specialists: domain/data single writer; staff-engineering, privacy, and migration reviewers.

Owner decisions: exact contracts and schema; PostgreSQL approval; Windows-local method; current SQLite disposition; bounded debt list.

Mandatory human stop: phase one stops for explicit owner approval before any implementation. After approved implementation and independent verification, Checkpoint 5B stops again for owner review, refinements, and explicit approval before commit/push and before Checkpoint 6 work.

#### Approved delivery record

Human approval: owner approved final Checkpoint 5B, its family-usability research cadence, the two proposed commits, push, and the start of Checkpoint 6 on 2026-08-15.

Commits: `12adc7e` (`feat(data): establish PostgreSQL recommendation-readiness baseline`) and `6b26255` (`feat(quick-log): add correction-backed one-tap reread`)

Branch: `codex/checkpoint-5b-postgresql`

Remote: `origin` (`https://github.com/abg5043/Bookkin.git`)

Push: succeeded to `origin/codex/checkpoint-5b-postgresql`

CI: not triggered by the branch push; the workflow runs on pull requests and pushes to `main`. Local lint, typecheck, production build, 31 unit tests, 14 browser acceptance tests, 6 PostgreSQL integrity tests, and backup/restore rehearsal passed.

### Checkpoint 6 - Narrow library adapter

Goal: provide an honest official-catalog handoff without claiming library-account integration.

Included:

- Generic `LibraryAdapter` and capability contract.
- Johnson County Library official search URLs.
- ISBN and title fallback tests.
- Unsupported-capability tests.
- External-handoff copy review.
- Preferred library system only when needed for the handoff.

Excluded: branch UI, availability, holds, credentials, loans, history, recommendation UI, analytics, and a dormant settings destination.

Acceptance evidence: normalized inputs, deterministic URL construction, official-link verification, fallback and unsupported-state tests, and product-truth copy review.

Specialists: provider integration implementer; product-truth and security reviewers.

Owner decisions: selected library-system behavior, URL construction, and handoff wording.

Mandatory human stop: all agent and test PASS states remain technical only. The lead presents the working handoff and evidence, stops for owner guidance and refinement, and requires explicit approval before commit/push and Checkpoint 7A.

### Checkpoint 7A - Family context, preference evidence, and verified candidates

Goal: collect minimal recommendation context and build a verified candidate pool without ranking or showing a bag.

Included:

- Coarse age or reading stage.
- Editable current interests and retained historical phases.
- Durable preference observations.
- Request-scoped reference behavior.
- Deterministic "What Bookkin is learning" view.
- Verified candidate sourcing, hydration, normalization, provenance, coverage, deduplication, and exclusions.
- Development-only candidate coverage and insufficiency previews. These are not final typed bag results.

Excluded: scoring, composition, user-facing bags, AI, and library availability.

Acceptance evidence: cold-start context can be completed without shelf construction; all candidate facts retain provenance; missing fields remain missing; observations retain subject and reporter; references have no implicit side effects.

Specialists: product/domain and provider implementers; privacy and product-truth reviewers.

Owner decisions: candidate coverage threshold and any fallback metadata provider.

Mandatory human stop: agent consensus cannot authorize scoring work. The lead presents evidence and the interactive user-facing review, resolves owner guidance, and waits for explicit approval before commit/push and Checkpoint 7B.

### Checkpoint 7B - Deterministic scoring, composition, and explanations

Goal: produce inspectable recommendation results from fixed verified fixtures without exposing them as a product workflow.

Included:

- Versioned deterministic scoring.
- Separate child, caregiver, family-reference, current-interest, historical-interest, reread, stopped-reading, `Decided not to read` reading-decision, `Not for us` recommendation-action, and request-context signals.
- Neutral missing-metadata behavior.
- Explicit suppression and exclusion rules.
- Target-five composition and typed limited results.
- Deterministic explanation payload.
- Representative fixed fixtures.
- Independent recommendation-quality verification.

Excluded: user-facing bag, LLM implementation, library availability, and endless-feed behavior.

Acceptance evidence: fixed inputs are repeatable; weights and source signals are inspectable; no unverified work or padded result can enter a bag; limited-pool and no-candidate cases are tested; explanations cite only verified or declared evidence.

Specialists: recommendation implementer; independent scoring/test and product-truth reviewers.

Owner decisions: scoring weights, suppression policy, composition behavior, and fixture plausibility.

Mandatory human stop: recommendation-test PASS does not approve product behavior. The lead presents fixtures, rankings, explanations, and edge cases, applies owner guidance, and requires explicit approval before commit/push and Checkpoint 8.

### Checkpoint 8 - First useful bag and catalog handoff

Goal: deliver the outcome-first recommendation workflow.

Included:

- Minimum cold-start context enforcement.
- No mandatory bag-setup form or shelf construction.
- Persisted normal and limited-pool results.
- Deterministic explanations and material uncertainty.
- Save, "Not for us," optional controlled reason, and replace.
- Library selection at first catalog action.
- Official Johnson County catalog handoff.
- Honest availability wording.
- Action attribution.
- Under-approximately-ten-minute first-bag usability budget.

Excluded: LLM, availability, holds, infinite feeds, gamified replacement, public access, and camera scanning.

Acceptance evidence: realistic empty-household flow; normal, limited, and zero states; at least two plausibly useful candidates in reviewed normal bags; truthful catalog handoff; keyboard, focus, contrast, recovery, and phone reachability review; structured family-perspective agent preflight with hypotheses clearly separated from evidence.

Specialists: product/UI and domain implementers; recommendation, human-factors, accessibility, and product-truth reviewers.

Owner decisions: whether the bag and deterministic explanations are plausibly worth pursuing.

Mandatory human stop: the lead presents the interactive implementation and recommendation evidence, stops for owner inspection and guidance, reverifies refinements, and requires explicit approval before commit/push and Checkpoint 8A.

### Checkpoint 8A - Protected hosted responsive web

Goal: make the approved application safely usable on a phone outside the development machine.

Phase one is an infrastructure decision and authority gate. Before account creation, billable use, remote push for deployment, secret handling, database provisioning, or deployment, present the exact vendor options, owners, costs, branch and commit scope, protection model, migration plan, rollback plan, and teardown path. Obtain explicit human authorization for the selected actions. This is checkpoint-internal execution authority, not final Checkpoint 8A approval.

Included:

- Protected HTTPS hosting.
- Managed PostgreSQL.
- Safe migration and production bootstrap.
- No development-family seed data.
- Household and API protection.
- Persistence across deployments.
- Preliminary backup, restore, rollback, logs, and service ownership.

Excluded: public access, unrestricted registration, PWA requirement, offline cache, custom domain, and DNS unless separately approved as operationally necessary.

Acceptance evidence: deployment runbook; account and cost ownership; protected phone access; persistence and recovery test; no-store behavior; secret and log review; rollback evidence.

Specialists: deployment/operations implementer; security and privacy reviewers.

Owner decisions: hosting and database vendors, accounts, expected costs, and protection configuration.

Mandatory human stop: phase one stops before any external or billable action. After authorized execution, no deployment success or security PASS approves expansion. The lead presents the hosted result and operating implications, stops for owner guidance, reverifies requested changes, and requires final explicit approval before the delivery record and Checkpoint 9.

### Checkpoint 9 - Camera, batch capture, and attribution

Goal: reduce cataloging and outcome-entry effort without inventing facts.

Included:

- Just-in-time camera permission, denial, and fallback.
- Single ISBN scan.
- Batch scanning.
- Batch classification selected once and reviewed before persistence.
- Duplicate and partial-error recovery.
- Manual ISBN fallback.
- Recommendation recognition and attribution.
- Online requirement shown before scanning.

Excluded: frame upload or persistence; inferred borrowing, finish, reaction, reread, or library availability.

Acceptance evidence: representative device review; permission and denial recovery; duplicate and mixed-success batches; review before save; manual fallback; camera privacy verification.

Specialists: camera integration implementer; privacy, accessibility, device, and product-truth reviewers.

Owner decisions: final batch-review behavior and acceptable device support.

Mandatory human stop: device-test PASS does not authorize operational hardening. The lead presents the interactive scan paths and privacy evidence, incorporates owner guidance, and waits for explicit approval before commit/push and Checkpoint 10.

### Checkpoint 10 - Alpha operational hardening

Goal: make setup, deployment, recovery, and maintenance reproducible for household alpha.

Included:

- Reproducible Windows setup.
- Environment validation.
- PostgreSQL migration and bootstrap instructions.
- Backup and restore drill.
- Rollback rehearsal.
- Health, runtime, build, and migration logs.
- Monitoring and incident ownership.
- Data deletion, recovery, and export boundaries.
- Secret ownership and rotation.
- Fresh-environment rehearsal.

Excluded from Checkpoint 10 and V0.1: PWA installability, service worker, offline data, custom domain, DNS, and public launch. Each requires a separately approved future checkpoint. An inert manifest may be considered only after privacy review and cannot imply unsupported capabilities.

Acceptance evidence: a fresh operator can follow the runbook; recovery and rollback are demonstrated; ownership and costs are explicit; no secret or private content appears in logs.

Specialists: operations implementer; security, privacy, and independent runbook reviewers.

Owner decisions: operational owners, retention, recovery expectations, and any optional domain work.

Mandatory human stop: operational readiness remains subject to owner inspection. The lead presents drill evidence and unresolved burden, completes requested refinements, and requires explicit approval before commit/push and Checkpoint 10A.

### Checkpoint 10A - Privacy-conscious measurement and alpha readiness

Goal: measure product outcomes and reliability without collecting private content.

Included:

- Domain-derived activation and outcome queries.
- Strict non-domain event allowlist.
- First-bag and quick-log timing.
- Normal-bag, limited-pool, and no-candidate rates.
- Catalog, provider, scan, and camera reliability.
- Sensitive-property rejection.
- Analytics-disabled behavior.
- Retention, deletion, export, and opt-out documentation.

Excluded: raw titles, ISBNs, child names, interest text, free text, credentials, provider payloads, public marketing analytics, and third-party analytics without separate approval.

Acceptance evidence: every event and property reviewed; sensitive payload tests; disabled-mode test; metric denominator audit; retention and deletion behavior.

Specialists: measurement/domain implementer; privacy and analytics-payload reviewers.

Owner decisions: every event, property, retention rule, deletion path, and any third-party provider.

Mandatory human stop: measurement implementation and payload-test PASS do not authorize household use. The lead presents the exact dictionary and privacy evidence, applies owner guidance, and requires explicit approval before commit/push and Checkpoint 11.

### Checkpoint 11 - Household alpha and correction pass

Goal: validate the complete loop with real household behavior before any external beta.

Run at least two realistic library-trip cycles from a truly empty household before loading a large shelf.

Validate:

- Minimum-context cold start.
- First normal bag under approximately ten minutes.
- Limited-evidence and limited-pool recovery.
- At least two plausible recommendations in reviewed normal bags.
- Catalog handoff and books brought home.
- Reading events and separate reactions.
- Four successive bedtime logs in approximately one minute.
- Recent-book, "Log a different book or outcome," and one-tap reread behavior.
- Three-way comprehension of "Stopped reading," "Decided not to read," and recommendation-level "Not for us."
- Event correction and retraction.
- Editable interest phases.
- Batch scanning and attribution.
- Offline warning and recovery.
- Recommendation adaptation without erased history.
- Deletion, export, backup, restore, and rollback.

Synthetic-parent findings remain hypotheses and task budgets. Only observed household behavior is alpha evidence, and one household is not generalized to the whole ages 2-8 market.

Specialists: human household participant and lead triage; independent regression, privacy, and human-factors reviewers.

Owner decisions: alpha correction set and readiness for a controlled five-family beta.

Mandatory human stop: Checkpoint 11 is the V0.1 gate. The lead presents observed evidence and the correction pass, stops for owner inspection and guidance, and requires explicit approval before commit/push. No beta identity, invitation, or public work begins without separate Checkpoint 12A authorization.

### Checkpoint 12A - Secure controlled free beta

Goal: support a small invited beta with application-level identity and household isolation.

Phase one is an identity, participant, and external-action gate. Present provider options, accounts, costs, secrets, alpha-data migration, support ownership, exact proposed families, invitation wording, and who will send each invitation. Obtain explicit human authorization before provider creation, billable use, data migration, or contact. Invitations remain human-owned unless the owner explicitly delegates the exact recipients and wording. This execution authority is not final Checkpoint 12A approval.

Included:

- Authentication and authorization.
- Household membership and isolation.
- Recovery, logout, member removal, export, and deletion.
- Alpha-to-beta migration decision.
- Support and incident process.
- Five invited households.
- At least three separately moderated caregiver-child end-to-end usability sessions when participation and consent permit.
- Longitudinal follow-up across recommendation choice, library pursuit, reading outcome, correction, and later adaptation.
- Free access.

Excluded: unrestricted public registration, public child data, billing, public acquisition site, and marketing expansion. Public registration requires a separately specified future checkpoint and is authorized by neither 12A nor 12B.

Acceptance evidence: cross-household isolation; recovery and deletion; support ownership; no alpha data leakage; explicit invited-family list and rollout plan; owner-approved family-research protocol; moderated-session synthesis with child participation kept minimal and private; disposition of recurring comprehension, trust, effort, accessibility, and recommendation-quality findings.

Specialists: authentication/domain implementer; security and privacy isolation reviewers.

Owner decisions: authentication provider, exact invited families, support owner, and alpha-data migration.

Mandatory human stop: phase one stops before provider creation, migration, or contact. After authorized execution, security PASS and successful invitations do not approve the checkpoint or public acquisition. The lead presents beta evidence and support burden, resolves owner guidance, reverifies affected work, and requires final explicit approval before delivery and before optional Checkpoint 12B or 12C work.

### Checkpoint 12B - Optional public acquisition foundation

Goal: decide whether evidence supports a truthful public information and waitlist surface.

This checkpoint is optional and requires explicit owner authorization to begin after Checkpoint 12A. That start authorization permits only the approved implementation scope; it is not final approval to commit, push, deploy, or publish. Checkpoint 12C controlled expansion does not depend on performing 12B.

Potential included scope:

- Fixture-only public site.
- Accurate positioning and approved screenshots.
- Privacy explanation.
- Waitlist or invitation CTA.
- Privacy-safe acquisition-source attribution.
- Separation of public analytics and private product data.
- A truthful acquisition foundation for later owner-gated expansion; this checkpoint does not itself authorize new households.

Excluded: private household content, public product navigation, unsupported claims, unrestricted registration, billing, ads, affiliates, sponsored ranking, or child-data monetization.

Acceptance evidence: claim audit; fixture audit; public/private boundary test; privacy and accessibility review; acquisition measurement allowlist.

Specialists: product/marketing implementer; privacy, accessibility, and claim-verification reviewers.

Owner decisions: whether a public surface is warranted and the exact expansion gate.

Mandatory human stop: a publishable site is not permission to publish. The lead presents the complete artifact and evidence, stops for owner guidance, reverifies requested changes, and requires explicit approval before commit, push, deployment, or publication. Checkpoint 12C remains separately gated.

### Checkpoint 12C - Controlled beta expansion

Goal: expand only after the five-family beta demonstrates value, privacy, reliability, and manageable support. This checkpoint requires Checkpoint 12A approval but may proceed whether or not optional Checkpoint 12B is performed.

Phase one presents observed 12A evidence, support capacity, operating cost, privacy incidents, reliability, proposed participants and sourcing, exact invitation ownership, and rollback or enrollment-pause criteria.

Stage one may expand to at most 25 households after explicit owner approval. It then stops for observed evidence and another explicit owner gate. Stage two may expand to at most 100 households only after that second approval.

Included: controlled invitations, household-isolation monitoring, support and incident handling, approved aggregate outcome measurement, enrollment pause, and deletion/export support.

Excluded: unrestricted registration, public child data, billing, advertising, sponsored ranking, child-data monetization, and automatic expansion.

Acceptance evidence: activation and recommendation-outcome cohorts, Normal/Limited/No-candidate rates, retention, support burden, cost, privacy and security results, incident response, and deletion/export reliability.

Specialists: product operations and identity implementers; security, privacy, measurement, and support reviewers.

Owner decisions: each participant ceiling, participant sourcing, invitation execution, budget, support capacity, and whether to pause, continue, or stop.

Mandatory human stop: neither metrics nor agent consensus authorizes enrollment. The lead stops before 25-household execution and again before 100-household execution, receives owner guidance, reverifies requested changes, and requires explicit authority for exact invitations and costs. Final Checkpoint 12C approval and Git delivery are required before Checkpoint 13 research.

### Checkpoint 13 - Post-traction monetization research

Goal: determine whether retained families have a specific unmet job worth funding.

Research requires final Checkpoint 12C approval and evidence from the owner-gated expansion to at most 100 households. Prerequisites reviewed by the owner include recommendation coverage and outcomes, repeat library-trip use, household effort and abandonment, support burden, privacy, reliability, and operating cost.

Phase one is a research and contact gate. Before contacting any participant, offering an incentive, recording a session, or collecting research data, present participant criteria or exact contacts, outreach wording, consent, incentive and cost, privacy protections, recording behavior, retention and deletion, analysis ownership, and who will conduct contact. Obtain explicit human authorization for the exact activity. Contact remains human-owned unless specifically delegated.

Included:

- Retained-user interviews and research synthesis.
- Multiple-child or caregiver-coordination hypotheses.
- Optional supporter-model research.
- Long-term institutional hypotheses subject to privacy review.

Excluded: billing, payment data, paywalls, ads, affiliates, sponsorships, commercial rank influence, recommendation degradation, or child-data monetization.

Checkpoint 13 authorizes research only. Any pricing, billing, or commercial implementation requires a new explicitly specified checkpoint.

Specialists: product and economic researcher; privacy reviewer; staff-engineering cost reviewer.

Owner decisions: whether observed traction justifies research and whether any later commercial checkpoint should be proposed.

Mandatory human stop: phase one stops before any participant contact, incentive, recording, or data collection. After authorized research, consensus cannot authorize monetization. The lead presents evidence and tradeoffs, stops for owner judgment, reverifies requested research corrections, and requires final explicit approval before the scoped research commit and push. No billing or commercial implementation occurs without a new explicit plan and approval.

## 15. Provisional growth gates

Before Checkpoint 12A:

- First normal bag completed without developer intervention.
- At least two realistic household trip cycles.
- At least two plausible recommendations in most reviewed normal bags.
- Successful catalog, obtainment, read, and reaction attribution.
- No material truth, privacy, security, or recovery failure.
- Owner judges a five-family beta supportable.

Before Checkpoint 12C stage-one expansion to at most 25 households, provisional targets are:

- At least 4 of 5 households reach core activation without live setup assistance.
- At least 3 of 5 create a second bag within 45 days.
- At least 80 percent of completed requests produce normal bags.
- No severity-one privacy, security, cross-household, or invented-fact incident.
- Support burden is manageable by a named owner.

Checkpoint 12C must collect a fresh evidence set and stop again before expansion to at most 100 households. Optional public acquisition work in Checkpoint 12B is neither required nor sufficient for either enrollment decision.

Before Checkpoint 13 research, provisional targets are:

- At least 100 core-activated households across two cohorts.
- At least 60 percent core activation from started onboarding.
- At least 80 percent Normal Bag Rate.
- At least 40 percent second-bag completion within 45 days.
- At least 40 percent Useful Bag Rate among mature normal bags.
- Stable truth, privacy, reliability, and support guardrails.
- Retained-user evidence of a specific unmet job.

These thresholds are planning hypotheses. The owner may revise them at a checkpoint gate based on observed evidence.

## 16. Current owner decision

The owner approved and delivered Checkpoint 5B on 2026-08-15 and explicitly authorized Checkpoint 6 to begin after its Git delivery:

- Checkpoint 6 is limited to the generic `LibraryAdapter` capability contract, Johnson County Library official catalog-search URL construction, normalized ISBN and title fallback behavior, unsupported-capability handling, tests, diagrams, and product-truth/security review.
- Do not add branch UI, real-time availability, holds, credentials, loans, borrowing-history imports, recommendation UI, analytics, a dormant settings destination, or later-checkpoint behavior.
- Do not deploy, provision hosted resources, contact external participants, stage, commit, push, or begin Checkpoint 7A before the final Checkpoint 6 owner review and explicit approval.
