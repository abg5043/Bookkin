# Bookkin: the discovery problem

A standalone working brief. It assumes no prior context and is meant to be edited collaboratively.

Status: **open problem, no decision made.** Nothing here is approved or scheduled.
Last updated: 2026-08-17.

---

## 1. The problem, plainly

A parent wants to read good books to their young child, roughly ages 2–8. Finding *a* book is trivial. Finding a book that is genuinely excellent, genuinely suited to that particular child, and that the parent **would not have found on their own** is the hard part — and it is the only part worth building a product for.

The owner's own words:

> "My whole reason for doing this is to get better recommendations for books to read to my kid. That's the problem I can't solve without this app. I can't do it with Claude, I can't do it with Goodreads. Right now I've been just going through authors that won children's book awards. Good idea, but not everything — I'll miss smaller books that are just as good."

His existing method, in the order he uses it:

1. Books that won children's book awards.
2. Other books by authors who have won awards.
3. Books his **local independent bookstore chooses to stock**, because they curate.
4. Popularity.

He says this "has worked pretty well." That is important. The method is good. The problem is that it produces a **bounded set**, and he has largely worked through it.

### What is actually being asked for

Not "recommend children's books." Specifically: **reach past the canon without abandoning it.**

Two clarifications the owner made explicitly, both of which constrain the solution:

- **Award winners are good recommendations.** They are simply easy for *him* to find already. No award category gets excluded or penalized.
- **This has to work for people who are not him.** A parent with no system should get the well-known excellent books first. A product that only ever surfaces obscure titles would fail them.

So discovery value is **personal, not a property of the book**. The same Caldecott winner is near-worthless to someone who has read the list and genuinely useful to someone who has not.

A rough statement of the objective:

> **value ≈ quality × unfamiliarity-to-this-caregiver**

Both terms matter. Quality alone gives you the canon. Unfamiliarity alone gives you junk.

---

## 2. Why this is hard, and why existing tools do not solve it

| Tool | Why it fails for this |
| --- | --- |
| **Goodreads** | Built for adults tracking their own reading, socially. Popularity- and review-volume-driven, which points back at the canon. No concept of reading *to* someone. |
| **Library catalog search** | Excellent if you already know what you want. Subject browse returns thousands of results ordered by holdings, i.e. by popularity. It answers "what exists," not "what should we read." |
| **Award lists** | This is the owner's current method. Genuinely good, and finite. |
| **A general AI assistant** | Will happily produce plausible titles, including ones that do not exist, and cannot verify availability. Fabrication is the specific failure mode this product must not have. |
| **A good children's librarian** | **Actually solves it.** They ask two questions, hand you a small stack, and tell you why. This is the thing worth reproducing. |

The last row is the product thesis. Bookkin's chosen north star — recorded before any of this was built — is the "Personal Librarian" concept, framed as a single question:

> **"What should we bring home next?"**

---

## 3. Where the product is today

Built and working (deployed to a private, passphrase-protected preview):

- Multiple child profiles, each with a coarse age range and overlapping reading relationships (read-aloud, reading together, some independent).
- Topic interests, with a privacy gate: free-text interests stay private unless the caregiver explicitly approves mapping one to a closed, versioned topic code. Only approved codes ever leave the system.
- Controlled "kinds of books" preferences (funny, fact-filled, fantasy, rhyming, interactive, gentle/cozy, longer stories, wordless).
- A shelf with owned/borrowed/wishlist status, and a reading log recording finishes, rereads, stopped reads, "decided not to read," and separate child and caregiver reactions.
- "Add a book that worked" — durable evidence, with an explicit subject (worked for my child / for me / for family reading time).
- A candidate-sourcing pipeline: query a provider, hydrate verified metadata, deduplicate, apply eligibility rules, and store an immutable pool with full provenance.

**Not built yet:** scoring, ranking, composition, explanations, and any user-facing recommendation. That is the next major piece of work, and it is the piece everything else exists to serve.

### The uncomfortable fact

A first-time viewer looked at the deployed app and said it **"looks like Goodreads."**

That reading was accurate. Every surface shipped so far — shelf, search-and-add, reading log — is a *tracking* surface. The differentiator does not exist yet. The app currently opens on the shelf, and the first screen is the product claim.

This is a sequencing artifact rather than a design failure, but it is also a deadline: **when the first recommendation ships, that comparison has to stop being accurate.**

