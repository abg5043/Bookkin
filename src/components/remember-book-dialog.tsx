"use client";

import { useState } from "react";
import { BookCover } from "@/components/book-cover";
import { BookkinModal } from "@/components/bookkin-modal";

type SearchResult = {
  title: string;
  authors: string[];
  coverSmallUrl?: string;
  workRecordId: string;
  firstPublishYear?: number;
};

type SubjectType = "child" | "caregiver" | "family_reference";

const subjectOptions: Array<{ value: SubjectType; label: string }> = [
  { value: "child", label: "Worked for my child" },
  { value: "caregiver", label: "Worked for me" },
  { value: "family_reference", label: "Worked for family reading time" },
];

export function RememberBookDialog({
  childId,
  readerLabel,
  onClose,
  onRemembered,
}: {
  childId: string;
  readerLabel: string;
  onClose: () => void;
  onRemembered: () => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>();
  const [isSearching, setIsSearching] = useState(false);
  const [selected, setSelected] = useState<SearchResult>();
  const [subjectType, setSubjectType] = useState<SubjectType>();
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string>();

  async function runSearch() {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setMessage("Enter at least two characters.");
      return;
    }
    setIsSearching(true);
    setMessage(undefined);
    try {
      const response = await fetch(`/api/books/search?query=${encodeURIComponent(trimmed)}&field=title`);
      if (!response.ok) {
        const body = await response.json().catch(() => undefined) as { error?: string } | undefined;
        setMessage(body?.error ?? "We could not search right now. Nothing was saved.");
        return;
      }
      setResults((await response.json() as { results: SearchResult[] }).results);
    } catch {
      setMessage("We could not search right now. Nothing was saved.");
    } finally {
      setIsSearching(false);
    }
  }

  async function save() {
    if (selected === undefined || subjectType === undefined) return;
    setIsSaving(true);
    setMessage(undefined);
    try {
      const response = await fetch(`/api/children/${childId}/remembered-books`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workRecordId: selected.workRecordId,
          subjectType,
          declaredAt: new Date().toISOString(),
          sourceVersion: "reading-profile-v1",
          clientMutationId: window.crypto.randomUUID(),
        }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => undefined) as { error?: string } | undefined;
        setMessage(body?.error ?? "That book wasn’t saved. Try again.");
        return;
      }
      await onRemembered();
      onClose();
    } catch {
      setMessage("That book wasn’t saved. Try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <BookkinModal onClose={onClose} title="Add a book that worked">
      <div className="bk-modal-body">
        <p className="bk-support">
          Bookkin remembers this for {readerLabel}’s future recommendations. It won’t be added to your shelf
          or reading history.
        </p>

        {message !== undefined ? <div className="bk-inline-message" role="alert">{message}</div> : null}

        {selected === undefined ? (
          <>
            <div className="bk-interest-form">
              <label className="sr-only" htmlFor="remember-book-search">Book title</label>
              <input
                id="remember-book-search"
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void runSearch();
                  }
                }}
                placeholder="Search by title"
                value={query}
              />
              <button className="bk-button-secondary" disabled={isSearching} onClick={() => { void runSearch(); }} type="button">
                {isSearching ? "Searching…" : "Search"}
              </button>
            </div>

            {results !== undefined && results.length === 0 ? (
              <p className="bk-support" style={{ marginTop: "0.8rem" }}>No verified books matched that title.</p>
            ) : null}

            {results?.map((result) => (
              <button
                className="bk-book-row"
                key={result.workRecordId}
                onClick={() => { setSelected(result); setMessage(undefined); }}
                style={{ width: "100%", textAlign: "left", background: "none", border: "none", cursor: "pointer" }}
                type="button"
              >
                <BookCover compact title={result.title} url={result.coverSmallUrl} />
                <span>
                  <strong>{result.title}</strong>
                  <small>{result.authors.length > 0 ? result.authors.join(", ") : "Author unavailable"}</small>
                </span>
              </button>
            ))}
          </>
        ) : (
          <>
            <div className="bk-book-row">
              <BookCover compact title={selected.title} url={selected.coverSmallUrl} />
              <span>
                <strong>{selected.title}</strong>
                <small>{selected.authors.length > 0 ? selected.authors.join(", ") : "Author unavailable"}</small>
              </span>
              <button className="bk-button-secondary" onClick={() => setSelected(undefined)} type="button">
                Choose a different book
              </button>
            </div>

            <fieldset className="bk-status-fieldset">
              <legend>Who did it work for? <span className="bk-required">Required</span></legend>
              <div className="bk-choice-row">
                {subjectOptions.map((option) => (
                  <button
                    aria-pressed={subjectType === option.value}
                    className="bk-choice"
                    key={option.value}
                    onClick={() => setSubjectType(option.value)}
                    type="button"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="bk-save-row">
              <button
                className="bk-button-primary"
                disabled={subjectType === undefined || isSaving}
                onClick={() => { void save(); }}
                type="button"
              >
                {isSaving ? "Saving…" : "Remember this book"}
              </button>
            </div>
          </>
        )}
      </div>
    </BookkinModal>
  );
}
