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
- Give each specialist a bounded context packet containing the checkpoint, approval evidence, included and forbidden scope, allowed and forbidden paths, frozen contracts, verified fixtures, required evidence, and authority limits.
- Require an independent read-only review by an agent who did not implement the material work, then have the lead integrate and run the complete relevant validation.
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

The revised SDD was approved on 2026-08-14, Checkpoint 4R was approved and delivered, and Checkpoint 5A implementation was authorized on 2026-08-15 after its interactive design gate. Checkpoint 5A is technically verified and awaiting the mandatory human checkpoint review. Do not stage, commit, push, deploy, or begin Checkpoint 5B until the human product owner explicitly approves the Checkpoint 5A delivery scope.
