"use client";

import { useMemo, useRef, useState } from "react";
import type { FamilyShelfItem } from "@/application/family-books/family-shelf";
import type { QuickReadingLog } from "@/application/reading/reading-history";
import { BookCover } from "@/components/book-cover";
import { BookkinModal } from "@/components/bookkin-modal";

type QuickEvent = QuickReadingLog["eventType"];
type ChildReaction = NonNullable<QuickReadingLog["childReaction"]>;
type CaregiverReaction = NonNullable<QuickReadingLog["parentReaction"]>;
type StopReason = NonNullable<QuickReadingLog["stopReason"]>;
type Receipt = {
  eventId: string;
  bookTitle: string;
  coverUrl?: string;
  state: "saved" | "undone";
  undoMutationId: string;
  undoDeclaredAt: string;
};

const events: Array<{ value: QuickEvent; label: string }> = [
  { value: "finished", label: "Finished" },
  { value: "reread", label: "Read again" },
  { value: "stopped", label: "Stopped reading" },
  { value: "rejected", label: "Decided not to read" },
];

const childReactions: Array<{ value: ChildReaction; label: string }> = [
  { value: "love", label: "Love" },
  { value: "like", label: "Like" },
  { value: "not_for_me", label: "Not for me" },
];

const caregiverReactions: Array<{ value: CaregiverReaction; label: string }> = [
  { value: "love", label: "Love" },
  { value: "like", label: "Like" },
  { value: "dislike", label: "Dislike" },
];

const stopReasons: Array<{ value: StopReason; label: string }> = [
  { value: "too_long", label: "Too long" },
  { value: "too_scary", label: "Too scary" },
  { value: "not_interested", label: "Not interested" },
  { value: "wrong_timing", label: "Wrong timing" },
  { value: "other", label: "Other" },
];

function statusLabel(item: FamilyShelfItem): string {
  if (item.shelfStatus === undefined) return "Status needs review";
  return item.shelfStatus[0].toUpperCase() + item.shelfStatus.slice(1);
}

function lastReadLabel(value: string): string {
  return `Last read ${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(value))}`;
}

