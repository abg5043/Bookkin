# ADR 0004: Source-preserving corrections

## Status

Accepted by the owner in the Checkpoint 5B phase-one decision on 2026-08-15. Implementation remains bounded by the checkpoint plan and its separate UI gate.

## Context

Reading events, reactions, preference observations, and interest phases influence history, counts, recommendation evidence, and explanations. Editing or deleting an incorrect fact in place would erase provenance and could leave derived views disagreeing about which fact is valid. A legitimate end to an interest is normal history and must remain distinct from correcting an erroneous declaration.

## Proposed decision

- Keep source records immutable after creation.
- Correct each supported record family through its own foreign-keyed amendment table.
- An amendment is either `retract`, with no replacement, or `replace`, with one new compatible record.
- Enforce one outgoing amendment per target, one incoming link per replacement, same-household ownership, compatible identity, and idempotency.
- Resolve only the valid leaf of a chain into current timelines, reread counts, request snapshots, recommendation inputs, explanations, and attribution.
- Treat cycles, missing links, cross-household links, and multiple leaves as integrity failures.
- Reactions record household, subject, value, declaration time, reporter, source type/version, persistence time, and idempotency provenance. When replacing a reading event, account for every currently valid reaction atomically: carry it forward as a distinct provenance-preserving replacement, replace it with newly declared values, or retract it. Reactions never change parent identity or disappear by omission.
- Record a legitimate interest ending in a one-to-one `InterestPhaseEnd`; use correction lineage only when the phase or end was recorded incorrectly.
- Keep privacy deletion separate. Household deletion cascades through source and correction records.

## Consequences

The model retains truthful provenance and supports immediate Undo as retraction. Queries and tests must consistently use valid-chain resolvers, and migration SQL must include constraints the ORM schema cannot express. This adds records and query discipline but avoids silent history rewrites.
