"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { ShelfStatus } from "@/application/family-books/family-shelf";
import { BookCover } from "@/components/book-cover";
import { clearReturnContext, readReturnContext, saveReturnContext } from "@/components/contextual-return";
import { useBookkinShell } from "@/components/bookkin-shell";

const filters: Array<{ value: "all" | ShelfStatus; label: string }> = [
  { value: "all", label: "All" },
  { value: "owned", label: "Owned" },
  { value: "borrowed", label: "Borrowed" },
  { value: "wishlist", label: "Wishlist" },
];

function statusLabel(status: ShelfStatus | undefined): string {
  if (status === undefined) return "Status needs review";
  return status[0].toUpperCase() + status.slice(1);
}

export function FamilyShelf() {
  const { shelf, isShelfLoading, shelfError, openAdd } = useBookkinShell();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | ShelfStatus>("all");
  const [restoreTarget, setRestoreTarget] = useState<{ triggerId: string; scrollY: number }>();

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const context = readReturnContext();
      if (context?.origin !== "shelf") return;
      setSearch(context.shelfSearch ?? "");
      if (filters.some((option) => option.value === context.shelfFilter)) setFilter(context.shelfFilter as "all" | ShelfStatus);
      setRestoreTarget({ triggerId: context.triggerId, scrollY: context.scrollY });
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (isShelfLoading || restoreTarget === undefined) return;
    requestAnimationFrame(() => {
      document.getElementById(restoreTarget.triggerId)?.focus({ preventScroll: true });
      window.scrollTo({ top: restoreTarget.scrollY, behavior: "auto" });
      clearReturnContext();
      setRestoreTarget(undefined);
    });
  }, [isShelfLoading, restoreTarget, shelf]);

  const visibleShelf = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    return shelf.filter((book) => {
      const matchesText = normalized === "" || `${book.title} ${book.authors.join(" ")}`.toLowerCase().includes(normalized);
      return matchesText && (filter === "all" || book.shelfStatus === filter);
    });
  }, [filter, search, shelf]);

  return (
    <div className="bk-page">
      <section aria-labelledby="shelf-title">
        <p className="bk-eyebrow">Your family shelf</p>
        <h1 className="bk-page-title" id="shelf-title">Books you already know</h1>
        <p className="bk-page-intro">Find a familiar cover, log what happened, or add the next book.</p>

        <div className="bk-shelf-tools">
          <label className="bk-search-field">
            <span className="sr-only">Search your shelf</span>
            <span aria-hidden="true" className="bk-search-icon" />
            <input onChange={(event) => setSearch(event.target.value)} placeholder="Search title or author" type="search" value={search} />
          </label>
          <div aria-label="Shelf status" className="bk-filter-row" role="group">
            {filters.map((option) => <button aria-pressed={filter === option.value} key={option.value} onClick={() => setFilter(option.value)} type="button">{option.label}</button>)}
          </div>
        </div>

        <div className="bk-section-heading">
          <h2>Your shelf</h2>
          {!isShelfLoading && shelfError === undefined ? <span>{visibleShelf.length === 1 ? "One book" : `${visibleShelf.length} books`}</span> : null}
        </div>

        {isShelfLoading ? <p aria-live="polite" className="bk-page-state">Loading your shelf…</p> : null}
        {shelfError === undefined ? null : <p className="bk-page-state bk-page-error" role="alert">{shelfError}</p>}
        {!isShelfLoading && shelfError === undefined && visibleShelf.length === 0 ? (
          <div className="bk-page-state">
            <strong>{shelf.length === 0 ? "Your shelf is ready for its first book." : "No shelf books match."}</strong>
            {shelf.length === 0 ? <button onClick={openAdd} type="button">Add a book</button> : <button onClick={() => { setSearch(""); setFilter("all"); }} type="button">Clear search and filters</button>}
          </div>
        ) : null}
        {!isShelfLoading && shelfError === undefined && visibleShelf.length > 0 ? (
          <div className="bk-shelf-grid">
            {visibleShelf.map((book, index) => {
              const triggerId = `shelf-book-${book.id}`;
              return (
                <Link
                  className="bk-shelf-book"
                  href={`/books/${encodeURIComponent(book.id)}?from=shelf`}
                  id={triggerId}
                  key={book.id}
                  onClick={() => saveReturnContext({ origin: "shelf", bookId: book.id, scrollY: window.scrollY, triggerId, shelfSearch: search, shelfFilter: filter })}
                >
                  <BookCover priority={index < 4} title={book.title} url={book.coverUrl} />
                  <span className="bk-shelf-book-copy">
                    <strong>{book.title}</strong>
                    <small>{book.authors.length > 0 ? book.authors.join(", ") : "Author not listed"}</small>
                    <span>{statusLabel(book.shelfStatus)}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        ) : null}
      </section>
    </div>
  );
}
