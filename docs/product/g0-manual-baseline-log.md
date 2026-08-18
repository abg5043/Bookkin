# G0 — manual baseline log

**Start today. No code required. This blocks G4, G5, and G6.**

The project's central claim is that Bookkin beats picking books yourself. That comparison has never been measured, so every later gate is currently unscoreable. This log is the denominator for all of them.

Keep it anywhere — this file, a notes app, a spreadsheet. The format below exists so it can be imported later without retyping.

## What to log

Every book **you** choose by your own methods — award lists, authors you know, the bookstore, browsing, a friend's suggestion. Not books Bookkin recommends; those come later and are measured separately.

Target: **20 books with real outcomes.** At a few books a week that is a couple of months, which is why starting now matters more than starting tidily.

## Rules that keep the number honest

- Log the pick when you pick it, and the outcome when it happens. Reconstructing from memory later produces a flattering number.
- **A reread is the strongest positive signal available**, and it costs nothing to record.
- **No reread is neutral, not negative.** The loan ended, you chose something else, other books were around. Absence of a reread is missing evidence, not evidence of failure.
- Record child reaction and your own separately when they differ. "She loved it, I hated reading it" is real and useful.
- Uncertain memory stays uncertain. Leave the reaction blank rather than guessing.

## Format

| Date | Title | How you found it | Read? | Her reaction | Your reaction | Reread? | Notes |
|---|---|---|---|---|---|---|---|
| | | award / author / bookstore / browsing / other | yes / started-stopped / no | loved / liked / not for us / unknown | fine / dislike reading it / unknown | yes / no | |

Copy-paste row:

```
| 2026-08-17 | Example Title | bookstore | yes | loved | fine | yes | asked for it twice |
```

## What gets computed from this

```
MANUAL_DELIGHT_RATE = (books that earned "loved" OR a reread) / (books brought home)
MANUAL_REREAD_RATE  = (books reread) / (books brought home)
```

**The denominator is books brought home, not books read, and this matters more than it looks.** The engine's delight rate in `CODEX_BUILD_PLAN.md` section 6.4.1 divides by books brought home, so a book carried home and never opened counts against it. If this log divided by books read instead, the same outcome would simply vanish from your side of the comparison — your misses would be discarded while the engine's identical misses were counted. The engine would then read several points low against a baseline that quietly forgave itself, and the gate that reads low is the one routing to P6, abandoning the engine entirely. Both sides count a book nobody opened as a failure, because "you made me carry home a book nobody wanted to read" is a real failure.

For the same reason, log books you brought home and never read. A blank `Read?` row is data, not a gap.

These become the comparator for every engine gate. A delight rate below yours means the engine is worse than you are, and the plan's response to that is a named pivot rather than more tuning.

## Also worth capturing, and easy to forget

- **Books you considered and rejected before reading.** "Picked it up, put it back" is a real signal about what fails at a glance, and no data source carries it.
- **Roughly how long finding each book took.** If Bookkin ends up matching your hit rate at a fraction of the effort, that is a legitimate win — but only if the effort baseline exists.

## When this data moves into the app

Not yet. The hosted preview is synthetic-data-only by policy and its unlock endpoint is not rate-limited, so real family reading history does not belong there today. Once the one-tap logging path and the rate limiting ship, this log imports as `read_prior` familiarity plus explicit reactions, with uncertain entries staying uncertain.
