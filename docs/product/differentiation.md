# Differentiation: why Bookkin is not Goodreads

Prompted by real feedback during the Checkpoint 7P preview: a first-time viewer said it "looks like Goodreads." That reading is currently accurate, and treating it as a compliment would be a mistake.

## Why the comparison is correct today

Every feature shipped so far — a shelf, a search-and-add flow, a reading log — is a **tracking** surface. The differentiator, recommendations, arrives at Checkpoints 7B and 8. A fresh viewer can only judge what exists, and what exists today is a catalog with a log attached.

This is a sequencing artifact, not a design failure. But it becomes a real problem if it survives Checkpoint 8, and it is a useful deadline: **when the first bag ships, the Goodreads read must stop being accurate.**

## The job is genuinely different

| | Goodreads | Bookkin |
| --- | --- | --- |
| Who the books are for | Yourself | A specific child, roughly ages 2–8 |
| When it is used | After reading, to record and discuss | Before reading, to decide what is next |
| What you leave with | A catalog entry and opinions | A small decided set and a library plan |
| Social model | Public reviews, ratings, friends | Private by construction |
| Money model | Buy the book | Borrow it from your library |
| Scale of answer | Millions of titles, endless browsing | Three to five books, chosen |

Goodreads answers *"what have I read, and what do people think of it."* Bookkin answers *"it is bedtime, we just finished that one, what do I read to my four-year-old next, and can I pick it up Saturday."*

Those are different products that happen to both contain book records.

## Feature differentiators already committed in the plan

These are not aspirations; each is already scoped and gated:

1. **The subject is a child, not the user.** Age range, reading relationships, and interests describe a kid. Goodreads has no concept of reading *to* someone.
2. **The output is a decision, not a catalog.** A bag of three to five, deliberately small. Endless feeds are explicitly forbidden.
3. **It ends at the library, not a purchase.** The catalog handoff is the intended exit, and Bookkin never claims real-time availability.
4. **Private by construction.** No public profiles, reviews, ratings, friends, leaderboards, or streaks — all explicitly excluded in `v0.1-scope.md`.
5. **It records what reading to a small child is actually like.** Stopped reads, rereads, "decided not to read," and separate child and caregiver reactions. A tracker records completion; Bookkin records what happened.
6. **It never fabricates.** Every book is a verified record, missing data stays visibly missing, and no recommendation is invented.

## Positioning

**Bookkin is a librarian, not a catalog.** A good children's librarian asks a couple of questions about your kid, hands you a small stack, and tells you why. They do not hand you a search box.

Useful framings:

- Not "track what you have read" but "know what to read next."
- Not "for readers" but "for the grown-up doing the reading."
- Not "discover more books" but "decide tonight's book."

Anti-positioning worth stating plainly, because these invite the Goodreads comparison: never lead with the shelf, the number of books logged, or anything resembling a rating.

## The north star already exists, and we drifted from it

This is not a new direction to invent. `docs/design/checkpoint-5a-exploration.md` records the owner selecting Bright Snap as the **visual language** while explicitly borrowing "the outcome-first product thesis from **Personal Librarian**," and retains this hypothesis verbatim:

> **Outcome-first personal librarian:** make better next-library-trip choices more prominent than shelf administration.

That is the Goodreads problem, identified and written down before any of this was built. The current application does not honor it — shelf administration is the whole application.

The Personal Librarian concept (`mockups/bookkin-concept-personal-librarian.html`) opens with the product stated as a single question:

> **What should we bring home next?**

Its hierarchy runs: the question, then "A signal pool, not one universal recipe," then "A small bag, not an endless feed," and only then "Your shelf" and "Log a read" as supporting surfaces. That ordering is the differentiation, expressed as information architecture rather than copy.

The line itself is worth keeping. "Bring home" means borrow rather than buy. "We" is the caregiver and child together, not a solitary reader. It states the job in the caregiver's own words, which is the test any landing-page headline should pass.

Treat this as the north star it was chosen to be, and treat any surface that leads with the shelf as a departure from an existing decision rather than a neutral default.

## The uncomfortable implication

The app currently opens on the Shelf. A shelf-first product reads as a tracker no matter what the marketing says, because the first screen is the product claim.

**Open question for Checkpoint 8:** should the home surface be the recommendation rather than the shelf? That is a design-gate decision, not something to settle here, but it should be asked explicitly at that gate rather than inherited by default. The current arrangement was correct while there was nothing else to show, and stops being correct the moment there is.

## The strategic risk, stated honestly

All of this differentiation rests on one thing: **the recommendations being good.** If the bags are mediocre, Bookkin is not a differentiated product — it is a worse Goodreads with fewer books and no reviews. Nothing in the privacy posture, the library handoff, or the copy discipline compensates for picks a parent does not trust.

That is why Checkpoint 7B, the recommender-systems reviewer, and the Checkpoint 11A quality gate carry the weight they do. The owner's own instinct that "the recs were always the takeaway" is the correct read of where this product lives or dies.

## What this means for the checkpoints ahead

- **7B:** the deterministic weights are set here, and the recommender-systems reviewer judges whether picks are good, not merely repeatable.
- **8:** the first bag ships, and the "looks like Goodreads" reaction should be retested on a fresh viewer. Ask the home-surface question at the design gate.
- **11A:** measures whether the recommendations actually earned the differentiation, with honest attribution when they have not.
- **12B and 13:** any public claim or pricing rests on this positioning, and the venture reviewer should pressure-test whether a caregiver would pay for it over free alternatives.
