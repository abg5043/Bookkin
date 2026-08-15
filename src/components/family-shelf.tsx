"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import type {
  VerifiedBookMetadata,
  VerifiedBookSearchResult,
  VerifiedBookWork,
} from "@/application/books/book-metadata";
import type {
  FamilyShelfItem,
  SaveFamilyBookResult,
  ShelfStatus,
} from "@/application/family-books/family-shelf";
import { isValidIsbn } from "@/domain/books/isbn";

type DiscoveryMode = "isbn" | "title" | "author";
type LookupState = "idle" | "loading" | "invalid" | "not-found" | "provider-error";
type SearchState = "idle" | "loading" | "results" | "empty" | "invalid" | "provider-error";
type ShelfSelection =
  | { kind: "isbn"; book: VerifiedBookMetadata }
  | { kind: "work"; book: VerifiedBookSearchResult }
  | { kind: "edition"; book: VerifiedBookSearchResult; edition: NonNullable<VerifiedBookSearchResult["matchingEdition"]> };

const shelfStatusOptions: Array<{ value: ShelfStatus; label: string }> = [
  { value: "owned", label: "Owned" },
  { value: "borrowed", label: "Borrowed" },
  { value: "wishlist", label: "Wishlist" },
];

const discoveryLabels: Record<DiscoveryMode, string> = {
  isbn: "ISBN",
  title: "Title",
  author: "Author",
};

function displayShelfStatus(value: ShelfStatus): string {
  return shelfStatusOptions.find((option) => option.value === value)?.label
    ?? value.replaceAll("_", " ");
}

function Cover({ alt, url, priority = false }: { alt: string; url?: string; priority?: boolean }) {
  if (url === undefined) {
    return (
      <div aria-label={`${alt} cover unavailable`} className="cover-frame cover-placeholder flex aspect-[2/3] w-full items-end p-3 font-display text-lg leading-tight text-[var(--muted)]">
        {alt}
      </div>
    );
  }

  return <Image alt={`${alt} cover`} className="cover-frame aspect-[2/3] w-full object-cover" height={300} priority={priority} src={url} width={200} />;
}

function selectionDetails(selection: ShelfSelection): VerifiedBookWork {
  return selection.book;
}

function selectionLabel(selection: ShelfSelection): string {
  if (selection.kind === "isbn") {
    return "Open Library edition";
  }

  return selection.kind === "edition" ? "Matching Open Library edition" : "Open Library work";
}

