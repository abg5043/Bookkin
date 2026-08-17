# Curation signals: how Bookkin finds the books you would not have found

Exploration document. Nothing here is approved, scoped, or scheduled. Its purpose is to map the option space for the product's differentiating feature before committing to any of it.

## The principle

Every channel the owner already uses works for the same reason: **a human read the book and chose it.** Awards, a curating local bookstore, starred reviews, small-press editors — all of them are curation. Popularity is the outlier on that list: it measures how many people bought a thing, not whether anyone qualified judged it good.

That gives a sharp selection rule for everything below:

> Prefer signals produced by a person exercising judgment, and prefer those uncorrelated with sales.

Obscurity is not the goal and is trivially easy to achieve badly. The goal is **curated but not famous**.

## Source categories

### A. Juried awards beyond the headline ones

The Caldecott and Newbery are two awards out of hundreds. The rest are just as juried and far less traversed.

| Source | Why it matters | Rough scale |
| --- | --- | --- |
| **State children's-choice awards** | Roughly 50 states, each publishing an annual nominee list chosen by librarian committees. Nominees are vetted but mostly unknown outside their state. This is likely the single largest curated long-tail pool in existence. | ~50 lists × ~15–20 nominees × many years |
| **Cybils** | Nominated and judged by book bloggers and librarians explicitly for "literary merit **and** kid appeal" — a different filter from critic-only awards. | Annual, multiple categories |
| **ALSC Notable Children's Books** | Same committee culture as the Caldecott but a broad annual list rather than a single winner. | ~50–100/year |
| **Batchelder Award** | Best US edition of a book first published in another language. The highest-leverage lever for translated work, which is systematically under-discovered in the US. | Winner + honors, annual |
| **Charlotte Zolotow Award** | Judges the **writing** in a picture book rather than the art. Directly relevant to read-aloud quality. | Winner + honors, annual |
| **Ezra Jack Keats Award** | Specifically for *new* writers and illustrators — near-definitionally not yet famous. | Annual |
| **Boston Globe–Horn Book, Golden Kite, Kirkus Prize** | Established juries, far less consumer-visible than the ALA medals. | Annual |
| **Pura Belpré, Coretta Scott King, Schneider Family, Sydney Taylor, Américas, Freeman** | Identity- and region-specific juries surfacing excellent work that mainstream lists miss. | Annual each |
| **International**: Kate Greenaway (UK), Astrid Lindgren Memorial Award, Hans Christian Andersen | Excellent books that simply never entered US consumer awareness. | Annual each |

The state lists deserve emphasis. They are curated by working children's librarians, refreshed annually, and almost entirely invisible outside their home state.

### B. Institutional curated lists

Often better than awards because they are broad, annotated, and age-graded rather than winner-take-all.

