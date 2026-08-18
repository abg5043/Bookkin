# Bookkin agent instructions

## Scope control

- Read `CODEX_BUILD_PLAN.md` before changing files.
- Work on one checkpoint at a time.
- Keep technical state separate from authorization state. Specialist completion, reviewer PASS, tests, CI, agent consensus, and lead completion do not approve a checkpoint.
- At every checkpoint gate, present the evidence-backed checkpoint report, stop all current and next-checkpoint work, receive the human product owner's inspection and guidance, rework and reverify requested in-scope refinements, and obtain explicit human approval.
- Do not begin, delegate, scaffold, or research implementation for the next checkpoint before that approval.
- Do not add features from later checkpoints early.
- Keep the application a modular monolith unless a demonstrated need changes that decision.

## Agentic execution

- The lead agent owns checkpoint authorization, scope interpretation, shared-contract integration, final validation, and the human approval request.
- Use one named writer at a time for each shared SDD, schema and migration history, shared contract, package manifest and lockfile, global shell or token file, analytics dictionary, and deployment or CI configuration.
- Parallelize only disjoint paths after shared contracts are frozen.
- Practice token and compute frugality: default to direct lead execution over subagent delegation for single-file, single-decision, or quickly-verifiable work; reserve specialists and independent reviewers for genuinely large or disjoint scope; size each agent's model and effort to its task instead of defaulting to maximum capability; and never run more specialist or reviewer agents on one piece of material than the mandatory independent-review rule requires.
- Give each specialist a bounded context packet containing the checkpoint, approval evidence, included and forbidden scope, allowed and forbidden paths, frozen contracts, verified fixtures, required evidence, and authority limits.
- Require an independent read-only review by an agent who did not implement the material work, then have the lead integrate and run the complete relevant validation.
- Select reviewer personas by what the checkpoint actually changed, never as a fixed panel. Choose the minimum set whose lens genuinely applies — usually one or two, occasionally three for a checkpoint that is simultaneously schema-heavy, user-facing, and privacy-affecting. Running every persona on every checkpoint is waste, dilutes each review, and is explicitly forbidden. Reviewers are read-only, run on a mid-tier model rather than the lead's model, and receive a bounded context packet naming the exact files and the exact lens.

  | Persona | Lens | Select when the checkpoint changes |
  | --- | --- | --- |
  | Staff engineer, FAANG | Correctness, concurrency, data integrity, idempotency, ownership scoping | Schema, migrations, domain or application use cases, provider adapters, persistence, retries |
  | Product designer, major SaaS | Mockup fidelity, interaction design, accessibility, copy discipline, responsive behavior | Any caregiver-visible screen, flow, component, or stylesheet |
  | Product manager, consumer startup | Product truth, scope discipline against the approved checkpoint, vocabulary, user value | Scope, new user-visible capability, consumer copy, success metrics, result semantics |
  | Parent of a young child (target user) | Real-world usability under time pressure, emotional tone, trust, jargon detection | First-run setup, any flow a caregiver completes while distracted, any new consumer copy |
  | Child-privacy reviewer | Child-data minimization, outbound query contents, retention, consent, COPPA-shaped risk | Child data, external provider queries, logging, analytics, exports, retention |
  | Librarian or children's-literature specialist | Book metadata truth, age suitability claims, catalog and availability semantics | Recommendation quality, candidate sourcing rules, age guidance, library contract |
  | Infrastructure and reliability reviewer | Secrets, backups, rollback, teardown, cost ceilings, protected access | Deployment, hosting, provisioning, environment configuration, operational runbooks |
  | Venture investor or accelerator mentor | Unit economics, willingness to pay, monetization viability, scaling constraints, retention and growth mechanics, competitive positioning | Hosting tier and cost decisions, per-household cost baselines, enrollment and expansion gates, pricing or monetization research, success metrics that bear on viability |
  | Recommender-systems researcher or practitioner | Ranking quality, signal design and weighting, cold-start behavior, evaluation methodology, diversity and staleness, whether observed data volume can support a learned approach | Scoring, ranking, composition, candidate sourcing strategy, recommendation evaluation, or any proposal to add a learned or language-model component |
  | Marketing and brand strategist | Positioning against alternatives, differentiation clarity, naming, landing-page and acquisition copy, claim honesty, whether a stranger understands the product in one screen | Public-facing copy, landing or acquisition surfaces, product naming, positioning decisions, or any point where the product must explain itself to someone who has never seen it |
  | Synthetic caregiver panel | Reactions from several simulated caregivers in differing circumstances — a first-time parent, one with two children at different ages, one short on time, one skeptical of apps for children, one already using a library hold system | Early direction checks, first-run and onboarding flows, differentiation claims, and any moment where "are we building the right thing" should be asked before more is built |

  A checkpoint that adds a persona-relevant risk not covered above may propose one additional targeted persona, stated with its lens in the checkpoint report.

  **The synthetic caregiver panel produces hypotheses, never evidence.** It is a cheap way to surface obvious confusion, generate tough questions, and check direction before more is built. It is not user research and must never be reported as though real families said anything. Its output is always labeled synthetic, never counts toward any acceptance criterion requiring real family evidence, and never substitutes for the moderated caregiver-child sessions, household alpha, or beta research the checkpoints already require. A synthetic panel that appears to validate a direction has validated nothing; its value is the objections it raises, not the approval it gives. Treating simulated reactions as product-market evidence would be exactly the kind of fabrication section 2.3 forbids everywhere else.

  The recommender-systems reviewer evaluates whether the picks are actually good, not merely whether the code is correct, and is the right lens for the honest question of whether a signal set and data volume justify a learned approach. It advises inside the same fixed constraints: it may not introduce a ranking input that is unverified, fabricated, or unexplainable to a caregiver, and it may not weaken the inspectability that makes a wrong recommendation diagnosable. A recommendation to move from the deterministic baseline to a learned or language-model tier is routed through the Checkpoint 11A gate with its evidence, never applied directly.

  The venture reviewer advises strictly inside the product's fixed constraints and has no authority to relax them. Section 2.3 product-truth invariants, the child-privacy posture, and the section 9.2 prohibitions on advertising, affiliates, sponsored placement, commercial ranking influence, and child-data monetization are not tradeable for growth or revenue, and a recommendation to weaken any of them is rejected without escalation rather than presented to the owner as an option. Its value is pricing realism, cost-structure pressure-testing, and honest assessment of whether the product can sustain itself — not growth tactics that would compromise what families are being asked to trust.
