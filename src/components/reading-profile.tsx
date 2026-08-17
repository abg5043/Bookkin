"use client";

import { useCallback, useEffect, useState } from "react";
import { topicDisplayName, type TopicCode } from "@/domain/interests/topic-codes";
import { BookCover } from "@/components/book-cover";
import { RememberBookDialog } from "@/components/remember-book-dialog";
import { useBookkinShell } from "@/components/bookkin-shell";

type AgeRange = "2_3" | "4_5" | "6_8";
type RelationshipCode = "read_aloud" | "reading_together" | "some_independent";
type BookKindCode =
  | "funny" | "informative" | "fantasy" | "rhyming"
  | "interactive" | "gentle_cozy" | "longer_stories" | "wordless_picture_led";

type ReadingProfile = {
  childId: string;
  nickname?: string;
  ageRange?: AgeRange;
  readingRelationships: Array<{ phaseId: string; code: RelationshipCode }>;
  currentInterests: Array<{ phaseId: string; label: string; topicConfirmation?: { id: string; topicCode: string } }>;
  pastInterests: Array<{ phaseId: string; label: string; endedAt: string }>;
  bookKinds: Array<{ phaseId: string; code: BookKindCode }>;
  rememberedBooks: Array<{
    id: string;
    workId: string;
    title: string;
    authors: string[];
    coverUrl?: string;
    subjectType: string;
  }>;
  historySummary: {
    readingMomentCount: number;
    rerereadCount: number;
    reactionCount: number;
    childReactionCount: number;
    caregiverReactionCount: number;
  };
};

const ageRangeOptions: Array<{ value: AgeRange; label: string }> = [
  { value: "2_3", label: "2–3" },
  { value: "4_5", label: "4–5" },
  { value: "6_8", label: "6–8" },
];

const relationshipOptions: Array<{ value: RelationshipCode; label: string; support: string }> = [
  { value: "read_aloud", label: "Read-alouds together", support: "An adult reads most or all of the words." },
  { value: "reading_together", label: "Reading together", support: "They join in, recognize words, retell, or take turns." },
  { value: "some_independent", label: "Some independent reading", support: "They read some short books on their own." },
];

const relationshipLabel = new Map(relationshipOptions.map((option) => [option.value, option.label]));

const bookKindOptions: Array<{ value: BookKindCode; label: string }> = [
  { value: "funny", label: "Funny" },
  { value: "informative", label: "Fact-filled or informative" },
  { value: "fantasy", label: "Fantasy" },
  { value: "rhyming", label: "Rhyming or lyrical" },
  { value: "interactive", label: "Interactive or seek-and-find" },
  { value: "gentle_cozy", label: "Gentle or cozy" },
  { value: "longer_stories", label: "Longer stories" },
  { value: "wordless_picture_led", label: "Wordless or picture-led" },
];

const bookKindLabel = new Map(bookKindOptions.map((option) => [option.value, option.label]));

// SDD 2.3 treats the observation's subject as a product invariant, so it stays visible to the
// caregiver rather than being collapsed into an undifferentiated "remembered book".
const subjectLabel = new Map<string, string>([
  ["child", "Worked for my child"],
  ["caregiver", "Worked for me"],
  ["family_reference", "Worked for family reading time"],
]);

function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

function toggled<T>(set: ReadonlySet<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value); else next.add(value);
  return next;
}

