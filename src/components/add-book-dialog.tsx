"use client";

import { type FormEvent, useState } from "react";
import type {
  VerifiedBookMetadata,
  VerifiedBookSearchResult,
  VerifiedBookWork,
} from "@/application/books/book-metadata";
import type { SaveFamilyBookResult, ShelfStatus } from "@/application/family-books/family-shelf";
import { isValidIsbn } from "@/domain/books/isbn";
import { BookCover } from "@/components/book-cover";
import { BookkinModal } from "@/components/bookkin-modal";

type AddMode = "title" | "author" | "isbn";
type AddSelection =
  | { kind: "isbn"; book: VerifiedBookMetadata }
  | { kind: "work"; book: VerifiedBookSearchResult }
  | { kind: "edition"; book: VerifiedBookSearchResult; edition: NonNullable<VerifiedBookSearchResult["matchingEdition"]> };

const statusOptions: Array<{ value: ShelfStatus; label: string }> = [
  { value: "owned", label: "Owned" },
  { value: "borrowed", label: "Borrowed" },
  { value: "wishlist", label: "Wishlist" },
];

function selectedWork(selection: AddSelection): VerifiedBookWork {
  return selection.book;
}

export function AddBookDialog({
  onClose,
  onAdded,
}: {
  onClose: () => void;
  onAdded: (message: string) => Promise<void>;
}) {
  const [mode, setMode] = useState<AddMode>("title");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<VerifiedBookSearchResult[]>([]);
  const [selection, setSelection] = useState<AddSelection>();
  const [status, setStatus] = useState<ShelfStatus>();
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string>();

  function chooseMode(nextMode: AddMode) {
    setMode(nextMode);
    setQuery("");
    setResults([]);
    setSelection(undefined);
    setStatus(undefined);
    setMessage(undefined);
  }

  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(undefined);
    setSelection(undefined);
    setStatus(undefined);
    setResults([]);

    if (!window.navigator.onLine) {
      setMessage("You’re offline. Reconnect before looking up a book.");
      return;
    }

    if (mode === "isbn" && !isValidIsbn(query)) {
      setMessage("Enter a valid ISBN-10 or ISBN-13.");
      return;
    }
    if (mode !== "isbn" && query.trim().length < 2) {
      setMessage("Enter at least two characters to search.");
      return;
    }

    setIsSearching(true);
    try {
      const endpoint = mode === "isbn"
        ? `/api/books/lookup?isbn=${encodeURIComponent(query)}`
        : `/api/books/search?field=${mode}&query=${encodeURIComponent(query)}`;
      const response = await fetch(endpoint);
      const payload = await response.json() as VerifiedBookMetadata & { results?: VerifiedBookSearchResult[]; error?: string };
      if (!response.ok) {
        setMessage(payload.error ?? "We couldn’t look up that book. Nothing was added. Try again.");
        return;
      }
      if (mode === "isbn") {
        setSelection({ kind: "isbn", book: payload });
        return;
      }
      const nextResults = payload.results ?? [];
      setResults(nextResults);
      if (nextResults.length === 0) setMessage("No books matched. Try a fuller title or author name.");
    } catch {
      setMessage("We couldn’t look up that book. Nothing was added. Try again.");
    } finally {
      setIsSearching(false);
    }
  }

  async function save() {
    if (selection === undefined || status === undefined) return;
    if (!window.navigator.onLine) {
      setMessage("You’re offline. Reconnect before adding this book.");
      return;
    }
    const payload = selection.kind === "isbn"
      ? { selection: "isbn", isbn: selection.book.isbn, shelfStatus: status }
      : selection.kind === "work"
        ? { selection: "work", workRecordId: selection.book.workRecordId, shelfStatus: status }
        : { selection: "edition", editionRecordId: selection.edition.editionRecordId, shelfStatus: status };

    setIsSaving(true);
    setMessage(undefined);
    try {
      const response = await fetch("/api/family-books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const responsePayload = await response.json() as SaveFamilyBookResult & { error?: string };
      if (!response.ok) {
        setMessage(responsePayload.error ?? "Nothing was added. Try again.");
        return;
      }
      await onAdded(responsePayload.wasAlreadyOnShelf
        ? "Already on your shelf. Its status is up to date."
        : "Book added to your shelf.");
    } catch {
      setMessage("We couldn’t save this book. Nothing was changed.");
    } finally {
      setIsSaving(false);
    }
  }

  const book = selection === undefined ? undefined : selectedWork(selection);

  return (
    <BookkinModal onClose={onClose} title="Add a book">
      <div className="bk-modal-body">
        <div aria-label="Add method" className="bk-tabs" role="tablist">
          {(["title", "author", "isbn"] as const).map((option) => (
            <button
              aria-selected={mode === option}
              className="bk-tab"
              key={option}
              onClick={() => chooseMode(option)}
              role="tab"
              type="button"
            >
              {option === "isbn" ? "ISBN" : option === "title" ? "Title" : "Author"}
            </button>
          ))}
        </div>

        <form className="bk-lookup-form" onSubmit={search}>
          <label htmlFor="add-book-query">
            {mode === "isbn" ? "ISBN-10 or ISBN-13" : mode === "title" ? "Book title" : "Author name"}
          </label>
          <div className="bk-inline-field">
            <input
              autoComplete="off"
              id="add-book-query"
              inputMode={mode === "isbn" ? "numeric" : "search"}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={mode === "isbn" ? "9780670012701" : mode === "title" ? "The Snowy Day" : "Ezra Jack Keats"}
              value={query}
            />
            <button disabled={isSearching || isSaving} type="submit">
              {isSearching ? "Searching…" : "Search"}
            </button>
          </div>
        </form>

        {results.length > 0 ? (
          <div aria-label="Book matches" className="bk-search-results" role="list">
            {results.map((result) => (
              <article className="bk-search-result" key={result.workRecordId} role="listitem">
                <BookCover compact title={result.title} url={result.coverSmallUrl} />
                <div>
                  <strong>{result.title}</strong>
                  <span>{result.authors.length > 0 ? result.authors.join(", ") : "Author not listed"}</span>
                </div>
                <div className="bk-result-actions">
                  <button onClick={() => { setSelection({ kind: "work", book: result }); setStatus(undefined); }} type="button">Choose</button>
                  {result.matchingEdition === undefined ? null : (
                    <button onClick={() => { setSelection({ kind: "edition", book: result, edition: result.matchingEdition as NonNullable<VerifiedBookSearchResult["matchingEdition"]> }); setStatus(undefined); }} type="button">Use edition</button>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : null}

        {book === undefined ? null : (
          <section aria-labelledby="selected-book-title" className="bk-selected-book">
            <BookCover compact title={book.title} url={book.coverSmallUrl} />
            <div>
              <h3 id="selected-book-title">{book.title}</h3>
              <p>{book.authors.length > 0 ? book.authors.join(", ") : "Author not listed"}</p>
            </div>
          </section>
        )}

        {book === undefined ? null : (
          <fieldset className="bk-status-fieldset">
            <legend>Where does this book belong?</legend>
            <div className="bk-pill-row">
              {statusOptions.map((option) => (
                <button
                  aria-pressed={status === option.value}
                  className="bk-pill-button"
                  key={option.value}
                  onClick={() => setStatus(option.value)}
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </div>
          </fieldset>
        )}

        {message === undefined ? null : <p className="bk-inline-message" role="alert">{message}</p>}
      </div>
      <footer className="bk-modal-actions">
        <button className="bk-button-secondary" onClick={onClose} type="button">Cancel</button>
        <button className="bk-button-primary" disabled={selection === undefined || status === undefined || isSaving} onClick={save} type="button">
          {isSaving ? "Adding…" : "Add to shelf"}
        </button>
      </footer>
    </BookkinModal>
  );
}
