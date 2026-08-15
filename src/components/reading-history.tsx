"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import type { FamilyBookHistory, QuickReadingLog, ReadingHistoryEvent } from "@/application/reading/reading-history";

type QuickEventType = QuickReadingLog["eventType"];
type StopReason = NonNullable<QuickReadingLog["stopReason"]>;

const eventOptions: Array<{ value: QuickEventType; label: string }> = [
  { value: "finished", label: "Finished" },
  { value: "reread", label: "Read again" },
  { value: "stopped", label: "Stopped" },
  { value: "rejected", label: "Rejected" },
];

const childReactionOptions: Array<{ value: NonNullable<QuickReadingLog["childReaction"]>; label: string }> = [
  { value: "love", label: "Love" },
  { value: "like", label: "Like" },
  { value: "not_for_me", label: "Not for me" },
];

const parentReactionOptions: Array<{ value: NonNullable<QuickReadingLog["parentReaction"]>; label: string }> = [
  { value: "love", label: "Love" },
  { value: "like", label: "Like" },
  { value: "dislike", label: "Dislike" },
];

const stopReasonOptions: Array<{ value: StopReason; label: string }> = [
  { value: "too_long", label: "Too long" },
  { value: "too_scary", label: "Too scary" },
  { value: "not_interested", label: "Not interested" },
  { value: "wrong_timing", label: "Wrong timing" },
  { value: "other", label: "Other" },
];

function readable(value: string): string {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function Cover({ title, url }: { title: string; url?: string }) {
  if (url === undefined) {
    return <div aria-label={`${title} cover unavailable`} className="cover-frame cover-placeholder flex aspect-[2/3] w-full items-end p-4 font-display text-xl leading-tight text-[var(--muted)]">{title}</div>;
  }

  return <Image alt={`${title} cover`} className="cover-frame aspect-[2/3] w-full object-cover" height={450} priority src={url} width={300} />;
}

function EventSummary({ event }: { event: ReadingHistoryEvent }) {
  const date = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(event.occurredAt));
  return <article className="border-l border-[var(--line)] pl-5"><p className="text-sm text-[var(--muted)]">{date}</p><h3 className="mt-1 font-display text-2xl tracking-[-0.035em]">{eventOptions.find((option) => option.value === event.eventType)?.label}</h3>{event.stopReason === undefined ? null : <p className="mt-2 text-sm text-[var(--muted)]">Reason: {readable(event.stopReason)}</p>}<div className="mt-3 flex flex-wrap gap-2">{event.childReaction === undefined ? null : <span className="rounded-full bg-[var(--paper-deep)] px-3 py-1 text-xs text-[var(--muted)]">Child: {readable(event.childReaction)}</span>}{event.parentReaction === undefined ? null : <span className="rounded-full bg-[var(--paper-deep)] px-3 py-1 text-xs text-[var(--muted)]">Parent: {readable(event.parentReaction)}</span>}</div></article>;
}

