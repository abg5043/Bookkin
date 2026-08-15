# Household alpha test plan

This is a future Checkpoint 11 plan. Current implementation does not yet provide the complete recommendation, scanning, hosted, and measurement loop.

Start with a truly empty household before loading a large shelf. Run at least two realistic public-library-trip cycles.

Validate:

- Cold start using coarse age or reading stage plus one current interest.
- Cold start using an explicitly retained durable `PreferenceObservation` without implicit shelf or history.
- Cold start using a request-scoped `RecommendationRequestReference` without durable preference or shelf side effects.
- A first normal bag in under approximately ten minutes without developer intervention.
- Normal, limited-evidence, limited-pool, and zero-candidate recovery.
- At least two plausible recommendations in reviewed normal bags.
- Honest official-catalog handoff and later explicit obtainment.
- Reading events and separate optional reactions.
- Four successive recent-book bedtime logs in approximately one minute.
- `Log another` with no carried-forward event or reaction.
- One-action reread followed by confirmation and Undo.
- Three-way comprehension of `Stopped reading`, `Decided not to read`, and recommendation-level `Not for us`.
- Reading-event retract and replace corrections.
- Current and historical interest editing.
- Single and batch scanning, one-time batch classification, duplicates, and partial failures.
- Recommendation attribution without inferred borrowing, finish, reaction, or reread.
- Offline warning before entry and safe recovery.
- Recommendation adaptation without erased history.
- Deletion, export, backup, restore, rollback, and operator recovery.

Before using real family data, Checkpoint 8A must provide protected HTTPS hosting and managed PostgreSQL. Checkpoint 10 must rehearse setup, migration, bootstrap, backup, restore, rollback, monitoring, deletion, and recovery. Checkpoint 10A must approve every measurement event and confirm prohibited child and book data cannot enter analytics.

Synthetic-parent findings and time targets are hypotheses and test budgets, not evidence. Only observed household behavior counts, and one household is not generalized to the full ages 2-8 market.

Passing technical alpha checks does not authorize beta work. The lead presents the complete Checkpoint 11 report, the human product owner inspects it and directs any correction pass, affected work is reverified, and explicit approval is required before the scoped commit and GitHub push. Checkpoint 12A identity and the five-household controlled beta remain separately gated. Checkpoint 12B public acquisition is optional. Checkpoint 12C independently gates expansion to 25 and then 100 households.
