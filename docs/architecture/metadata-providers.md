# Metadata providers

Book metadata must enter the application through a `BookMetadataProvider` boundary and be normalized before presentation or persistence.

The initial provider is Open Library. A fallback provider should be added only if measured coverage makes it necessary.

Providers must not invent missing titles, authors, ISBNs, publication facts, age guidance, length, or subjects. Provenance should be retained at record or field level where practical.

Checkpoints 3 and 3B implement ISBN, title, and author discovery through the provider boundary. The Open Library adapter uses the edition, work, author, Search, and Covers APIs server-side. A verified ISBN or selected edition is normalized into `BookWork` and `BookEdition`. Side effects depend on the explicit user action:

- Explicit shelf save may create or reuse `FamilyBook`.
- Request-reference selection creates no shelf, history, reaction, event, status, or durable preference record.
- Explicit `A book that worked for us` creates only an approved `PreferenceObservation` after Checkpoint 5B.

Provider record IDs and field-level coverage are stored in `metadataProvenance`. The cache is consulted before a repeat ISBN lookup reaches Open Library.

Provider requests may contain only minimized ISBN, title, or author search terms. They must not include household identifiers, child names, interests, reactions, reading history, notes, credentials, or unrelated free text.

The broader provider contract remains:

```ts
interface BookMetadataProvider {
  lookupByIsbn(isbn: string): Promise<BookLookupResult | null>;
  search(query: string): Promise<BookSearchResult[]>;
}
```

The implemented provider supports `lookupByIsbn`, title/author `search`, and server-side work/edition re-resolution before persistence. The UI labels search cards as works and presents a matching edition only when Open Library supplied one.