---

## 4. What we have verified empirically

These are measured facts from live queries against Open Library (the current and only metadata provider), not assumptions.

### 4.1 The candidate pool reproduces the canon

Current sourcing sends a fixed subject query with `limit=100`, `page=1`, and **no sort parameter**, which means the provider's default relevance ordering. That ordering correlates strongly with popularity.

- `subject:dinosaurs AND language:eng` returns **7,143** works. Taking the top 100 is roughly the densest **1.4%** of the distribution.
- The top result is *Danny and the Dinosaur* (1958, 43 editions) — precisely the kind of heavily-reissued title the owner already finds without help.

**If the pool is the canon, no amount of clever ranking downstream escapes it.** This is a sourcing problem, not a scoring problem.

### 4.2 A correctness defect: topic queries return adult books

Only the generic corpus query filters for juvenile material. The thirteen topic queries are bare — `subject:animals AND language:eng` — with no age constraint at all. Captured results:

| Topic | Actual top results |
| --- | --- |
| `animals` | *Animal Farm*; Borges, *Libro de los seres imaginarios* |
| `vehicles` | *Rama II* (Arthur C. Clarke); a satellite-engineering document |
| `weather` | *Die with Zero* (personal finance) |
| `feelings` | *Emotional Intelligence* (Goleman) |
| `music` | *Musicophilia* (Oliver Sacks); a romance novel |
| `humor` | *Good Omens* |

A caregiver confirming "animals" for a four-year-old would have received Orwell. This is a defect in an owner-approved frozen contract and requires approval to change, not a quiet patch.

### 4.3 Subject specificity is a real lever, and it is free

| Query | Results | Character of top results |
| --- | --- | --- |
| `subject:animals` | 97,630 | Adult + children mixed; *Animal Farm* (653 editions) leads |
| plus `subject:"juvenile fiction"` | 13,791 | Children's, but skewed to ages 8–12 |
| plus `subject:"picture books for children"` | **805** | Real picture books: *Tawny Scrawny Lion* (11 editions), *Too Much Noise* (11), *Monkey Puzzle* (26) |

Narrowing the subject **fixes the age problem and reduces canon pull simultaneously**, because famous titles are a smaller share of a tighter shelf. Costs nothing, needs no external data.

Caveat: `"picture books for children"` is volunteer-maintained tagging with likely uneven coverage. 805 results for a topic as broad as animals suggests real gaps. Each topic needs its own measurement.

### 4.4 What the provider can and cannot do

**Can:** `sort` supports `new`, `old`, `random`, `rating`, `key`, `title`. Deep pagination works (page 50 of a 7,143-result query returned a valid obscure record). Available fields include `edition_count`, `first_publish_year`, `publisher`, `subject`, `ratings_average`, `ratings_count`, `want_to_read_count`.

**Cannot:** there is **no award field, no starred-review field, and no imprint-quality field.** `subject:"Caldecott Medal"` happens to work only because volunteers tagged it as a subject string; that cannot be assumed for Cybils, Batchelder, Zolotow, or state award lists — which are exactly the obscure-but-juried sources that matter here.

**Two warnings:**
- `sort=new` returns single-edition, unvetted, possibly self-published titles. Ungated, chasing novelty would actively degrade recommendations while feeling like progress.
- `sort=rating` behaves non-monotonically with respect to raw average, consistent with a count-weighted formula. The exact mechanism is undocumented and should not be relied upon as a quality score.

---

## 5. The core insight

Every channel the owner already trusts works for one reason: **a human read the book and chose it.**

Awards are juries. Starred reviews are editors. Small presses are acquiring editors publishing fifteen books a year. His local bookstore is a buyer deciding what earns shelf space. All curation.

**Popularity is the odd one out.** It counts purchases, not judgment. And every metric the provider exposes — edition count, holdings, ratings volume, want-to-read counts — is a popularity measure. They all point back at the canon.

> **The selection rule: prefer signals produced by a person exercising judgment, and prefer those uncorrelated with sales.**

His bookstore is already doing, locally and by hand, exactly what Bookkin needs to do systematically.

### The trap to avoid

Obscurity is trivial to achieve and worthless on its own. With provider-only data, "excellent unknown 2024 debut" and "forgotten mediocre title" look **identical**: single edition, no ratings, thin subjects, unknown publisher.

