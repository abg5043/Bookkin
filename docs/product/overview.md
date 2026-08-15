# Product overview

Bookkin is a private family preference engine for a caregiver reading with a child approximately ages 2-8.

The core promise is: **Share a little truthful context, build a verified library bag, and learn from what actually happens.**

Bookkin is not primarily a reading tracker, personal catalog, social product, library-account client, or AI assistant. Its core loop is:

1. Collect a coarse age or reading stage and either one current interest or one verified reference work.
2. Source and normalize verified candidate works.
3. Rank and compose a small bag deterministically.
4. Explain each choice using verified or explicitly declared evidence.
5. Hand the caregiver to the official library catalog.
6. Record explicit recommendation outcomes, reading events, separate reactions, and rereads with minimal effort.
7. Use those outcomes to improve later bags while retaining lower-weight historical interest phases.

First value must not require shelf construction or five logged books. Shelf and reading history support the preference engine; they are not the primary product outcome.

The current application includes approved shelf discovery and an append-only reading log. Later workflows remain governed by `CODEX_BUILD_PLAN.md` and require their own human approval gates.

The remaining plan adds the bounded Bright Snap responsive shell, a recommendation-readiness and PostgreSQL decision gate, a conservative library handoff, time-aware preference evidence, verified candidate sourcing, deterministic scoring and explanations, a 3-5-work library bag, scanning, a protected hosted preview, deployment and recovery runbooks, and privacy-conscious household-alpha measurement. Only after household alpha may Bookkin add application authentication and a controlled free beta. A public acquisition surface is optional after that beta gate, and monetization remains research-only until traction supports another explicit decision.