export function ReadingHistory({ familyBookId }: { familyBookId: string }) {
  const [history, setHistory] = useState<FamilyBookHistory | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const [eventType, setEventType] = useState<QuickEventType>("finished");
  const [childReaction, setChildReaction] = useState<QuickReadingLog["childReaction"]>();
  const [parentReaction, setParentReaction] = useState<QuickReadingLog["parentReaction"]>();
  const [stopReason, setStopReason] = useState<QuickReadingLog["stopReason"]>();
  const [isSaving, setIsSaving] = useState(false);
  const [confirmation, setConfirmation] = useState<string | undefined>();

  const refreshHistory = useCallback(async () => {
    try {
      const response = await fetch(`/api/family-books/${encodeURIComponent(familyBookId)}`);
      const payload = (await response.json()) as FamilyBookHistory & { error?: string };
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
      void refreshHistory();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [refreshHistory]);

  function selectEventType(nextEventType: QuickEventType) {
    setEventType(nextEventType);
    if (nextEventType !== "stopped" && nextEventType !== "rejected") {
      setStopReason(undefined);
    }
  }

  async function saveReadingMoment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(undefined);
    setConfirmation(undefined);
    try {
      const response = await fetch(`/api/family-books/${encodeURIComponent(familyBookId)}/reading-events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventType, childReaction, parentReaction, stopReason }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(payload.error ?? "We could not save this reading moment. Nothing was added.");
        return;
      }
      setConfirmation("Reading moment saved.");
      await refreshHistory();
    } catch {
      setError("We could not save this reading moment. Nothing was added.");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return <main className="app-shell min-h-screen bg-[var(--paper)] px-5 py-10 text-[var(--ink)] sm:px-10"><p aria-live="polite" className="mx-auto max-w-6xl text-[var(--muted)]">Opening reading history…</p></main>;
  }

  if (history === undefined) {
    return <main className="app-shell min-h-screen bg-[var(--paper)] px-5 py-10 text-[var(--ink)] sm:px-10"><div className="mx-auto max-w-2xl"><Link className="text-link text-sm text-[var(--accent)]" href="/">Back to shelf</Link><p className="mt-8 rounded-xl border border-[var(--accent)] bg-white/40 p-4" role="alert">{error ?? "This book could not be found."}</p></div></main>;
  }

  const showStopReasons = eventType === "stopped" || eventType === "rejected";
  return <main className="min-h-screen bg-[var(--paper)] px-5 py-6 text-[var(--ink)] sm:px-10 sm:py-10"><div className="mx-auto max-w-6xl"><header className="border-b border-[var(--line)] pb-5"><Link className="text-sm text-[var(--accent)] underline underline-offset-4" href="/">Back to shelf</Link><p className="mt-5 text-sm font-medium uppercase tracking-[0.15em] text-[var(--accent)]">Reading history</p><h1 className="mt-2 font-display text-4xl tracking-[-0.05em] sm:text-5xl">A small record of what happened.</h1></header><div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_23rem] lg:items-start"><section><div className="grid grid-cols-[7rem_1fr] gap-5 sm:grid-cols-[10rem_1fr]"><Cover title={history.title} url={history.coverUrl} /><div><p className="text-sm font-medium uppercase tracking-[0.14em] text-[var(--accent)]">Family book</p><h2 className="mt-2 font-display text-3xl leading-tight tracking-[-0.045em] sm:text-4xl">{history.title}</h2><p className="mt-2 text-[var(--muted)]">{history.authors.length > 0 ? history.authors.join(", ") : "Author not listed"}</p><div className="mt-4 flex flex-wrap gap-2"><span className="rounded-full bg-[var(--paper-deep)] px-3 py-1 text-xs text-[var(--muted)]">{history.shelfStatus === undefined ? "Status needs review" : readable(history.shelfStatus)}</span><span className="rounded-full bg-[var(--paper-deep)] px-3 py-1 text-xs text-[var(--muted)]">{history.rereadCount} {history.rereadCount === 1 ? "reread" : "rereads"}</span></div></div></div><section aria-labelledby="history-heading" className="mt-12 border-t border-[var(--line)] pt-7"><p className="text-sm font-medium uppercase tracking-[0.15em] text-[var(--accent)]">Activity</p><h2 className="mt-2 font-display text-3xl tracking-[-0.04em]" id="history-heading">What your family remembers.</h2>{history.events.length === 0 ? <p className="mt-6 rounded-2xl border border-dashed border-[var(--line)] bg-white/25 p-5 leading-7 text-[var(--muted)]">No reading moments yet. A finished read, reread, stop, or rejection will appear here without replacing the earlier story.</p> : <div className="mt-7 space-y-7">{history.events.map((event) => <EventSummary event={event} key={event.id} />)}</div>}</section></section><aside className="rounded-[1.75rem] border border-[var(--line)] bg-[var(--paper-deep)] p-5 shadow-[0_18px_40px_rgba(52,41,29,0.08)] sm:p-7 lg:sticky lg:top-8"><p className="text-sm font-medium uppercase tracking-[0.15em] text-[var(--accent)]">Quick log</p><h2 className="mt-2 font-display text-3xl tracking-[-0.045em]">What happened?</h2><form className="mt-6" onSubmit={saveReadingMoment}><fieldset><legend className="sr-only">Reading event</legend><div className="grid grid-cols-2 gap-2">{eventOptions.map((option) => <label className={`cursor-pointer rounded-xl border px-3 py-2.5 text-sm transition ${eventType === option.value ? "border-[var(--accent)] bg-[var(--paper)] font-medium" : "border-[var(--line)] bg-white/20 hover:bg-[var(--paper)]/60"}`} key={option.value}><input checked={eventType === option.value} className="sr-only" name="event-type" onChange={() => selectEventType(option.value)} type="radio" value={option.value} />{option.label}</label>)}</div></fieldset><fieldset className="mt-7"><legend className="text-sm font-medium">Child’s reaction <span className="font-normal text-[var(--muted)]">(optional)</span></legend><div className="mt-3 grid gap-2">{childReactionOptions.map((option) => <label className={`cursor-pointer rounded-xl border px-3 py-2.5 text-sm transition ${childReaction === option.value ? "border-[var(--accent)] bg-[var(--paper)]" : "border-[var(--line)] bg-white/20 hover:bg-[var(--paper)]/60"}`} key={option.value}><input checked={childReaction === option.value} className="mr-2 accent-[var(--accent)]" name="child-reaction" onChange={() => setChildReaction(option.value)} type="radio" value={option.value} />{option.label}</label>)}</div></fieldset><fieldset className="mt-7"><legend className="text-sm font-medium">Parent’s reaction <span className="font-normal text-[var(--muted)]">(optional)</span></legend><div className="mt-3 grid gap-2">{parentReactionOptions.map((option) => <label className={`cursor-pointer rounded-xl border px-3 py-2.5 text-sm transition ${parentReaction === option.value ? "border-[var(--accent)] bg-[var(--paper)]" : "border-[var(--line)] bg-white/20 hover:bg-[var(--paper)]/60"}`} key={option.value}><input checked={parentReaction === option.value} className="mr-2 accent-[var(--accent)]" name="parent-reaction" onChange={() => setParentReaction(option.value)} type="radio" value={option.value} />{option.label}</label>)}</div></fieldset>{showStopReasons ? <fieldset className="mt-7"><legend className="text-sm font-medium">Why? <span className="font-normal text-[var(--muted)]">(optional)</span></legend><div className="mt-3 grid gap-2">{stopReasonOptions.map((option) => <label className={`cursor-pointer rounded-xl border px-3 py-2.5 text-sm transition ${stopReason === option.value ? "border-[var(--accent)] bg-[var(--paper)]" : "border-[var(--line)] bg-white/20 hover:bg-[var(--paper)]/60"}`} key={option.value}><input checked={stopReason === option.value} className="mr-2 accent-[var(--accent)]" name="stop-reason" onChange={() => setStopReason(option.value)} type="radio" value={option.value} />{option.label}</label>)}</div></fieldset> : null}<button className="mt-7 w-full rounded-xl bg-[var(--accent)] px-4 py-3 font-medium text-white transition hover:bg-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-60" disabled={isSaving} type="submit">{isSaving ? "Saving reading moment…" : "Save reading moment"}</button>{confirmation === undefined ? null : <p aria-live="polite" className="mt-4 text-sm font-medium">{confirmation}</p>}{error === undefined ? null : <p className="mt-4 rounded-xl border border-[var(--accent)] bg-[var(--paper)] p-3 text-sm leading-6" role="alert">{error}</p>}</form></aside></div></div></main>;
}