You cannot tell them apart from this data. Any scorer that tried would be laundering "few editions + unknown publisher" into a quality judgment.

> **Obscure-and-unverified is not the goal. Obscure-and-verified-excellent is.**

---

## 6. Candidate solutions

### 6.1 Levers requiring no external data

Free, reversible, and available now:

| Lever | What it does |
| --- | --- |
| **Age/format subject filtering** | Fixes the defect in 4.2 and narrows toward picture books |
| **Subject specificity** | "Excavators" not "vehicles" — narrower shelves have fewer famous titles |
| **Mid-tail pagination** | Sample ranks ~200–600 instead of only the top 100 |
| **Comp-title expansion** | "More like this book" — already collected, currently drives *no* sourcing |
| **Creator adjacency** | The illustrator's *quieter* books, once you know one the child loved |
| **Backlist sampling** | Spread publication dates to reach durable quiet books |
| **Household familiarity** | Shelf and history already record what this family knows |

**Honest limit:** these produce *unfamiliar*. They cannot produce *verified excellent*.

### 6.2 A curated seed list — the actual fix

A versioned, checked-in data file of book identifiers drawn from curation sources that are **independent of sales**. It flows through the existing pipeline like any other source code, carrying full provenance.

Candidate sources:

- **State children's-choice awards.** ~50 states, each publishing annual librarian-committee nominee lists. Vetted, refreshed yearly, nearly invisible outside their home state. Plausibly the largest curated long-tail pool that exists.
- **Cybils** — judged by bloggers and librarians for "literary merit **and** kid appeal."
- **ALSC Notable Children's Books** — same committee culture as the Caldecott, but a broad annual list.
- **Batchelder Award** — best US edition of a translated work. Highest-leverage lever for translated books, which are systematically under-discovered in the US.
- **Charlotte Zolotow Award** — judges the *writing*, not the art. Directly relevant to read-aloud quality.
- **Ezra Jack Keats Award** — specifically for *new* creators.
- **Bank Street Best Children's Books of the Year** — several hundred titles annually, age-graded and annotated.
- **CCBC Choices** (UW–Madison) — rigorous, strong on small-press and diverse work.
- **Kids' Indie Next List** (American Booksellers Association) — independent booksellers nominating what they most want to hand-sell. **This is the owner's bookstore channel, aggregated nationally and published as a list.**
- **Small-press imprints** — Enchanted Lion, Gecko Press, Elsewhere Editions, Levine Querido, Groundwood, Annick, Owlkids, Kids Can, Tundra, Charlesbridge, Peachtree, Lee & Low.

**This is a content task, not an engineering task.** That is the single most important sentence in this document. The code to consume a seed list is straightforward; assembling and maintaining it is human curation work.

### 6.3 A licensed second source

- **NoveList / NoveList K-8** (EBSCO) — professional readers'-advisory data with "similar titles" and review excerpts. Paid institutional license, often held by library systems. Worth checking whether Johnson County Library — already integrated for catalog handoff — licenses it. Redistribution terms typically restrict display outside a licensed catalog.
- **Review trades** (Kirkus, SLJ, PW, Booklist, Horn Book) — the actual source of "starred review," but commercial and enterprise-licensed. Slow and expensive to acquire.
- **Google Books** — free, adds description and category coverage, but carries no independent quality signal either.

### 6.4 Three paths

| | Scope | Cost | Honest expectation |
| --- | --- | --- | --- |
| **A** | 6.1 only | Days of engineering | Reaches past the canon; cannot distinguish excellent from merely obscure |
| **B** | 6.1 + 6.2 | Engineering + real curation time | The only path that is free, license-clean, deterministic, and available now. **Recommended.** |
| **C** | 6.1 + 6.2 + 6.3 | Adds licensing negotiation and an ongoing dependency | Highest ceiling, slowest start |

---

## 7. Scoring implications

Not yet built, so this is design, not critique.

**Unfamiliarity** must be measured against *this household's record*, never against global fame:

- Hard exclusion: already on the shelf, already used as a reference, already marked "not for us."
- Soft discount: same author or illustrator already read — plausibly still wanted, just less discovery.
- **Do not** treat "is a Caldecott winner" as evidence of familiarity. Award status is a fine recommendation; it is only undistinctive for someone who has worked the list.

**Quality** must be earned independently, never inferred from obscurity:

- Seed-list membership is the primary positive signal — and it doubles as a *checkable explanation*.
- Imprint membership as a secondary signal.
- Ratings only as a weak, count-gated signal, never primary.
- **Missing quality evidence is neutral, not positive.** A book with no seed-list hit and no imprint match should rank low no matter how obscure it is.

**Popularity** should be neutral to mildly negative, contextual on household familiarity — never a blanket penalty, since "popular and great" is exactly right for a family new to the canon.

---

## 8. Measurement

Current metrics track whether a recommendation was pursued, obtained, read, and liked. **None of them ask whether it was something the caregiver would never have found** — which is the entire value proposition.

Proposed:

- **Discovery rate** — recommendations the caregiver marks as "hadn't heard of this," over all delivered. **Requires a capture point that does not exist yet** (a lightweight "did you already know this one?" at save or catalog-open).
- **Discovery-and-obtained rate** — the subset that were also pursued and well received. This is the real metric.
- **Seed-list yield** — share of a bag sourced from the curated channel versus the canon channel. **Instrumentable today** from existing provenance, with no new capture.

**Honest limit:** one household produces perhaps low-double-digit requests over months. A rate over n=8 is an anecdote, not a rate. Report raw counts alongside any percentage, treat trends as directional, and triangulate with the owner's qualitative judgment. This is a course-correction diagnostic, not evidence of product-market fit.

---

## 9. Constraints any solution must respect

- **Never fabricate.** No invented books, authors, availability, or age suitability. Missing data stays visibly missing.
- **Deterministic in v0.1.** Hand-set, inspectable weights. No learned model yet.
- **Child privacy.** Only closed, caregiver-approved topic codes leave the system. Never raw interest text, child identifiers, ages, or history.
- **Facts versus expression.** "Won the 2019 Zolotow Award" and "starred in Kirkus" are facts and may be recorded with attribution. Review *text* is authored work — cite and link, never reproduce.
- **Prefer published lists to scraping.** Scrapers are brittle and carry terms-of-service risk independent of copyright.
- **Library-first.** The exit is a library catalog handoff, not a purchase.

---

## 10. Open questions

**For the owner:**

1. Which path — A, B, or C?
2. Are you willing to spend curation time assembling a seed list, and at what cadence would you refresh it?
3. Should the app open on the recommendation instead of the shelf? *(This would get 3+ mockups before any decision.)*
4. Which sources matter most to you? Your bookstore's picks are already on the list — are there others you personally trust?

**Requiring verification, currently assumed by nobody:**

5. Which of the sources in 6.2 publish machine-readable data versus web pages only.
6. Licensing terms for each, particularly the ABA lists and the review trades.
7. Whether award-list titles can be matched to provider records by title and author, or whether ISBNs are required.
8. How much of any curated list the owner's local library system actually holds — an unobtainable recommendation is a dead end.
9. Whether `"picture books for children"` tagging coverage is adequate per topic, or too sparse to rely on.

---

## 11. Suggested seed-list format

A concrete starting point, so this can be worked on directly. One row per book:

| Field | Example | Notes |
| --- | --- | --- |
| `title` | Too Much Noise | As published |
| `authors` | Ann McGovern | Illustrator separately where distinct |
| `isbn13` | | Strongly preferred; makes matching reliable |
| `sourceCode` | `alsc_notable` | Which curation channel |
| `sourceYear` | 2019 | For refresh tracking |
| `sourceDetail` | Winner / Honor / Nominee / Finalist | |
| `sourceUrl` | | Attribution and verification |
| `ageHint` | picture book | Optional, never presented as verified age guidance |

**Suggested first slice, to prove the pipeline end to end before scaling:** one year of ALSC Notables **or** one state's award list. Small enough to assemble in an afternoon, large enough to test matching, provenance, and whether the resulting recommendations actually feel different.

---

## 12. What I would do first

1. **Fix the juvenile-filter defect.** It is a correctness bug, independent of any strategic choice.
2. **Add subject-specificity and mid-tail pagination.** Cheap, measurable, immediately improves the pool.
3. **Assemble one small seed slice** (§11) and run it through the existing pipeline end to end.
4. **Compare the resulting pools side by side** and judge honestly whether the curated channel produces visibly different books.
5. **Only then** decide how far to scale curation, and whether a licensed source is worth pursuing.

This front-loads what is cheap and reversible, and defers cost and commitment until the mechanism has actually been shown to work.
