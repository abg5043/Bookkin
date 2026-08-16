import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { createInterestPhase, correctInterestPhase, endInterestPhase } from "@/application/interests/interest-phases";
import { createPreferenceObservation } from "@/application/preferences/preference-observations";
import { appendQuickReadingLog, getFamilyBookHistory } from "@/application/reading/reading-history";
import { correctReadingEvent } from "@/application/reading/corrections";
import { createRecommendationRequest } from "@/application/recommendations/recommendation-requests";
import { prisma } from "@/infrastructure/db/prisma";

function isDisposablePostgresUrl(rawUrl: string | undefined): boolean {
  if (rawUrl === undefined) return false;
  try {
    const url = new URL(rawUrl);
    const databaseName = url.pathname.slice(1);
    return ["postgres:", "postgresql:"].includes(url.protocol)
      && /(?:_test|_ci)$/.test(databaseName);
  } catch {
    return false;
  }
}

const databaseTestsRequired = process.env.BOOKKIN_REQUIRE_DB_TESTS === "true";
if (databaseTestsRequired && !isDisposablePostgresUrl(process.env.DATABASE_URL)) {
  throw new Error("BOOKKIN_REQUIRE_DB_TESTS requires an explicit PostgreSQL database ending in _test or _ci.");
}

const databaseDescribe = databaseTestsRequired
  ? describe.sequential
  : describe.skip;

const householdIds: string[] = [];
const workIds: string[] = [];

async function fixture() {
  const suffix = randomUUID();
  const household = await prisma.household.create({ data: {} });
  householdIds.push(household.id);
  const child = await prisma.childProfile.create({
    data: {
      householdId: household.id,
      nickname: "Test reader",
      ageStageBasis: "age",
      ageStageValue: "age_2_3",
    },
  });
  const work = await prisma.bookWork.create({
    data: {
      title: `Verified test work ${suffix}`,
      authors: "[]",
      metadataProvider: "checkpoint-5b-test",
      metadataRecordId: suffix,
      metadataProvenance: JSON.stringify({ provider: "checkpoint-5b-test", recordId: suffix }),
    },
  });
  workIds.push(work.id);
  return { suffix, household, child, work };
}

afterEach(async () => {
  if (householdIds.length > 0) {
    await prisma.household.deleteMany({ where: { id: { in: householdIds.splice(0) } } });
  }
  if (workIds.length > 0) {
    await prisma.bookWork.deleteMany({ where: { id: { in: workIds.splice(0) } } });
  }
});