- **Bank Street College — Best Children's Books of the Year.** Several hundred titles annually, age-graded and annotated by a committee of educators and librarians. Probably the highest-value single source on this page.
- **CCBC Choices** (Cooperative Children's Book Center, UW–Madison). Rigorous, annotated, strong on diverse and small-press work.
- **New York Public Library / Chicago Public Library annual best-of lists.** Librarian-selected, public.
- **Reading Rockets, Colorín Colorado, We Need Diverse Books.** Thematic curation.

### C. Independent bookseller signals — the owner's own channel, systematized

- **Kids' Indie Next List** (American Booksellers Association). Independent booksellers nominate the children's titles they most want to hand-sell, published quarterly. This is precisely the owner's local-bookstore channel, aggregated across hundreds of stores, and published as a list rather than requiring scraping.
- **Individual store staff picks.** Higher fidelity, much higher cost and risk — see the legal note below. Not a starting point.

### D. Professional review signals

Starred reviews from *Kirkus*, *School Library Journal*, *Publishers Weekly*, *Booklist*, and *The Horn Book*. A star is an editor's judgment made without reference to sales, which is exactly the property wanted.

Practical caveat: availability varies, some are subscription products, and reproducing review text raises rights issues. See below.

### E. Publisher and imprint as a taste proxy

An editor publishing fifteen books a year has already filtered hard. Imprints worth treating as a mild positive signal: Enchanted Lion, Gecko Press, Elsewhere Editions, Levine Querido, Groundwood, Annick, Owlkids, Kids Can, Tundra, Charlesbridge, Peachtree, Lee & Low, Candlewick.

Translation-heavy imprints do double duty, since translated picture books are both curated and structurally under-discovered in the US.

### F. Signals available with no external data at all

These cost nothing beyond work already planned, and should probably come first:

- **Subject specificity.** A child obsessed with excavators specifically, not "vehicles," pushes into narrower subject headings where famous titles thin out naturally. Long tail by precision rather than by obscurity.
- **Creator adjacency.** If a family loved a book, that illustrator's or author's *other, quieter* titles are strong candidates. Standard readers'-advisory technique, and Bookkin already records which books worked.
- **Comp-title expansion.** "More like this book" is already collected and, per the librarian review, is a stronger signal than topic. It currently does not drive sourcing at all.
- **Household familiarity as a negative signal.** The shelf and reading history are direct evidence of what this caregiver already knows, which is what makes discovery value personal and measurable.
- **Deliberate backlist sampling.** Publication-date spread reaches quiet books still in print, rather than only current-season releases.
- **Durability.** Still in print and still widely held years after a quiet debut is a real, if slow, quality proxy.

## The legal and ethical line

This matters enough to state before any implementation:

- **Facts are not copyrightable.** "This book won the 2019 Charlotte Zolotow Award" or "this received a starred review in Kirkus" is a fact. Recording it, with attribution and a link, is legitimate — and it is the same verified-fact-with-provenance model the architecture already uses everywhere.
- **Expression is copyrightable.** Review text, annotations, and list blurbs are authored work. Bookkin should cite and link, not reproduce.
- **Scraping carries terms-of-service risk independent of copyright,** and scrapers are brittle. Published lists, feeds, and any official API are strongly preferable to scraping a bookstore's website. Where a source is genuinely valuable and only exists as a web page, the honest routes are asking permission or linking out — not quietly harvesting.
- **Attribution is a feature, not an obligation.** "Cybils finalist, Gecko Press, translated from Danish" is a *better* explanation than a bare subject match, and it is checkable by the caregiver. It makes the recommendation more trustworthy, not less.

## What this buys the product

A recommendation whose reason is "tagged animals" is something a caregiver could reproduce in a library search box in thirty seconds — the worse-catalog trap. A recommendation whose reason is "starred in SLJ, Bank Street Best Book, from a press that publishes fifteen titles a year, and you have not read anything by this illustrator" is not reachable that way. **The curation signal is simultaneously the discovery mechanism and the explanation.**

## Open questions requiring verification before any commitment

None of these should be assumed:

1. Which of these sources publish machine-readable data — a feed, an API, a downloadable list — versus web pages only.
2. Licensing and terms for each, particularly the ABA lists and the review trades.
3. Whether Open Library work records can be reliably matched to award lists by title and author alone, or whether ISBN is required and available.
4. How much of each list is actually held by the owner's local library system, since an unobtainable recommendation is a dead end.
5. Whether a curated seed pool can be refreshed sustainably, or becomes stale maintenance debt.

## A plausible order of work, if this is pursued

1. **Free internal levers first** (category F) — subject specificity, comp-title expansion, creator adjacency, backlist sampling, household familiarity. These need no external data, no licensing, and no maintenance, and they may go a surprising distance alone.
2. **One high-value curated list** to prove the pipeline end to end — Bank Street or a bundle of state award lists — including the matching problem, provenance, and refresh.
3. **Broaden the curated channel** across award programs and the Kids' Indie Next List.
4. **Review signals last**, since they carry the most licensing complexity.

This ordering front-loads what is cheap and reversible, and defers what carries legal and maintenance cost until the mechanism is proven.

## Empirical findings, 2026-08-17

Open Library recovered and the frozen 17-case matrix was captured for the first time (`fixtures/candidates/open-library-discovery-manifest.json`). Two findings, one of them a defect.

### Defect: the confirmed topic queries do not filter for children's books

Only `children_general` carries `subject:"juvenile fiction"`. The thirteen topic queries are bare — `subject:animals AND language:eng` — with no juvenile constraint. Captured top results include *Animal Farm* and Borges for `animals`, Arthur C. Clarke's *Rama II* and a satellite-engineering document for `vehicles`, the personal-finance book *Die with Zero* for `weather`, Goleman's *Emotional Intelligence* for `feelings`, and *Good Omens* for `humor`.

A caregiver confirming "animals" for a four-year-old would have received Orwell. This is a correctness defect in an owner-approved frozen contract, not a tuning problem, and it changes the contract, so it requires owner approval rather than a quiet patch.

### Subject specificity is a real long-tail lever, measured

| Query | Results | Character of top results |
| --- | --- | --- |
| `subject:animals AND language:eng` | 97,630 | Adult and children's mixed; *Animal Farm* (653 editions) leads |
| plus `subject:"juvenile fiction"` | 13,791 | Children's, but skewed to ages 8–12 |
| plus `subject:"picture books for children"` | 805 | Genuine picture books: *Tawny Scrawny Lion* (11 editions), *Too Much Noise* (11), *Monkey Puzzle* (26) |

Narrowing the subject fixes the age problem and reduces canon pull at the same time, because famous titles are a smaller share of a tighter shelf. This costs nothing and needs no external data.

Caveats to verify before relying on it: `"picture books for children"` tagging coverage is volunteer-maintained and may be uneven across topics, and 805 results for a broad topic like animals suggests real coverage gaps. Each topic needs its own measurement rather than an assumption.

### Confirmed by direct query, not inference

Default ordering is relevance and correlates with popularity; `subject:dinosaurs` returns 7,143 works and the current code takes the top 100, roughly the densest 1.4%. `sort` supports `new`, `old`, `random`, `rating`, `key`, `title`. Deep pagination works — page 50 of a 7,143-result query returned a valid obscure record. Open Library carries no award, starred-review, or imprint-quality field; `subject:"Caldecott Medal"` happens to work only because volunteers tagged it, and that cannot be assumed for Cybils, Batchelder, Zolotow, or state lists.