export function QuickLogDialog({
  shelf,
  onClose,
  onDataChanged,
  onSaved,
  onRequestAdd,
}: {
  shelf: FamilyShelfItem[];
  onClose: () => void;
  onDataChanged: () => Promise<void>;
  onSaved: (bookTitle: string) => Promise<void>;
  onRequestAdd: () => void;
}) {
  const recentBooks = useMemo(() => shelf
    .filter((book): book is FamilyShelfItem & { lastReadAt: string } => book.lastReadAt !== undefined)
    .sort((left, right) => Date.parse(right.lastReadAt) - Date.parse(left.lastReadAt))
    .slice(0, 3), [shelf]);
  const [view, setView] = useState<"recent" | "form">(() => recentBooks.length > 0 ? "recent" : "form");
  const [query, setQuery] = useState("");
  const [bookId, setBookId] = useState<string>();
  const [eventType, setEventType] = useState<QuickEvent>();
  const [childReaction, setChildReaction] = useState<ChildReaction>();
  const [caregiverReaction, setCaregiverReaction] = useState<CaregiverReaction>();
  const [stopReason, setStopReason] = useState<StopReason>();
  const [showReactions, setShowReactions] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [directSavingId, setDirectSavingId] = useState<string>();
  const [isUndoing, setIsUndoing] = useState(false);
  const [message, setMessage] = useState<string>();
  const [receipt, setReceipt] = useState<Receipt>();
  const rereadMutationIds = useRef(new Map<string, string>());
  const searchRef = useRef<HTMLInputElement>(null);
  const firstRereadRef = useRef<HTMLButtonElement>(null);

  const matchingBooks = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return normalized.length === 0
      ? (recentBooks.length > 0 ? recentBooks : shelf).slice(0, 3)
      : shelf.filter((book) => `${book.title} ${book.authors.join(" ")}`.toLowerCase().includes(normalized));
  }, [query, recentBooks, shelf]);

  async function saveReread(book: FamilyShelfItem) {
    if (!window.navigator.onLine) {
      setMessage("You’re offline. Reconnect before saving this reading moment.");
      return;
    }
    const clientMutationId = rereadMutationIds.current.get(book.id) ?? window.crypto.randomUUID();
    rereadMutationIds.current.set(book.id, clientMutationId);
    setDirectSavingId(book.id);
    setMessage(undefined);
    try {
      const response = await fetch(`/api/family-books/${encodeURIComponent(book.id)}/reading-events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventType: "reread", clientMutationId }),
      });
      const payload = await response.json() as { event?: { id: string }; error?: string };
      if (!response.ok || payload.event === undefined) {
        setMessage(payload.error ?? "That reread was not saved. Try again.");
        return;
      }
      rereadMutationIds.current.delete(book.id);
      setReceipt({
        eventId: payload.event.id,
        bookTitle: book.title,
        coverUrl: book.coverUrl,
        state: "saved",
        undoMutationId: window.crypto.randomUUID(),
        undoDeclaredAt: new Date().toISOString(),
      });
      await onDataChanged();
    } catch {
      setMessage("That reread was not saved. Try again.");
    } finally {
      setDirectSavingId(undefined);
    }
  }

  async function undoReread() {
    if (receipt === undefined || receipt.state !== "saved") return;
    if (!window.navigator.onLine) {
      setMessage("You’re offline. Reconnect before undoing this reading moment.");
      return;
    }
    setIsUndoing(true);
    setMessage(undefined);
    try {
      const response = await fetch(`/api/reading-events/${encodeURIComponent(receipt.eventId)}/retraction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientMutationId: receipt.undoMutationId, declaredAt: receipt.undoDeclaredAt }),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) {
        setMessage(payload.error ?? "That reading moment could not be undone. Try again.");
        return;
      }
      setReceipt((current) => current === undefined ? undefined : { ...current, state: "undone" });
      await onDataChanged();
      window.requestAnimationFrame(() => firstRereadRef.current?.focus());
    } catch {
      setMessage("That reading moment could not be undone. Try again.");
    } finally {
      setIsUndoing(false);
    }
  }

  async function save() {
    if (bookId === undefined || eventType === undefined) return;
    const selectedBook = shelf.find((book) => book.id === bookId);
    if (selectedBook === undefined) return;
    if (!window.navigator.onLine) {
      setMessage("You’re offline. Reconnect before saving this reading moment.");
      return;
    }
    setIsSaving(true);
    setMessage(undefined);
    try {
      const response = await fetch(`/api/family-books/${encodeURIComponent(bookId)}/reading-events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventType, childReaction, parentReaction: caregiverReaction, stopReason }),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) {
        setMessage(payload.error ?? "That reading moment was not saved. Your choices are still here.");
        return;
      }
      await onSaved(selectedBook.title);
    } catch {
      setMessage("That reading moment was not saved. Your choices are still here. Try again.");
    } finally {
      setIsSaving(false);
    }
  }

  function showForm() {
    setMessage(undefined);
    setView("form");
    window.requestAnimationFrame(() => searchRef.current?.focus());
  }

  function showRecent() {
    setMessage(undefined);
    setView("recent");
    window.requestAnimationFrame(() => firstRereadRef.current?.focus());
  }

  return (
    <BookkinModal onClose={onClose} title="Log a read">
      {view === "recent" ? (
        <>
          <div className="bk-modal-body bk-quick-log-body">
            <h3 className="bk-quick-log-heading">Recent books</h3>
            <div aria-label="Recent books" className="bk-reread-list">
              {recentBooks.map((book, index) => (
                <div className="bk-reread-row" key={book.id}>
                  <BookCover compact title={book.title} url={book.coverUrl} />
                  <span className="bk-reread-copy">
                    <strong>{book.title}</strong>
                    <small>{lastReadLabel(book.lastReadAt)}</small>
                  </span>
                  <button
                    aria-label={directSavingId === book.id ? `Saving reread for ${book.title}` : `Read ${book.title} again`}
                    disabled={directSavingId !== undefined || isUndoing}
                    onClick={() => void saveReread(book)}
                    ref={index === 0 ? firstRereadRef : undefined}
                    type="button"
                  >
                    {directSavingId === book.id ? "Saving…" : "Read again"}
                  </button>
                </div>
              ))}
            </div>

            {receipt === undefined ? null : (
              <div className={`bk-reread-receipt ${receipt.state === "undone" ? "is-undone" : ""}`}>
                <BookCover compact title={receipt.bookTitle} url={receipt.coverUrl} />
                <span role="status">
                  <strong>{receipt.state === "saved" ? "Reread saved" : "Reread removed"}</strong>
                  <small>{receipt.bookTitle}</small>
                </span>
                {receipt.state === "saved" ? <button aria-label={`Undo reread for ${receipt.bookTitle}`} disabled={isUndoing} onClick={() => void undoReread()} type="button">{isUndoing ? "Undoing…" : "Undo"}</button> : null}
              </div>
            )}

            {message === undefined ? null : <p className="bk-inline-message" role="alert">{message}</p>}
          </div>
          <footer className="bk-modal-actions bk-quick-log-actions">
            <button className="bk-button-secondary" onClick={showForm} type="button">Log a different book or outcome</button>
          </footer>
        </>
      ) : (
        <>
          <div className="bk-modal-body bk-quick-log-body">
            {recentBooks.length > 0 ? <button className="bk-quick-log-back" onClick={showRecent} type="button">← Recent books</button> : null}
            <label className="bk-field-label" htmlFor="quick-log-search">Book</label>
            <input
              autoComplete="off"
              className="bk-field"
              id="quick-log-search"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search your shelf"
              ref={searchRef}
              type="search"
              value={query}
            />

            {shelf.length === 0 ? (
              <div className="bk-empty-inline">
                <strong>Your shelf is ready for its first book.</strong>
                <button onClick={onRequestAdd} type="button">Add a book</button>
              </div>
            ) : matchingBooks.length === 0 ? (
              <div className="bk-empty-inline">
                <strong>No shelf books match.</strong>
                <button onClick={() => setQuery("")} type="button">Clear search</button>
              </div>
            ) : (
              <div aria-label={query.trim() === "" ? "Recent shelf books" : "Matching shelf books"} className="bk-book-picker" role="group">
                {matchingBooks.map((book) => (
                  <button
                    aria-pressed={bookId === book.id}
                    className="bk-book-pick"
                    key={book.id}
                    onClick={() => setBookId(book.id)}
                    type="button"
                  >
                    <BookCover compact title={book.title} url={book.coverUrl} />
                    <span className="bk-book-pick-copy">
                      <strong>{book.title}</strong>
                      <small>{statusLabel(book)}</small>
                    </span>
                  </button>
                ))}
              </div>
            )}

            <fieldset className="bk-event-fieldset">
              <legend>What happened?</legend>
              <div className="bk-event-grid">
                {events.map((event) => (
                  <button
                    aria-pressed={eventType === event.value}
                    className="bk-event-button"
                    key={event.value}
                    onClick={() => { setEventType(event.value); if (event.value !== "stopped" && event.value !== "rejected") setStopReason(undefined); }}
                    type="button"
                  >
                    {event.label}
                  </button>
                ))}
              </div>
            </fieldset>

            {eventType === "stopped" || eventType === "rejected" ? (
              <fieldset className="bk-stop-fieldset">
                <legend>Why? <span>(optional)</span></legend>
                <div className="bk-pill-row">
                  {stopReasons.map((reason) => (
                    <button aria-pressed={stopReason === reason.value} className="bk-pill-button" key={reason.value} onClick={() => setStopReason((current) => current === reason.value ? undefined : reason.value)} type="button">{reason.label}</button>
                  ))}
                </div>
              </fieldset>
            ) : null}

            <div className="bk-optional-reactions">
              <button aria-expanded={showReactions} className="bk-reaction-toggle" onClick={() => setShowReactions((current) => !current)} type="button">
                Optional reactions
              </button>
              {showReactions ? (
                <div className="bk-reaction-groups">
                  <fieldset>
                    <legend>Child</legend>
                    <div className="bk-reaction-row">
                      {childReactions.map((reaction) => (
                        <button aria-pressed={childReaction === reaction.value} className="bk-reaction-button" key={reaction.value} onClick={() => setChildReaction((current) => current === reaction.value ? undefined : reaction.value)} type="button">{reaction.label}</button>
                      ))}
                    </div>
                  </fieldset>
                  <fieldset>
                    <legend>Caregiver</legend>
                    <div className="bk-reaction-row">
                      {caregiverReactions.map((reaction) => (
                        <button aria-pressed={caregiverReaction === reaction.value} className="bk-reaction-button" key={reaction.value} onClick={() => setCaregiverReaction((current) => current === reaction.value ? undefined : reaction.value)} type="button">{reaction.label}</button>
                      ))}
                    </div>
                  </fieldset>
                </div>
              ) : null}
            </div>

            {message === undefined ? null : <p className="bk-inline-message" role="alert">{message}</p>}
          </div>
          <footer className="bk-modal-actions">
            <button className="bk-button-secondary" onClick={onClose} type="button">Cancel</button>
            <button className="bk-button-primary" disabled={bookId === undefined || eventType === undefined || isSaving} onClick={() => void save()} type="button">
              {isSaving ? "Saving…" : "Save reading moment"}
            </button>
          </footer>
        </>
      )}
    </BookkinModal>
  );
}
