# North star: the problem Bookkin exists to solve

This is the single sentence every checkpoint answers to. It supersedes nothing in `overview.md`; it sharpens it.

## The problem, in the owner's words

> "My whole reason for doing this is to get better recommendations for books to read to my kid. That's the problem I can't solve without this app. I can't do it with Claude, I can't do it with Goodreads. Right now I've been just going through authors that won children's book awards. Good idea, but not everything — I'll miss smaller books that are just as good."

## What that actually specifies

The job is **long-tail discovery for one specific child**, not recommendation in general.

That distinction does real work:

- **The canon is already covered.** Award lists, bestseller shelves, and "classic children's books" articles are solved problems. A recommendation reachable that way has delivered little.
- **Value is measured by what the caregiver would not have found.** A great book they already knew about is a correct answer and a useless one.
- **The competition is not Goodreads.** It is a Caldecott list and a library display table. Bookkin has to beat those, not a social catalog.
- **"Good" is not "popular."** The premise is that excellent books exist outside the award-winning set, and finding them is the product.

## The test for any decision

> Does this help surface a great book for this child that the caregiver would not have found on their own?

An honest "indirectly" is fine. Correctness, privacy, and infrastructure work usually answer that way and are still necessary. What is not fine is not asking, or answering with a description of what was built.

## Two consequences already identified

**Candidate sourcing currently reproduces the canon.** Discovery queries Open Library with a fixed subject expression, `limit=100`, `page=1`, at the provider's default relevance ordering. That ordering favors the most-held, most-popular editions — which is approximately the award-winning set the owner already works through. A pool built from the canon cannot produce long-tail recommendations no matter how well it is scored. This must be addressed where candidate sourcing and scoring are decided.

**Success metrics do not measure discovery.** `success-metrics.md` measures whether a recommendation was pursued, obtained, read, and positively received. All useful, and none of it distinguishes "you found me a book I already knew" from "you found me a book I would never have found." The metric this goal needs is closer to: of recommendations the caregiver had not previously heard of, how many were obtained and well received.

## What this does not change

The product-truth invariants, the privacy posture, and the prohibition on fabricated books, availability, or reasoning are unaffected. Long-tail discovery raises the stakes on them: a recommendation for an unfamiliar book is one the caregiver cannot sanity-check from memory, so the evidence behind it has to be real and the explanation has to be honest.