- **No signal becomes an adapter until it has been hand-tested at roughly ten books.** Ten titles from a candidate source, judged against household taste; fewer than three plausible means the adapter is not built. Adapter maintenance is a permanent cost, and a signal that sounds principled but fails in practice is worse than none because it is invisible when wrong.
- **Stop and issue a field test rather than reasoning further.** Some questions cannot be answered from data the agent can reach, and guessing at them is how the adult-content defect in the topic dictionary happened. When a real-world check would settle a question in under an hour, the field test wins over further analysis. Present it in this form and then stop that thread, continuing unrelated work:

  ```text
  FIELD TEST REQUIRED — <id>
  Blocked on:   <what cannot proceed>
  Go do:        <specific physical action, under 30 minutes>
  Bring back:   <exact data needed, in the format needed>
  Then:         <what unblocks>
  ```

  Standing field tests carried from the recommendation-engine plan: read the catalog's real facet list off its own UI before writing facet-based retrieval; confirm the picture-book filter actually excludes chapter books, easy readers, and foreign editions; **physically pull the first generated bag off library shelves and judge the books in hand**, because cover art, trim size, page count, and text density decide read-aloud quality and appear in no data source; read them with the child before tuning any weight; eyeball competing bags side by side rather than deciding on recall numbers alone; and hand-check ten books from any new source before building its adapter.
