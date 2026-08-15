"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { FamilyBookHistory, ReadingHistoryEvent } from "@/application/reading/reading-history";
import { clearReturnContext, readReturnContext, saveReturnContext } from "@/components/contextual-return";

function eventLabel(eventType: ReadingHistoryEvent["eventType"]): string {
  return { finished: "Finished", reread: "Read again", stopped: "Stopped reading", rejected: "Decided not to read" }[eventType];
}

function readable(value: string): string {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function HouseholdHistory() {
  const [items, setItems] = useState<FamilyBookHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [restoreTarget, setRestoreTarget] = useState<{ triggerId: string; scrollY: number }>();

  useEffect(() => {
    const restoreTimeoutId = window.setTimeout(() => {
      const context = readReturnContext();
      if (context?.origin === "history") setRestoreTarget({ triggerId: context.triggerId, scrollY: context.scrollY });
    }, 0);
    async function load() {
      try {
        const response = await fetch("/api/reading-history");
        const payload = await response.json() as { items?: FamilyBookHistory[]; error?: string };
        if (!response.ok) {
          setError(payload.error ?? "Your reading history could not load. Try again.");
          return;
        }
        setItems(payload.items ?? []);
      } catch {
        setError("Your reading history could not load. Try again.");
      } finally {
        setIsLoading(false);
      }
    }
    const loadTimeoutId = window.setTimeout(() => { void load(); }, 0);
    return () => { window.clearTimeout(restoreTimeoutId); window.clearTimeout(loadTimeoutId); };
  }, []);

  useEffect(() => {
    if (isLoading || restoreTarget === undefined) return;
    requestAnimationFrame(() => {
      document.getElementById(restoreTarget.triggerId)?.focus({ preventScroll: true });
      window.scrollTo({ top: restoreTarget.scrollY, behavior: "auto" });
      clearReturnContext();
      setRestoreTarget(undefined);
    });
  }, [isLoading, items, restoreTarget]);

  return (
    <div className="bk-page">
      <section aria-labelledby="history-title">
        <h1 className="bk-page-title" id="history-title">Your reading history</h1>
        {isLoading ? <p aria-live="polite" className="bk-page-state">Loading reading history…</p> : null}
        {error === undefined ? null : <p className="bk-page-state bk-page-error" role="alert">{error}</p>}
        {!isLoading && error === undefined && items.length === 0 ? <p className="bk-page-state">No reading moments yet.</p> : null}
        <div className="bk-household-history">
          {items.map((history) => {
            const latest = history.events[0];
            const triggerId = `history-book-${history.id}`;
            return (
              <Link
                href={`/books/${encodeURIComponent(history.id)}?from=history`}
                id={triggerId}
                key={history.id}
                onClick={() => saveReturnContext({ origin: "history", bookId: history.id, scrollY: window.scrollY, triggerId })}
              >
                <span><strong>{history.title}</strong><small>{history.authors.length > 0 ? history.authors.join(", ") : "Author not listed"}</small></span>
                <span className="bk-history-snapshot">
                  <span>{eventLabel(latest.eventType)}</span>
                  {latest.childReaction === undefined ? null : <span className="bk-role-child">Child · {readable(latest.childReaction)}</span>}
                  {latest.parentReaction === undefined ? null : <span className="bk-role-caregiver">Caregiver · {readable(latest.parentReaction)}</span>}
                </span>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
