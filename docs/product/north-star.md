# North star: the problem Bookkin exists to solve

This is the single sentence every checkpoint answers to. It supersedes nothing in `overview.md`; it sharpens it.

## The problem, in the owner's words

> "My whole reason for doing this is to get better recommendations for books to read to my kid. That's the problem I can't solve without this app. I can't do it with Claude, I can't do it with Goodreads. Right now I've been just going through authors that won children's book awards. Good idea, but not everything — I'll miss smaller books that are just as good."

## What that actually specifies

The job is **reaching past the canon, not replacing it**.

The owner's existing method — award winners, authors who won awards, books his local bookstore chooses to stock, and popularity — is a good method, and he says it "has worked pretty well." Those channels work because each is a form of curation. The problem is not that they produce bad books; it is that they produce a bounded set, and he has largely exhausted it.

Four things follow:

- **Award winners remain good recommendations.** They are simply easy for this owner to find already, so they carry less *additional* value for him. They are not to be excluded or penalized as a category.
- **Discovery value is personal, not a property of the book.** The same Caldecott winner is near-worthless to a caregiver who has worked through the list and genuinely useful to one who has not. Bookkin already records the shelf and reading history, which is direct evidence of what a household has actually encountered.
- **This must work for people who are not the owner.** A new caregiver with no system needs the well-known excellent books first. A product that only ever surfaces obscure titles would fail them. The pool must reach further than the canon; the ranking decides who sees what.
- **Curation is the signal worth chasing.** What the bookstore, the award juries, the starred reviewers, and the small-press editors all share is a human who read the book and chose it. That is the quality signal that does not correlate with sales.

## The test for any decision

> Does this help surface a great book for this child that the caregiver would not have found on their own?

"Would not have found" is relative to that caregiver, not to the world.

An honest "indirectly" is fine. Correctness, privacy, and infrastructure work usually answer that way and are still necessary. What is not fine is not asking, or answering with a description of what was built.

## Two consequences already identified

**Candidate sourcing currently reproduces the canon.** Discovery queries Open Library with a fixed subject expression, `limit=100`, `page=1`, at the provider's default relevance ordering. That ordering favors the most-held, most-popular editions — which is approximately the award-winning set the owner already works through. A pool built from the canon cannot produce long-tail recommendations no matter how well it is scored. This must be addressed where candidate sourcing and scoring are decided.

**Success metrics do not measure discovery.** `success-metrics.md` measures whether a recommendation was pursued, obtained, read, and positively received. All useful, and none of it distinguishes "you found me a book I already knew" from "you found me a book I would never have found." The metric this goal needs is closer to: of recommendations the caregiver had not previously heard of, how many were obtained and well received.

## Where the value actually comes from

A children's librarian reviewing this named the mechanism precisely: excellence-in-obscurity needs a quality signal that is **independent of popularity**. Sales, holdings, and edition counts all measure the same thing and all point back at the canon. Human curation does not:

- Starred trade reviews, where an editor's judgment is made without reference to sales.
- Juried awards beyond the headline ones — Cybils, ALSC Notables, Batchelder for translated work, Zolotow for text craft, state children's-choice lists.
- Small and independent press imprints, where an editor publishing fifteen books a year has already filtered hard.
- A curating local bookstore choosing what to put on its shelves.
- Durability: a quiet book still in print and still held years later.

The owner's own bookstore channel belongs on that list, and it is the same mechanism as the others. This is the category of signal Bookkin should chase, and each item on it is a verifiable, citable structured fact rather than something inferred.

## What this does not change

The product-truth invariants, the privacy posture, and the prohibition on fabricated books, availability, or reasoning are unaffected. Long-tail discovery raises the stakes on them: a recommendation for an unfamiliar book is one the caregiver cannot sanity-check from memory, so the evidence behind it has to be real and the explanation has to be honest.
