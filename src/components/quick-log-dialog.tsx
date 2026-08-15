"use client";

import { useMemo, useState } from "react";
import type { FamilyShelfItem } from "@/application/family-books/family-shelf";
import type { QuickReadingLog } from "@/application/reading/reading-history";
import { BookCover } from "@/components/book-cover";
import { BookkinModal } from "@/components/bookkin-modal";

type QuickEvent = QuickReadingLog["eventType"];
type ChildReaction = NonNullable<QuickReadingLog["childReaction"]>;
type CaregiverReaction = NonNullable<QuickReadingLog["parentReaction"]>;
type StopReason = NonNullable<QuickReadingLog["stopReason"]>;

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

export function QuickLogDialog({
  shelf,
  onClose,
  onSaved,
  onRequestAdd,
}: {
  shelf: FamilyShelfItem[];
  onClose: () => void;
  onSaved: (bookTitle: string) => Promise<void>;
  onRequestAdd: () => void;
}) {
  const [query, setQuery] = useState("");
  const [bookId, setBookId] = useState<string>();
  const [eventType, setEventType] = useState<QuickEvent>();
  const [childReaction, setChildReaction] = useState<ChildReaction>();
  const [caregiverReaction, setCaregiverReaction] = useState<CaregiverReaction>();
  const [stopReason, setStopReason] = useState<StopReason>();
  const [showReactions, setShowReactions] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string>();

  const matchingBooks = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const recent = shelf.filter((book) => book.lastReadAt !== undefined)
      .sort((left, right) => Date.parse(right.lastReadAt as string) - Date.parse(left.lastReadAt as string));
    const candidates = normalized.length === 0
      ? (recent.length > 0 ? recent : shelf).slice(0, 3)
      : shelf.filter((book) => `${book.title} ${book.authors.join(" ")}`.toLowerCase().includes(normalized));
    return candidates;
  }, [query, shelf]);

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

  return (
    <BookkinModal onClose={onClose} title="Log a read">
      <div className="bk-modal-body bk-quick-log-body">
        <label className="bk-field-label" htmlFor="quick-log-search">Book</label>
        <input
          autoComplete="off"
          className="bk-field"
          id="quick-log-search"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search your shelf"
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
                    <button
                      aria-pressed={childReaction === reaction.value}
                      className="bk-reaction-button"
                      key={reaction.value}
                      onClick={() => setChildReaction((current) => current === reaction.value ? undefined : reaction.value)}
                      type="button"
                    >
                      {reaction.label}
                    </button>
                  ))}
                </div>
              </fieldset>
              <fieldset>
                <legend>Caregiver</legend>
                <div className="bk-reaction-row">
                  {caregiverReactions.map((reaction) => (
                    <button
                      aria-pressed={caregiverReaction === reaction.value}
                      className="bk-reaction-button"
                      key={reaction.value}
                      onClick={() => setCaregiverReaction((current) => current === reaction.value ? undefined : reaction.value)}
                      type="button"
                    >
                      {reaction.label}
                    </button>
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
        <button className="bk-button-primary" disabled={bookId === undefined || eventType === undefined || isSaving} onClick={save} type="button">
          {isSaving ? "Saving…" : "Save reading moment"}
        </button>
      </footer>
    </BookkinModal>
  );
}
