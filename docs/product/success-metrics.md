# Success metrics

**Delight rate, defined in `CODEX_BUILD_PLAN.md` section 6.4.1, is the project's primary metric and the authoritative answer to the north-star question every checkpoint report must address.** It supersedes the provisional hypothesis below as the operating measure, and is active from G0 onward rather than waiting for Checkpoint 10A. The measures in this document remain valid and are reported alongside it: they describe product health — activation, coverage, reliability, correction success — where delight rate describes whether the recommendations are any good. Where the two appear to disagree, delight rate governs the north-star question and this document governs everything else. Checkpoint 10A confirms the exact outcome conditions, maturity window, reaction subject, and denominator for both.

The earlier provisional north-star hypothesis, retained for continuity, was the percentage of verified recommendations that are pursued through the official catalog, explicitly obtained, read, and positively received. Checkpoint 10A must approve its exact outcome conditions, maturity window, reaction subject, and denominator. Longer term, rereads are a stronger signal than passive app usage.

Core activation means that a household:

- Provides a coarse age or reading-stage band plus either one current interest or one verified reference work.
- Generates a normal 3-5-work library bag.
- Opens at least one official library catalog result.

Receiving a 1-2-work limited verified pool and opening a catalog result is limited activation, reported separately from core activation.

Report Normal Bag Rate, Limited Pool Rate, and No Candidate Rate over the same denominator: all completed recommendation requests. Limited-pool results are excluded only from a separately named Useful Bag Rate among mature normal bags; their frequency and individual recommendation outcomes remain visible. Candidate count alone does not establish usefulness.

Useful quality measures include first-bag time, quick-log time, successful scan rate, duplicate rate, recommendation save and catalog-open rates, explicit obtainment, finish, positive reaction, reread, stopped-reading rate, `Decided not to read` reading-decision rate, `Not for us` recommendation-action rate, replacement, provider reliability, and correction success.

Recommendation quality distinguishes current-interest match, lower-weight historical interests, child evidence, caregiver evidence, family references, rereads, stopped-reading outcomes, `Decided not to read` decisions, `Not for us` recommendation actions and their controlled reasons, missing metadata, and candidate coverage.

Durable domain records are the source of truth for activation and recommendation outcomes. Product analytics are limited to allowlisted, non-content funnel and reliability signals. The application must work when analytics is disabled.

Analytics payloads must not contain child names, interest text, book titles, ISBNs, free text, notes, library credentials, or raw provider data. Retention, export, deletion, opt-out, and provider ownership require explicit review before household alpha.

If a public acquisition surface is later approved, measure acquisition separately from private product outcomes. Public analytics must not create a path into household reading data.

First-bag and logging targets from synthetic review are test budgets, not evidence. Only observed household behavior can satisfy alpha acceptance.

Do not optimize for time spent in the app.