- **When about to write a fourth consecutive planning document, stop and run the smallest experiment that would settle the disagreement instead.** This is a recorded failure mode of this project: six architecture documents preceded the first corpus pull, and in this repository the first coverage-matrix run took ninety seconds and immediately found a correctness defect that three documents of analysis had not.
- **Report against the section 6.4 metrics at the close of every phase, every gate, and any session that changes a metric.** Not what was built — where the project stands on whether the child enjoys the books. Separate work done from progress made: a session can complete real work without moving the delight rate, and saying so plainly is required. Never report engine internals such as candidate-pool size or index build time as progress; they are diagnostics. Report the metric when it is unflattering, especially when manual scanning is winning. Three consecutive sessions reporting that nothing moved the number means the work has drifted off the north star.
- Merge the checkpoint branch into `main` as soon as the owner approves the checkpoint and authorizes push. `main` is what any hosted environment deploys, so an approved-but-unmerged branch means the running application is not the approved one. Verify after merging that `main` actually contains the checkpoint's files rather than assuming the merge did what was intended.
- After two bounded failures with the same cause, return a blocked handoff. Do not widen scope, add dependencies, weaken tests, invent fixtures, or perform a broad rewrite as recovery.
- No agent may perform or authorize deployment, publication, account or resource creation, billable services, secrets access, external invitations, public registration, or monetization without an explicit human gate for the exact action. Invitations are human-owned external actions unless the owner separately delegates exact recipients and wording.

## Git delivery

- Before human approval, report repository status, intended checkpoint commit scope, and unrelated dirty files. Do not commit or push merely because technical checks pass.
- After explicit checkpoint approval, create a scoped checkpoint commit and push it to the approved GitHub remote and branch before beginning the next checkpoint. If remote CI or deployment is itself required to verify a checkpoint, obtain a checkpoint-internal human authorization for the exact branch, commit scope, remote, cost, and deployment action before pushing; that authorization is not final checkpoint approval.
- Record the commit hash, branch, remote, push result, and CI result in the approved delivery record.
- Never include unrelated changes, local secrets, private data, or generated noise in a checkpoint commit.

## Product truth

- Never invent ISBNs, authors, metadata, library availability, reading history, or library capabilities.
- Keep child data minimal and private.
- Do not request library credentials, card numbers, or PINs.
- Do not claim real-time availability, holds, checkout imports, or borrowing-history imports without an approved capability.

## Architecture boundaries

Keep separate boundaries for:

- Core product and domain logic
- Book metadata providers
- Library-system adapters
- AI providers

Provider responses must be normalized and validated before reaching user-facing components. AI may explain verified facts but is never the source of truth for metadata, availability, or history.

Recommendation ranking, composition, and V0.1 explanations are deterministic. Any future local LLM may only reword verified structured facts behind the AI-provider boundary after a separate human gate; it cannot create candidates, evidence, rankings, or facts. A hosted LLM requires a separate scope and child-privacy gate.

For every owner-facing architecture, persistence, provider, deployment, or material data-model decision, include a legible architecture/data-flow diagram and an entity-relationship or lifecycle diagram when applicable. Label current, proposed, and deferred elements; show ownership, trust, privacy, and external-system boundaries; record the diagrams in the owning proposal or ADR; and include them in the checkpoint presentation. A diagram is a decision aid, not implementation authorization.

## Design review

For every user-facing checkpoint:

1. Before implementation, provide an interactive, marked-up HTML prototype with realistic non-sensitive fixtures, representative phone/tablet/desktop compositions, state controls, and selectable design comments in a separate review panel. Do not place unexplained review numbers inside the proposed product interface.
2. Treat the prototype as a decision artifact, not permission to scaffold or implement the workflow.
3. Review the working screen at phone and desktop widths with realistic data and update or recreate the interactive review to reflect implementation.
4. Check keyboard flow, focus, contrast, and error recovery.
5. Make approved in-scope refinements and re-present the revised interactive review before requesting checkpoint approval.

Static screenshots or text wireframes may supplement the interactive prototype but do not replace it unless the human explicitly approves another format.

## Current access model

Household alpha uses platform-level hosting protection. Do not add public registration or application authentication unless the plan is updated and approved. Keep household ownership explicit so future authentication can be introduced at the application boundary.

V0.1 is protected responsive web over HTTPS. Do not add a service worker, offline writes, private-response caching, or an installability promise unless a later checkpoint explicitly approves them.

## Current authorization state

The revised SDD was approved on 2026-08-14, and Checkpoints 4R and 5A were approved and delivered. The Checkpoint 5B phase-one proposal was approved on 2026-08-15, and bounded phase-two implementation is authorized. Follow its single-writer and exclusion rules. Stop at the separate Quick Log interactive design gate before UI implementation. Do not stage, commit, push, deploy, provision hosted resources, begin Checkpoint 6, or add later-checkpoint scope before final Checkpoint 5B approval.
