# Testing strategy

Tests protect product truth, household privacy, deterministic behavior, correction semantics, and fast accessible interaction. Each checkpoint adds only the evidence required for its approved scope.

## Layers

- Unit tests cover pure domain rules, validators, result types, scoring versions, composition, corrections, and sensitive-property rejection.
- Integration tests cover household-scoped use cases, Prisma persistence, provider normalization, migrations, idempotency, and external-adapter contracts using verified fixtures.
- Playwright covers approved user workflows, including keyboard behavior, focus return, loading, empty, limited, error, permission, duplicate, external-handoff, and offline-warning states.
- Provider tests use fixtures and contract checks instead of depending on live external services.
- Recommendation tests use fixed verified inputs and assert repeatable eligibility, ranking, composition, explanations, and no-padding behavior.
- CI runs install, lint, type checking, unit and integration tests, and production build. Hosted and migration checks are added only at their approved checkpoints.

No test may invent an ISBN, author, metadata fact, library capability, reading history, or recommendation outcome. Missing fixture fields remain missing.

## Interaction requirements

- No reading event, reaction, book, or shelf status is preselected.
- Reactions remain optional and separate.
- Quick Log begins from recent books or explicit shelf search.
- `Log another` clears event and reaction choices.
- In Checkpoint 5A, reread is selected in one action and then uses the ordinary explicit Save and confirmation path. Correction-backed immediate save and Undo become required only after the Checkpoint 5B correction contract is approved and implemented.
- Offline state is detected before entering a private-data mutation flow; offline mutations are disabled.

The provisional budgets are approximately fifteen seconds for one ordinary quick log and approximately one minute for four successive bedtime logs. These are synthetic-review hypotheses until measured with real household behavior.

## Required independent verification

An agent who did not implement the material work reviews acceptance evidence read-only. The lead integrates findings and runs the complete relevant suite. Passing tests and reviewer PASS establish technical readiness only; they never approve a checkpoint or authorize the next one.