databaseDescribe("Checkpoint 5B PostgreSQL integrity", () => {
  it("writes a preference idempotently without creating shelf or reading side effects", async () => {
    const { suffix, household, child, work } = await fixture();
    const command = {
      householdId: household.id,
      childId: child.id,
      workId: work.id,
      kind: "worked_for_us",
      subjectType: "family_reference",
      reporterType: "caregiver",
      declaredAt: "2026-08-15T12:00:00.000Z",
      sourceType: "explicit_preference",
      sourceVersion: "preference-v1",
      clientMutationId: `preference-${suffix}`,
    } as const;

    const first = await createPreferenceObservation(command);
    const retry = await createPreferenceObservation(command);
    expect(retry.id).toBe(first.id);

    await expect(createPreferenceObservation({
      ...command,
      subjectType: "child",
    })).rejects.toThrow(/already used for different input/);

    await expect(prisma.preferenceObservation.count({ where: { householdId: household.id } })).resolves.toBe(1);
    await expect(prisma.familyBook.count({ where: { householdId: household.id } })).resolves.toBe(0);
    await expect(prisma.readingEvent.count({ where: { householdId: household.id } })).resolves.toBe(0);
    await expect(prisma.recommendationRequestReference.count({ where: { householdId: household.id } })).resolves.toBe(0);
  });

  it("captures an immutable cold-start request snapshot from a verified reference", async () => {
    const { suffix, household, child, work } = await fixture();
    const request = await createRecommendationRequest({
      householdId: household.id,
      childId: child.id,
      requestedAt: "2026-08-15T12:05:00.000Z",
      ageStageBand: { basis: "age", value: "2_3" },
      clientMutationId: `request-${suffix}`,
      references: [{
        workId: work.id,
        purpose: "more_like_this",
        selectedAt: "2026-08-15T12:04:00.000Z",
        sourceVersion: "request-reference-v1",
        clientMutationId: `reference-${suffix}`,
      }],
    });

    expect(request.evidenceSnapshot.requestReferenceIds).toHaveLength(1);
    expect(request.evidenceSnapshot.preferenceObservationIds).toEqual([]);
    expect(request.evidenceSnapshot.readingEventIds).toEqual([]);
    await expect(prisma.familyBook.count({ where: { householdId: household.id } })).resolves.toBe(0);
    await expect(prisma.readingEvent.count({ where: { householdId: household.id } })).resolves.toBe(0);

    await createPreferenceObservation({
      householdId: household.id,
      childId: child.id,
      workId: work.id,
      kind: "worked_for_us",
      subjectType: "child",
      reporterType: "caregiver",
      declaredAt: "2026-08-15T12:06:00.000Z",
      sourceType: "explicit_preference",
      sourceVersion: "preference-v1",
      clientMutationId: `later-preference-${suffix}`,
    });

    const stored = await prisma.recommendationRequest.findUniqueOrThrow({ where: { id: request.id } });
    expect(stored.evidenceSnapshot).toEqual(request.evidenceSnapshot);
  });

  it("rejects cross-household ownership and invalid age-stage pairs", async () => {
    const one = await fixture();
    const two = await fixture();

    await expect(createRecommendationRequest({
      householdId: one.household.id,
      childId: two.child.id,
      requestedAt: "2026-08-15T12:10:00.000Z",
      ageStageBand: { basis: "age", value: "2_3" },
      clientMutationId: `foreign-request-${one.suffix}`,
      references: [{
        workId: one.work.id,
        purpose: "more_like_this",
        selectedAt: "2026-08-15T12:09:00.000Z",
        sourceVersion: "request-reference-v1",
        clientMutationId: `foreign-reference-${one.suffix}`,
      }],
    })).rejects.toThrow(/does not belong/);

    await expect(prisma.readingEvent.create({
      data: {
        householdId: one.household.id,
        childId: two.child.id,
        workId: one.work.id,
        eventType: "finished",
        occurredAt: new Date("2026-08-15T12:10:00.000Z"),
        clientMutationId: `foreign-reading-${one.suffix}`,
      },
    })).rejects.toThrow(/ReadingEvent_childId_householdId_fkey/);

    await expect(prisma.childProfile.create({
      data: {
        householdId: one.household.id,
        ageStageBasis: "age",
        ageStageValue: "pre_reader",
      },
    })).rejects.toThrow(/ChildProfile_age_stage_pair_check/);
  });

  it("preserves an ended interest source while carrying its end to a corrected replacement", async () => {
    const { suffix, household, child } = await fixture();
    const source = await createInterestPhase({
      householdId: household.id,
      childId: child.id,
      label: "Construction vehicles",
      startedAt: "2026-08-01T12:00:00.000Z",
      declaredAt: "2026-08-01T12:00:00.000Z",
      reporterType: "caregiver",
      sourceVersion: "interest-v1",
      clientMutationId: `interest-${suffix}`,
    });
    const sourceEnd = await endInterestPhase({
      householdId: household.id,
      interestPhaseId: source.id,
      endedAt: "2026-08-10T12:00:00.000Z",
      declaredAt: "2026-08-10T12:00:00.000Z",
      reporterType: "caregiver",
      sourceVersion: "interest-end-v1",
      clientMutationId: `interest-end-${suffix}`,
    });

    const command = {
      householdId: household.id,
      targetId: source.id,
      kind: "replace",
      declaredAt: "2026-08-15T12:00:00.000Z",
      reporterType: "caregiver",
      reasonCode: "label-clarified",
      clientMutationId: `interest-correction-${suffix}`,
      replacement: {
        householdId: household.id,
        childId: child.id,
        label: "Diggers and construction vehicles",
        startedAt: "2026-08-01T12:00:00.000Z",
        declaredAt: "2026-08-15T12:00:00.000Z",
        reporterType: "caregiver",
        sourceVersion: "interest-v1",
        clientMutationId: `interest-replacement-${suffix}`,
      },
      endAccounting: {
        action: "carry_forward",
        clientMutationId: `interest-end-carry-${suffix}`,
      },
    } as const;
    const amendment = await correctInterestPhase(command);
    const retry = await correctInterestPhase(command);
    expect(retry.id).toBe(amendment.id);

    const records = await prisma.interestPhase.findMany({
      where: { householdId: household.id },
      include: { end: true },
      orderBy: { createdAt: "asc" },
    });
    expect(records).toHaveLength(2);
    expect(records[0].id).toBe(source.id);
    expect(records[0].end?.id).toBe(sourceEnd.id);
    expect(records[1].end?.endedAt).toEqual(sourceEnd.endedAt);
    expect(amendment.replacementId).toBe(records[1].id);
  });

  it("replaces a reading while explicitly carrying and retracting its reactions", async () => {
    const { suffix, household, child, work } = await fixture();
    const familyBook = await prisma.familyBook.create({
      data: {
        householdId: household.id,
        workId: work.id,
        addedVia: "checkpoint-5b-test",
        shelfStatus: "borrowed",
      },
    });
    const logged = await appendQuickReadingLog(household.id, familyBook.id, {
      eventType: "finished",
      childReaction: "love",
      parentReaction: "like",
      clientMutationId: `quick-log-${suffix}`,
    });
    expect(logged).not.toBeNull();

    const source = await prisma.readingEvent.findUniqueOrThrow({
      where: { id: logged?.id },
      include: { reactions: { orderBy: { subjectType: "asc" } } },
    });
    const childReaction = source.reactions.find((reaction) => reaction.subjectType === "child");
    const caregiverReaction = source.reactions.find((reaction) => reaction.subjectType === "caregiver");
    expect(childReaction).toBeDefined();
    expect(caregiverReaction).toBeDefined();

    const command = {
      householdId: household.id,
      targetId: source.id,
      kind: "replace",
      declaredAt: "2026-08-15T12:20:00.000Z",
      reporterType: "caregiver",
      reasonCode: "event-type-corrected",
      clientMutationId: `reading-correction-${suffix}`,
      replacement: {
        householdId: household.id,
        childId: child.id,
        workId: work.id,
        eventType: "reread",
        occurredAt: source.occurredAt,
        clientMutationId: `reading-replacement-${suffix}`,
      },
      reactionAccounting: [
        {
          action: "carry_forward",
          targetReactionId: childReaction?.id ?? "missing",
          amendmentClientMutationId: `child-amendment-${suffix}`,
          replacementClientMutationId: `child-replacement-${suffix}`,
          sourceVersion: "reading-correction-v1",
        },
        {
          action: "retract",
          targetReactionId: caregiverReaction?.id ?? "missing",
          amendmentClientMutationId: `caregiver-amendment-${suffix}`,
          reasonCode: "reaction-entered-in-error",
        },
      ],
    } as const;

    const amendment = await correctReadingEvent(command);
    const retry = await correctReadingEvent(command);
    expect(retry.id).toBe(amendment.id);

    const history = await getFamilyBookHistory(household.id, familyBook.id);
    expect(history?.events).toHaveLength(1);
    expect(history?.events[0]).toMatchObject({ eventType: "reread", childReaction: "love" });
    expect(history?.events[0].parentReaction).toBeUndefined();
    await expect(prisma.readingEvent.count({ where: { householdId: household.id } })).resolves.toBe(2);
    await expect(prisma.reaction.count({ where: { householdId: household.id } })).resolves.toBe(3);
    await expect(prisma.reactionAmendment.count({ where: { householdId: household.id } })).resolves.toBe(2);
  });

  it("retracts a quick-log reread idempotently without deleting its source", async () => {
    const { suffix, household, work } = await fixture();
    const familyBook = await prisma.familyBook.create({
      data: {
        householdId: household.id,
        workId: work.id,
        addedVia: "checkpoint-5b-test",
        shelfStatus: "borrowed",
      },
    });
    const logged = await appendQuickReadingLog(household.id, familyBook.id, {
      eventType: "reread",
      clientMutationId: `quick-reread-${suffix}`,
    });
    expect(logged).not.toBeNull();

    const command = {
      householdId: household.id,
      targetId: logged?.id ?? "missing",
      kind: "retract",
      declaredAt: "2026-08-15T12:30:00.000Z",
      reporterType: "caregiver",
      reasonCode: "quick_log_undo",
      clientMutationId: `quick-reread-undo-${suffix}`,
    } as const;

    const [first, concurrentRetry] = await Promise.all([
      correctReadingEvent(command),
      correctReadingEvent(command),
    ]);
    const sequentialRetry = await correctReadingEvent(command);
    expect(concurrentRetry.id).toBe(first.id);
    expect(sequentialRetry.id).toBe(first.id);
    await expect(correctReadingEvent({
      ...command,
      reasonCode: "different-undo-reason",
    })).rejects.toThrow(/already used for different input/);

    const history = await getFamilyBookHistory(household.id, familyBook.id);
    expect(history?.events).toEqual([]);
    expect(history?.rereadCount).toBe(0);
    await expect(prisma.readingEvent.findUnique({ where: { id: command.targetId } })).resolves.not.toBeNull();
    await expect(prisma.readingEvent.count({ where: { householdId: household.id } })).resolves.toBe(1);
    await expect(prisma.readingEventAmendment.count({ where: { householdId: household.id } })).resolves.toBe(1);

    const other = await fixture();
    await expect(correctReadingEvent({
      ...command,
      householdId: other.household.id,
      clientMutationId: `cross-household-undo-${suffix}`,
    })).rejects.toThrow(/current valid reading event/);
  });
});