export function ReadingProfilePanel() {
  const { readers, activeReaderId } = useBookkinShell();
  const [profile, setProfile] = useState<ReadingProfile>();
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();
  const [showCoreForm, setShowCoreForm] = useState(false);
  const [ageRange, setAgeRange] = useState<AgeRange>();
  const [relationshipCodes, setRelationshipCodes] = useState<Set<RelationshipCode>>(new Set());
  const [bookKindCodes, setBookKindCodes] = useState<Set<BookKindCode>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string>();
  const [saveNotice, setSaveNotice] = useState(false);
  const [newInterest, setNewInterest] = useState("");
  const [isAddingInterest, setIsAddingInterest] = useState(false);
  const [actionError, setActionError] = useState<string>();
  const [pendingTopic, setPendingTopic] = useState<{
    interestId: string;
    topicCode: TopicCode;
    displayName: string;
    label: string;
  }>();
  const [showPastInterests, setShowPastInterests] = useState(false);
  const [showRememberBook, setShowRememberBook] = useState(false);

  const loadProfile = useCallback(async (childId: string) => {
    setIsLoading(true);
    setLoadError(undefined);
    // Cleared here so a "Profile saved" notice never carries across a reader switch;
    // saveCoreProfile re-sets it after its own reload.
    setSaveNotice(false);
    try {
      const response = await fetch(`/api/children/${childId}/reading-profile`);
      if (!response.ok) throw new Error("Reading profile request failed");
      const { profile: fetched } = await response.json() as { profile: ReadingProfile };
      setProfile(fetched);
      setAgeRange(fetched.ageRange);
      setRelationshipCodes(new Set(fetched.readingRelationships.map((phase) => phase.code)));
      setBookKindCodes(new Set(fetched.bookKinds.map((phase) => phase.code)));
      setShowCoreForm(fetched.ageRange === undefined || fetched.readingRelationships.length === 0);
    } catch {
      setLoadError("This reader's profile could not load. Try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeReaderId === undefined) return undefined;
    const timeoutId = window.setTimeout(() => { void loadProfile(activeReaderId); }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [activeReaderId, loadProfile]);

  if (readers.length === 0) {
    return (
      <section className="bk-page">
        <p className="bk-eyebrow">Reading profile</p>
        <h1 className="bk-page-title">Add your first reader.</h1>
        <p className="bk-page-intro">Use the reader menu above to add a child before setting up their reading profile.</p>
      </section>
    );
  }

  if (isLoading || activeReaderId === undefined || profile === undefined) {
    return (
      <section className="bk-page">
        <p className="bk-eyebrow">Reading profile</p>
        <h1 className="bk-page-title">Reading profile</h1>
        {loadError !== undefined ? (
          <div className="bk-page-state bk-page-error" role="alert"><strong>Could not load this reader.</strong>{loadError}</div>
        ) : <p className="bk-page-intro">Loading…</p>}
      </section>
    );
  }

  async function saveCoreProfile() {
    if (ageRange === undefined || relationshipCodes.size === 0 || activeReaderId === undefined) return;
    setIsSaving(true);
    setSaveError(undefined);
    try {
      const now = new Date().toISOString();
      const response = await fetch(`/api/children/${activeReaderId}/profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ageRange,
          readingRelationshipCodes: [...relationshipCodes],
          bookKindCodes: [...bookKindCodes],
          declaredAt: now,
          reporterType: "caregiver",
          sourceVersion: "reading-profile-v1",
          clientMutationId: window.crypto.randomUUID(),
        }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => undefined) as { error?: string } | undefined;
        throw new Error(body?.error ?? "Could not save this profile.");
      }
      await loadProfile(activeReaderId);
      setShowCoreForm(false);
      setSaveNotice(true);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Could not save this profile.");
    } finally {
      setIsSaving(false);
    }
  }

  async function addInterest() {
    const label = newInterest.trim();
    if (label.length === 0 || activeReaderId === undefined) return;
    setIsAddingInterest(true);
    setActionError(undefined);
    try {
      const now = new Date().toISOString();
      const response = await fetch(`/api/children/${activeReaderId}/interests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label,
          startedAt: now,
          declaredAt: now,
          reporterType: "caregiver",
          sourceVersion: "reading-profile-v1",
          clientMutationId: window.crypto.randomUUID(),
        }),
      });
      if (!response.ok) {
        // The typed text is deliberately kept so the caregiver can retry without retyping.
        setActionError("That topic wasn’t saved. Check your connection and try again.");
        return;
      }
      const { interest, matchedTopicCode } = await response.json() as {
        interest: { id: string; label: string };
        matchedTopicCode: TopicCode | null;
      };
      setNewInterest("");
      await loadProfile(activeReaderId);
      if (matchedTopicCode !== null) {
        setPendingTopic({
          interestId: interest.id,
          topicCode: matchedTopicCode,
          displayName: topicDisplayName(matchedTopicCode),
          label: interest.label,
        });
      }
    } catch {
      setActionError("That topic wasn’t saved. Check your connection and try again.");
    } finally {
      setIsAddingInterest(false);
    }
  }

  async function endInterest(interestId: string) {
    if (activeReaderId === undefined) return;
    setActionError(undefined);
    const now = new Date().toISOString();
    try {
      const response = await fetch(`/api/children/${activeReaderId}/interests/${interestId}/end`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endedAt: now,
          declaredAt: now,
          reporterType: "caregiver",
          sourceVersion: "reading-profile-v1",
          clientMutationId: window.crypto.randomUUID(),
        }),
      });
      // Never reload as if this succeeded; a failed write must not read back as a saved change.
      if (!response.ok) {
        setActionError("That topic change wasn’t saved. Check your connection and try again.");
        return;
      }
      await loadProfile(activeReaderId);
    } catch {
      setActionError("That topic change wasn’t saved. Check your connection and try again.");
    }
  }

  async function respondToTopicPrompt(confirm: boolean) {
    if (pendingTopic === undefined || activeReaderId === undefined) return;
    if (!confirm) {
      // "Not now" stores no mapping at all, so there is nothing to save or fail.
      setPendingTopic(undefined);
      return;
    }
    setActionError(undefined);
    try {
      const response = await fetch(`/api/children/${activeReaderId}/interests/${pendingTopic.interestId}/topic-confirmation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topicCode: pendingTopic.topicCode,
          declaredAt: new Date().toISOString(),
          reporterType: "caregiver",
          sourceVersion: "reading-profile-v1",
          clientMutationId: window.crypto.randomUUID(),
        }),
      });
      if (!response.ok) {
        // Keep the prompt open so the caregiver can retry rather than silently losing the choice.
        setActionError("That topic wasn’t saved. This topic is still private. Try again.");
        return;
      }
      await loadProfile(activeReaderId);
      setPendingTopic(undefined);
    } catch {
      setActionError("That topic wasn’t saved. This topic is still private. Try again.");
    }
  }

  const readerLabel = readers.find((reader) => reader.id === activeReaderId)?.label ?? "this reader";
  const isSaveReady = ageRange !== undefined && relationshipCodes.size > 0;

  return (
    <section className="bk-page">
      <p className="bk-eyebrow">{showCoreForm ? "Reader profile setup" : "Settings · Reader profiles"}</p>
      <h1 className="bk-page-title">
        {showCoreForm ? "Set up this reader’s profile." : `${readerLabel}’s reading profile`}
      </h1>
      <p className="bk-page-intro">
        {showCoreForm
          ? "A few broad details help Bookkin find books that fit. You can change them anytime."
          : "Update the broad details and preferences you’ve chosen for this reader."}
      </p>

      {saveNotice && !showCoreForm ? (
        <div className="bk-page-state" role="status">Profile saved. You can update it anytime.</div>
      ) : null}

      <div className="bk-reading-profile" data-view={showCoreForm ? "setup" : "settings"} style={{ marginTop: "1.4rem" }}>
        {showCoreForm ? (
          <div className="bk-profile-card">
            <h2>What age range are they in? <span className="bk-required">Required</span></h2>
            <p className="bk-support">Broad context only. No birth date needed.</p>
            <div aria-label="Age range" className="bk-choice-row" role="group">
              {ageRangeOptions.map((option) => (
                <button
                  aria-pressed={ageRange === option.value}
                  className="bk-choice"
                  key={option.value}
                  onClick={() => setAgeRange(option.value)}
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </div>

            <fieldset className="bk-status-fieldset">
              <legend>How do books work for them right now? <span className="bk-required">Required</span></legend>
              <p className="bk-support">Choose all that fit. These can overlap and aren’t a reading assessment.</p>
              <div className="bk-check-grid">
                {relationshipOptions.map((option) => (
                  <label className="bk-check-card" key={option.value}>
                    <input
                      checked={relationshipCodes.has(option.value)}
                      onChange={() => setRelationshipCodes((current) => toggled(current, option.value))}
                      type="checkbox"
                    />
                    <span><strong>{option.label}</strong><small>{option.support}</small></span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="bk-status-fieldset">
              <legend>What kinds of books tend to work well?</legend>
              <p className="bk-support">Choose any that are usually a good fit for your reading time. Optional.</p>
              <div className="bk-check-grid bk-kind-grid">
                {bookKindOptions.map((option) => (
                  <label className="bk-check-card" key={option.value}>
                    <input
                      checked={bookKindCodes.has(option.value)}
                      onChange={() => setBookKindCodes((current) => toggled(current, option.value))}
                      type="checkbox"
                    />
                    <span><strong>{option.label}</strong></span>
                  </label>
                ))}
              </div>
            </fieldset>

            {saveError !== undefined ? <div className="bk-inline-message" role="alert">{saveError}</div> : null}
            {!isSaveReady ? (
              <p className="bk-support" id="reading-profile-save-requirements">
                {ageRange === undefined
                  ? "Choose an age range."
                  : "Choose at least one way books work right now."}
              </p>
            ) : null}
            <div className="bk-save-row">
              <button
                aria-describedby={isSaveReady ? undefined : "reading-profile-save-requirements"}
                className="bk-button-primary"
                disabled={!isSaveReady || isSaving}
                onClick={() => { void saveCoreProfile(); }}
                type="button"
              >
                {isSaving ? "Saving…" : "Save profile"}
              </button>
            </div>
          </div>
        ) : (
          <div className="bk-profile-card">
            <div className="bk-profile-card-head">
              <div>
                <h2>Age and reading preferences</h2>
              </div>
              <button className="bk-button-secondary" onClick={() => setShowCoreForm(true)} type="button">Change</button>
            </div>
            <div className="bk-history-fact">
              <span><strong>Ages {profile.ageRange?.replace("_", "–")}</strong><small>Broad age range</small></span>
            </div>
            <div className="bk-history-fact">
              <span>
                <strong>{profile.readingRelationships.map((phase) => relationshipLabel.get(phase.code)).join(" · ")}</strong>
                <small>Current reading routines</small>
              </span>
            </div>
          </div>
        )}

        <div className="bk-profile-card">
          <h2>Current topics</h2>
          <p className="bk-support">What they’re curious about right now.</p>
          {actionError !== undefined ? <div className="bk-inline-message" role="alert">{actionError}</div> : null}
          {profile.currentInterests.map((interest) => (
            <div className="bk-interest-row" key={interest.phaseId}>
              <span>
                <strong>{interest.label}</strong>
                <small>{interest.topicConfirmation !== undefined ? "Included in book search" : "Kept private"}</small>
              </span>
              <button className="bk-button-secondary" onClick={() => { void endInterest(interest.phaseId); }} type="button">
                Not into this right now
              </button>
            </div>
          ))}
          <div className="bk-interest-form" style={{ marginTop: "0.75rem" }}>
            <label className="sr-only" htmlFor="reading-profile-new-interest">What are they curious about right now?</label>
            <input
              id="reading-profile-new-interest"
              onChange={(event) => setNewInterest(event.target.value)}
              placeholder="Dinosaurs, trains, weather…"
              value={newInterest}
            />
            <button
              className="bk-button-secondary"
              disabled={newInterest.trim().length === 0 || isAddingInterest}
              onClick={() => { void addInterest(); }}
              type="button"
            >
              Add topic
            </button>
          </div>
          {pendingTopic !== undefined ? (
            <div className="bk-topic-confirm" role="status">
              <p>Use the broad topic <strong>{pendingTopic.displayName}</strong> when Bookkin looks for books?</p>
              <div className="bk-topic-actions">
                <button className="bk-button-primary" onClick={() => { void respondToTopicPrompt(true); }} type="button">Use this topic</button>
                <button className="bk-button-secondary" onClick={() => { void respondToTopicPrompt(false); }} type="button">Not now</button>
              </div>
            </div>
          ) : null}

          {profile.pastInterests.length > 0 ? (
            <details style={{ marginTop: "0.85rem" }}>
              <summary onClick={(event) => { event.preventDefault(); setShowPastInterests((current) => !current); }} style={{ cursor: "pointer", fontWeight: 700 }}>
                {showPastInterests ? "Hide" : "Show"} {profile.pastInterests.length} past interest{profile.pastInterests.length === 1 ? "" : "s"}
              </summary>
              {showPastInterests ? profile.pastInterests.map((interest) => (
                <div className="bk-history-fact" key={interest.phaseId}>
                  <span><strong>{interest.label}</strong><small>Into this until {new Date(interest.endedAt).toLocaleDateString()}</small></span>
                </div>
              )) : null}
            </details>
          ) : null}
        </div>

        {!showCoreForm ? (
          <div className="bk-profile-card">
            <div className="bk-profile-card-head">
              <div>
                <h2>Book preferences</h2>
                <p className="bk-support">Kinds of books you said tend to work well.</p>
              </div>
              <button className="bk-button-secondary" onClick={() => setShowCoreForm(true)} type="button">Change</button>
            </div>
            {profile.bookKinds.length === 0 ? (
              <p className="bk-support">No kinds chosen yet.</p>
            ) : (
              <div className="bk-chip-row">
                {profile.bookKinds.map((phase) => (
                  <span className="bk-chip" key={phase.phaseId}>{bookKindLabel.get(phase.code)}</span>
                ))}
              </div>
            )}
          </div>
        ) : null}

        {!showCoreForm ? (
          <div className="bk-profile-card">
            <div className="bk-profile-card-head">
              <div>
                <h2>Books you asked Bookkin to remember</h2>
                <p className="bk-support">Only books you explicitly saved appear here.</p>
              </div>
              <button className="bk-button-secondary" onClick={() => setShowRememberBook(true)} type="button">
                Add book
              </button>
            </div>
            {profile.rememberedBooks.length === 0 ? (
              <p className="bk-support">No books saved yet.</p>
            ) : null}
            {profile.rememberedBooks.map((book) => (
              <div className="bk-book-row" key={book.id}>
                <BookCover compact title={book.title} url={book.coverUrl} />
                <span>
                  <strong>{book.title}</strong>
                  <small>{book.authors.length > 0 ? book.authors.join(", ") : "Author unavailable"}</small>
                  <span className="bk-fact-pill">{subjectLabel.get(book.subjectType) ?? book.subjectType}</span>
                </span>
              </div>
            ))}
          </div>
        ) : null}

        <div className="bk-profile-card">
          <h2>From reading history</h2>
          <p className="bk-support">Based on what you’ve logged for this reader.</p>
          <div className="bk-history-fact">
            <span>
              <strong>{plural(profile.historySummary.readingMomentCount, "reading moment")}</strong>
              <small>Including {plural(profile.historySummary.rerereadCount, "reread")}</small>
            </span>
          </div>
          <div className="bk-history-fact">
            <span>
              <strong>{plural(profile.historySummary.reactionCount, "recorded reaction")}</strong>
              <small>
                {plural(profile.historySummary.childReactionCount, "child reaction")}
                {" · "}
                {plural(profile.historySummary.caregiverReactionCount, "caregiver reaction")}
              </small>
            </span>
          </div>
        </div>
      </div>

      {showRememberBook && activeReaderId !== undefined ? (
        <RememberBookDialog
          childId={activeReaderId}
          onClose={() => setShowRememberBook(false)}
          onRemembered={() => loadProfile(activeReaderId)}
          readerLabel={readerLabel}
        />
      ) : null}
    </section>
  );
}