export function FamilyShelf() {
  const [shelf, setShelf] = useState<FamilyShelfItem[]>([]);
  const [isShelfLoading, setIsShelfLoading] = useState(true);
  const [shelfError, setShelfError] = useState<string | undefined>();
  const [mode, setMode] = useState<DiscoveryMode>("isbn");
  const [isbn, setIsbn] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [lookupState, setLookupState] = useState<LookupState>("idle");
  const [searchState, setSearchState] = useState<SearchState>("idle");
  const [discoveryError, setDiscoveryError] = useState<string | undefined>();
  const [searchResults, setSearchResults] = useState<VerifiedBookSearchResult[]>([]);
  const [selection, setSelection] = useState<ShelfSelection | undefined>();
  const [shelfStatus, setShelfStatus] = useState<ShelfStatus>("owned");
  const [isSaving, setIsSaving] = useState(false);
  const [confirmation, setConfirmation] = useState<string | undefined>();

  useEffect(() => {
    void refreshShelf();
  }, []);

  async function refreshShelf() {
    setIsShelfLoading(true);
    setShelfError(undefined);
    try {
      const response = await fetch("/api/family-books");
      if (!response.ok) {
        throw new Error("Shelf request failed");
      }
      setShelf(((await response.json()) as { items: FamilyShelfItem[] }).items);
    } catch {
      setShelfError("Your shelf could not load. Try refreshing the page.");
    } finally {
      setIsShelfLoading(false);
    }
  }

  function resetDiscovery() {
    setDiscoveryError(undefined);
    setSearchResults([]);
    setSearchState("idle");
    setLookupState("idle");
    setSelection(undefined);
    setConfirmation(undefined);
  }

  function chooseMode(nextMode: DiscoveryMode) {
    setMode(nextMode);
    resetDiscovery();
  }

  async function lookupBook(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLookupState("loading");
    setDiscoveryError(undefined);
    setSelection(undefined);
    setConfirmation(undefined);

    if (!isValidIsbn(isbn)) {
      setDiscoveryError("Enter a valid ISBN-10 or ISBN-13.");
      setLookupState("invalid");
      return;
    }

    try {
      const response = await fetch(`/api/books/lookup?isbn=${encodeURIComponent(isbn)}`);
      if (response.ok) {
        setSelection({ kind: "isbn", book: (await response.json()) as VerifiedBookMetadata });
        setLookupState("idle");
        return;
      }

      const payload = (await response.json()) as { error?: string };
      setDiscoveryError(payload.error ?? "We could not look up this ISBN.");
      setLookupState(response.status === 400 ? "invalid" : response.status === 404 ? "not-found" : "provider-error");
    } catch {
      setDiscoveryError("We could not reach Open Library. Nothing was saved.");
      setLookupState("provider-error");
    }
  }

  async function searchBooks(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearchState("loading");
    setDiscoveryError(undefined);
    setSearchResults([]);
    setSelection(undefined);
    setConfirmation(undefined);

    if (searchQuery.trim().length < 2) {
      setDiscoveryError("Enter at least two characters to search.");
      setSearchState("invalid");
      return;
    }

    try {
      const response = await fetch(`/api/books/search?field=${mode}&query=${encodeURIComponent(searchQuery)}`);
      const payload = (await response.json()) as { results?: VerifiedBookSearchResult[]; error?: string };
      if (!response.ok) {
        setDiscoveryError(payload.error ?? "We could not search Open Library.");
        setSearchState(response.status === 400 ? "invalid" : "provider-error");
        return;
      }

      const results = payload.results ?? [];
      setSearchResults(results);
      setSearchState(results.length === 0 ? "empty" : "results");
    } catch {
      setDiscoveryError("We could not reach Open Library. Nothing was saved.");
      setSearchState("provider-error");
    }
  }

  async function saveBook() {
    if (selection === undefined) {
      return;
    }

    const payload = selection.kind === "isbn"
      ? { selection: "isbn", isbn: selection.book.isbn, shelfStatus }
      : selection.kind === "work"
        ? { selection: "work", workRecordId: selection.book.workRecordId, shelfStatus }
        : { selection: "edition", editionRecordId: selection.edition.editionRecordId, shelfStatus };

    setIsSaving(true);
    setDiscoveryError(undefined);
    try {
      const response = await fetch("/api/family-books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const responsePayload = (await response.json()) as SaveFamilyBookResult & { error?: string };
      if (!response.ok) {
        setDiscoveryError(responsePayload.error ?? "Nothing was saved. Try again.");
        return;
      }

      setConfirmation(responsePayload.wasAlreadyOnShelf
        ? "Already on your shelf — its status is up to date."
        : "Added to your family shelf.");
      await refreshShelf();
    } catch {
      setDiscoveryError("We could not save this book. Nothing was changed.");
    } finally {
      setIsSaving(false);
    }
  }

  const selectedBook = selection === undefined ? undefined : selectionDetails(selection);

  return (
    <main className="app-shell min-h-screen bg-[var(--paper)] px-5 py-6 text-[var(--ink)] sm:px-10 sm:py-10">
      <div className="mx-auto max-w-6xl">
        <header className="app-header flex items-center justify-between border-b border-[var(--line)] pb-5">
          <div><p className="font-display text-2xl tracking-[-0.04em] sm:text-3xl">Bookkin</p><p className="mt-1 text-sm text-[var(--muted)]">Your family shelf</p></div>
          <span className="rounded-full border border-[var(--line)] px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-[var(--muted)]">Alpha</span>
        </header>

        <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_23rem] lg:items-start">
          <section aria-labelledby="shelf-heading">
            <div className="flex items-end justify-between gap-4"><div><p className="text-sm font-medium uppercase tracking-[0.15em] text-[var(--accent)]">Family shelf</p><h1 className="mt-2 font-display text-4xl tracking-[-0.05em] sm:text-5xl" id="shelf-heading">Books worth remembering.</h1></div>{!isShelfLoading && shelf.length > 0 ? <p className="text-sm text-[var(--muted)]">{shelf.length} {shelf.length === 1 ? "book" : "books"}</p> : null}</div>
            {isShelfLoading ? <p aria-live="polite" className="mt-10 text-[var(--muted)]">Opening your shelf…</p> : null}
            {shelfError !== undefined ? <p className="mt-10 rounded-xl border border-[var(--accent)] bg-white/40 p-4 text-sm" role="alert">{shelfError}</p> : null}
            {!isShelfLoading && shelfError === undefined && shelf.length === 0 ? <div className="mt-10 max-w-xl rounded-[1.5rem] border border-dashed border-[var(--line)] bg-white/30 p-7"><p className="font-display text-2xl tracking-[-0.04em]">Your shelf is waiting.</p><p className="mt-2 leading-7 text-[var(--muted)]">Add a book by ISBN, title, or author to start a simple record of what your family has found, borrowed, or wants next.</p></div> : null}
            {!isShelfLoading && shelfError === undefined && shelf.length > 0 ? <div className="mt-9 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 xl:grid-cols-4">{shelf.map((book, index) => <article className="shelf-book" key={book.id}><Cover alt={book.title} priority={index < 4} url={book.coverUrl} /><h2 className="mt-3 font-display text-xl leading-tight tracking-[-0.03em]">{book.title}</h2><p className="mt-1 text-sm leading-5 text-[var(--muted)]">{book.authors.length > 0 ? book.authors.join(", ") : "Author not listed"}</p><div className="mt-3 flex flex-wrap gap-1.5"><span className="status-chip px-2.5 py-1 text-xs text-[var(--muted)]">{book.shelfStatus === undefined ? "Status needs review" : displayShelfStatus(book.shelfStatus)}</span></div><Link className="text-link mt-4 inline-block text-sm font-medium text-[var(--accent)]" href={`/books/${book.id}`}>Log reading</Link></article>)}</div> : null}

            {searchState === "results" ? <section aria-labelledby="search-results-heading" className="mt-12 border-t border-[var(--line)] pt-7"><p className="text-sm font-medium uppercase tracking-[0.15em] text-[var(--accent)]">Verified results</p><h2 className="mt-2 font-display text-3xl tracking-[-0.04em]" id="search-results-heading">Choose a work or edition.</h2><div className="mt-6 space-y-3">{searchResults.map((book) => <article className="grid grid-cols-[4.5rem_1fr] gap-4 rounded-2xl border border-[var(--line)] bg-white/25 p-4 sm:grid-cols-[5rem_1fr_auto]" key={book.workRecordId}><Cover alt={book.title} url={book.coverSmallUrl} /><div><p className="text-xs font-medium uppercase tracking-[0.13em] text-[var(--muted)]">Work{book.editionCount === undefined ? "" : ` · ${book.editionCount} editions`}</p><h3 className="mt-1 font-display text-2xl leading-tight tracking-[-0.035em]">{book.title}</h3><p className="mt-1 text-sm text-[var(--muted)]">{book.authors.length > 0 ? book.authors.join(", ") : "Author not listed"}</p>{book.firstPublishYear === undefined ? null : <p className="mt-2 text-xs text-[var(--muted)]">First published {book.firstPublishYear}</p>}{book.matchingEdition === undefined ? null : <p className="mt-2 text-xs leading-5 text-[var(--muted)]">Matching edition{book.matchingEdition.title === undefined ? "" : `: ${book.matchingEdition.title}`}{book.matchingEdition.publicationDate === undefined ? "" : ` (${book.matchingEdition.publicationDate})`}</p>}</div><div className="col-span-2 flex flex-wrap gap-2 sm:col-span-1 sm:flex-col sm:justify-center"><button className="rounded-xl border border-[var(--ink)] px-3 py-2 text-sm font-medium" onClick={() => setSelection({ kind: "work", book })} type="button">Choose work</button>{book.matchingEdition === undefined ? null : <button className="rounded-xl border border-[var(--line)] px-3 py-2 text-sm" onClick={() => setSelection({ kind: "edition", book, edition: book.matchingEdition as NonNullable<VerifiedBookSearchResult["matchingEdition"]> })} type="button">Use edition</button>}</div></article>)}</div></section> : null}
          </section>

          <aside aria-labelledby="add-book-heading" className="editorial-panel p-5 sm:p-7 lg:sticky lg:top-8">
            <p className="text-sm font-medium uppercase tracking-[0.15em] text-[var(--accent)]">Add a book</p><h2 className="mt-2 font-display text-3xl tracking-[-0.045em]" id="add-book-heading">Find a verified record.</h2>
            <div aria-label="Discovery method" className="mt-5 grid grid-cols-3 rounded-xl border border-[var(--line)] bg-white/25 p-1" role="tablist">{(Object.keys(discoveryLabels) as DiscoveryMode[]).map((discoveryMode) => <button aria-selected={mode === discoveryMode} className={`rounded-lg px-2 py-2 text-sm ${mode === discoveryMode ? "bg-[var(--paper)] font-medium shadow-sm" : "text-[var(--muted)]"}`} key={discoveryMode} onClick={() => chooseMode(discoveryMode)} role="tab" type="button">{discoveryLabels[discoveryMode]}</button>)}</div>
            {mode === "isbn" ? <form className="mt-6" onSubmit={lookupBook}><label className="text-sm font-medium" htmlFor="isbn">ISBN-10 or ISBN-13</label><input autoComplete="off" className="mt-2 w-full rounded-xl border border-[var(--line)] bg-[var(--paper)] px-4 py-3 font-mono text-base shadow-inner outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20" id="isbn" inputMode="numeric" onChange={(event) => setIsbn(event.target.value)} placeholder="978-0-306-40615-7" value={isbn} /><button className="mt-3 w-full rounded-xl bg-[var(--ink)] px-4 py-3 font-medium text-[var(--paper)] transition hover:bg-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-60" disabled={lookupState === "loading" || isSaving} type="submit">{lookupState === "loading" ? "Looking up ISBN…" : "Look up book"}</button></form> : <form className="mt-6" onSubmit={searchBooks}><label className="text-sm font-medium" htmlFor="search-query">{mode === "title" ? "Book title" : "Author name"}</label><input autoComplete="off" className="mt-2 w-full rounded-xl border border-[var(--line)] bg-[var(--paper)] px-4 py-3 text-base shadow-inner outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20" id="search-query" onChange={(event) => setSearchQuery(event.target.value)} placeholder={mode === "title" ? "e.g. The Snowy Day" : "e.g. Ezra Jack Keats"} value={searchQuery} /><button className="mt-3 w-full rounded-xl bg-[var(--ink)] px-4 py-3 font-medium text-[var(--paper)] transition hover:bg-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-60" disabled={searchState === "loading" || isSaving} type="submit">{searchState === "loading" ? "Searching Open Library…" : `Search by ${mode}`}</button></form>}
            {lookupState === "loading" || searchState === "loading" ? <p aria-live="polite" className="mt-5 text-sm text-[var(--muted)]">{lookupState === "loading" ? "Looking up ISBN…" : "Searching Open Library…"}</p> : null}
            {searchState === "empty" ? <p className="mt-5 rounded-xl border border-[var(--line)] bg-[var(--paper)] p-3 text-sm leading-6">No verified books matched that {mode}. Try a fuller title or different spelling.</p> : null}
            {discoveryError !== undefined ? <p className="mt-5 rounded-xl border border-[var(--accent)] bg-[var(--paper)] p-3 text-sm leading-6" role="alert">{discoveryError}</p> : null}
            {selection === undefined || selectedBook === undefined ? null : <section aria-labelledby="selection-heading" className="mt-6 border-t border-[var(--line)] pt-6"><p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--muted)]">{selectionLabel(selection)}</p><div className="mt-3 grid grid-cols-[4.75rem_1fr] gap-4"><Cover alt={selectedBook.title} url={selectedBook.coverSmallUrl} /><div><h3 className="font-display text-2xl leading-tight tracking-[-0.04em]" id="selection-heading">{selectedBook.title}</h3><p className="mt-1 text-sm leading-5 text-[var(--muted)]">{selectedBook.authors.length > 0 ? selectedBook.authors.join(", ") : "Author not listed"}</p>{selection.kind === "edition" && selection.edition.isbn !== undefined ? <p className="mt-2 text-xs text-[var(--muted)]">ISBN {selection.edition.isbn}</p> : null}</div></div><fieldset className="mt-6"><legend className="text-sm font-medium">Where is this book now?</legend><p className="mt-1 text-sm leading-5 text-[var(--muted)]">Choose one current status.</p><div className="mt-3 grid gap-2">{shelfStatusOptions.map((option) => { const checked = shelfStatus === option.value; return <label className={`cursor-pointer rounded-xl border px-3 py-2.5 text-sm transition ${checked ? "border-[var(--accent)] bg-[var(--paper)]" : "border-[var(--line)] bg-white/20 hover:bg-[var(--paper)]/60"}`} key={option.value}><input checked={checked} className="mr-2 accent-[var(--accent)]" name="shelf-status" onChange={() => setShelfStatus(option.value)} type="radio" value={option.value} />{option.label}</label>; })}</div></fieldset><button className="mt-5 w-full rounded-xl bg-[var(--accent)] px-4 py-3 font-medium text-white transition hover:bg-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-60" disabled={isSaving} onClick={saveBook} type="button">{isSaving ? "Saving to shelf…" : "Add to family shelf"}</button>{confirmation === undefined ? null : <p aria-live="polite" className="mt-4 text-sm font-medium text-[var(--ink)]">{confirmation}</p>}</section>}
          </aside>
        </div>
      </div>
    </main>
  );
}
