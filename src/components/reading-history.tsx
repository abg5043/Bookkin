"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { FamilyBookHistory, ReadingHistoryEvent } from "@/application/reading/reading-history";
import { BookCover } from "@/components/book-cover";
import { readReturnContext, type ReturnOrigin } from "@/components/contextual-return";

function eventLabel(eventType: ReadingHistoryEvent["eventType"]): string {
  return { finished: "Finished", reread: "Read again", stopped: "Stopped reading", rejected: "Decided not to read" }[eventType];
}

function readable(value: string): string {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function shelfStatusLabel(status: string | undefined): string {
  return status === undefined ? "Status needs review" : readable(status);
}

function HistoryMoment({ event, newest }: { event: ReadingHistoryEvent; newest: boolean }) {
  const date = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(event.occurredAt));
  return (
    <article className="bk-history-moment">
      <div className="bk-history-moment-head"><span>{newest ? "Most recent read" : date}</span><strong>{eventLabel(event.eventType)}</strong></div>
      {event.stopReason === undefined ? null : <p className="bk-stop-reason">Reason: {readable(event.stopReason)}</p>}
      <div className="bk-role-reactions">
        {event.childReaction === undefined ? null : <span className="bk-role-pill bk-role-child">Child <strong>· {readable(event.childReaction)}</strong></span>}
        {event.parentReaction === undefined ? null : <span className="bk-role-pill bk-role-caregiver">Caregiver <strong>· {readable(event.parentReaction)}</strong></span>}
      </div>
    </article>
  );
}

export function ReadingHistory({ familyBookId }: { familyBookId: string }) {
  const router = useRouter();
  const [history, setHistory] = useState<FamilyBookHistory>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [origin, setOrigin] = useState<ReturnOrigin>();

  const refreshHistory = useCallback(async () => {
    setError(undefined);
    try {
      const response = await fetch(`/api/family-books/${encodeURIComponent(familyBookId)}`);
      const payload = await response.json() as FamilyBookHistory & { error?: string };
      if (!response.ok) {
        setError(payload.error ?? "We could not open this book history.");
        return;
      }
      setHistory(payload);
    } catch {
      setError("We could not open this book history. Try again.");
    } finally {
      setIsLoading(false);
    }
  }, [familyBookId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const context = readReturnContext();
      if (context?.bookId === familyBookId) setOrigin(context.origin);
      void refreshHistory();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [familyBookId, refreshHistory]);

  function goBack() {
    if (origin !== undefined) router.back();
    else router.push("/history");
  }

  return (
    <div className="bk-page">
      <section aria-labelledby="book-history-title" className="bk-book-history-view">
        <button className="bk-context-back" onClick={goBack} type="button">Back to {origin === "shelf" ? "Shelf" : "History"}</button>
        {isLoading ? <p aria-live="polite" className="bk-page-state">Loading reading history…</p> : null}
        {error === undefined ? null : <p className="bk-page-state bk-page-error" role="alert">{error}</p>}
        {history === undefined ? null : (
          <>
            <div className="bk-detail-heading">
              <BookCover title={history.title} url={history.coverUrl} />
              <div>
                <h1 id="book-history-title">{history.title}</h1>
                <p>{history.authors.length > 0 ? history.authors.join(", ") : "Author not listed"}</p>
                <span className="bk-status-pill">{shelfStatusLabel(history.shelfStatus)}</span>
              </div>
            </div>
            <div className="bk-history-events">
              {history.events.length === 0 ? <p className="bk-page-state">No reading moments yet.</p> : history.events.map((event, index) => <HistoryMoment event={event} key={event.id} newest={index === 0} />)}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
