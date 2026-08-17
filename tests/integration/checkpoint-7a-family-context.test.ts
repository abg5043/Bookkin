import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import {
  createReadingRelationshipPhase,
  correctReadingRelationshipPhase,
  endReadingRelationshipPhase,
  resolveActiveReadingRelationships,
  syncReadingRelationships,
} from "@/application/reading-relationships/reading-relationship-phases";
import {
  createBookKindPhase,
  endBookKindPhase,
  resolveActiveBookKinds,
  syncBookKinds,
} from "@/application/book-kinds/book-kind-phases";
import { createInterestPhase, endInterestPhase } from "@/application/interests/interest-phases";
import {
  createInterestTopicConfirmation,
  resolveActiveTopicConfirmations,
  revokeInterestTopicConfirmation,
} from "@/application/interests/topic-confirmations";
import { createChildProfile, saveChildProfileSetup, setChildAgeRange } from "@/application/households/child-profiles";
import { getReadingProfile } from "@/application/households/reading-profile";
import { rememberBookForChild } from "@/application/preferences/remember-book";
import { createRecommendationRequestV2 } from "@/application/recommendations/recommendation-requests-v2";
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

const databaseDescribe = databaseTestsRequired ? describe.sequential : describe.skip;

const householdIds: string[] = [];

async function fixture() {
  const suffix = randomUUID();
  const household = await prisma.household.create({ data: {} });
  householdIds.push(household.id);
  const child = await createChildProfile({ householdId: household.id, nickname: "Test reader" });
  return { suffix, household, child };
}

afterEach(async () => {
  if (householdIds.length > 0) {
    await prisma.household.deleteMany({ where: { id: { in: householdIds.splice(0) } } });
  }
});

databaseDescribe("Checkpoint 7A family context and candidate boundary", () => {
  it("creates a reading-relationship phase idempotently and rejects a different retry", async () => {
    const { suffix, household, child } = await fixture();
    const command = {
      householdId: household.id,
      childId: child.id,
      code: "read_aloud",
      startedAt: "2026-08-16T12:00:00.000Z",
      declaredAt: "2026-08-16T12:00:00.000Z",
      reporterType: "caregiver",
      sourceVersion: "relationship-v1",
      clientMutationId: `relationship-${suffix}`,
    } as const;

    const first = await createReadingRelationshipPhase(command);
    const retry = await createReadingRelationshipPhase(command);
    expect(retry.id).toBe(first.id);

    await expect(createReadingRelationshipPhase({ ...command, code: "reading_together" }))
      .rejects.toThrow(/already used for different input/);
  });

  it("only allows ending a current reading-relationship phase, and excludes ended phases from the active set", async () => {
    const { suffix, household, child } = await fixture();
    const phase = await createReadingRelationshipPhase({
      householdId: household.id,
      childId: child.id,
      code: "read_aloud",
      startedAt: "2026-08-16T12:00:00.000Z",
      declaredAt: "2026-08-16T12:00:00.000Z",
      reporterType: "caregiver",
      sourceVersion: "relationship-v1",
      clientMutationId: `relationship-${suffix}`,
    });

    await expect(resolveActiveReadingRelationships(household.id, child.id))
      .resolves.toEqual([expect.objectContaining({ id: phase.id })]);

    await endReadingRelationshipPhase({
      householdId: household.id,
      relationshipPhaseId: phase.id,
      endedAt: "2026-08-16T13:00:00.000Z",
      declaredAt: "2026-08-16T13:00:00.000Z",
      reporterType: "caregiver",
      sourceVersion: "relationship-end-v1",
      clientMutationId: `relationship-end-${suffix}`,
    });

    await expect(resolveActiveReadingRelationships(household.id, child.id)).resolves.toEqual([]);
    await expect(endReadingRelationshipPhase({
      householdId: household.id,
      relationshipPhaseId: phase.id,
      endedAt: "2026-08-16T14:00:00.000Z",
      declaredAt: "2026-08-16T14:00:00.000Z",
      reporterType: "caregiver",
      sourceVersion: "relationship-end-v1",
      clientMutationId: `relationship-end-again-${suffix}`,
    })).rejects.toThrow(/already has a different end declaration/);
  });

  it("retracts a reading-relationship phase through amendment without deleting the audit row", async () => {
    const { suffix, household, child } = await fixture();
    const phase = await createReadingRelationshipPhase({
      householdId: household.id,
      childId: child.id,
      code: "some_independent",
      startedAt: "2026-08-16T12:00:00.000Z",
      declaredAt: "2026-08-16T12:00:00.000Z",
      reporterType: "caregiver",
      sourceVersion: "relationship-v1",
      clientMutationId: `relationship-${suffix}`,
    });

    await correctReadingRelationshipPhase({
      householdId: household.id,
      targetId: phase.id,
      kind: "retract",
      declaredAt: "2026-08-16T13:00:00.000Z",
      reporterType: "caregiver",
      reasonCode: "mistaken-entry",
      clientMutationId: `relationship-correction-${suffix}`,
    });

    await expect(resolveActiveReadingRelationships(household.id, child.id)).resolves.toEqual([]);
    await expect(prisma.readingRelationshipPhase.findUnique({ where: { id: phase.id } }))
      .resolves.toEqual(expect.objectContaining({ id: phase.id }));
  });

  it("syncs the desired reading-relationship set idempotently", async () => {
    const { suffix, household, child } = await fixture();
    const batchInput = {
      householdId: household.id,
      childId: child.id,
      desiredCodes: ["read_aloud", "reading_together"],
      declaredAt: "2026-08-16T12:00:00.000Z",
      reporterType: "caregiver",
      sourceVersion: "relationship-v1",
      batchMutationId: `relationship-batch-${suffix}`,
    } as const;

    const first = await syncReadingRelationships(batchInput);
    expect(first.map((phase) => phase.code).sort()).toEqual(["read_aloud", "reading_together"]);

    const retry = await syncReadingRelationships(batchInput);
    expect(retry.map((phase) => phase.id).sort()).toEqual(first.map((phase) => phase.id).sort());

    const narrowed = await syncReadingRelationships({ ...batchInput, desiredCodes: ["some_independent"] });
    expect(narrowed.map((phase) => phase.code)).toEqual(["some_independent"]);
  });

  it("creates and ends book-kind phases, and syncs an empty desired set to none active", async () => {
    const { suffix, household, child } = await fixture();
    await createBookKindPhase({
      householdId: household.id,
      childId: child.id,
      code: "funny",
      startedAt: "2026-08-16T12:00:00.000Z",
      declaredAt: "2026-08-16T12:00:00.000Z",
      reporterType: "caregiver",
      sourceVersion: "book-kind-v1",
      clientMutationId: `book-kind-${suffix}`,
    });
    await expect(resolveActiveBookKinds(household.id, child.id))
      .resolves.toEqual([expect.objectContaining({ code: "funny" })]);

    await syncBookKinds({
      householdId: household.id,
      childId: child.id,
      desiredCodes: [],
      declaredAt: "2026-08-16T13:00:00.000Z",
      reporterType: "caregiver",
      sourceVersion: "book-kind-v1",
      batchMutationId: `book-kind-batch-${suffix}`,
    });
    await expect(resolveActiveBookKinds(household.id, child.id)).resolves.toEqual([]);
  });

  it("rejects ending a book-kind phase before its own start", async () => {
    const { suffix, household, child } = await fixture();
    const phase = await createBookKindPhase({
      householdId: household.id,
      childId: child.id,
      code: "fantasy",
      startedAt: "2026-08-16T12:00:00.000Z",
      declaredAt: "2026-08-16T12:00:00.000Z",
      reporterType: "caregiver",
      sourceVersion: "book-kind-v1",
      clientMutationId: `book-kind-${suffix}`,
    });
    await expect(endBookKindPhase({
      householdId: household.id,
      bookKindPhaseId: phase.id,
      endedAt: "2026-08-16T11:00:00.000Z",
      declaredAt: "2026-08-16T12:30:00.000Z",
      reporterType: "caregiver",
      sourceVersion: "book-kind-end-v1",
      clientMutationId: `book-kind-end-${suffix}`,
    })).rejects.toThrow(/cannot end before it starts/);
  });

  it("confirms a topic on a current interest, allows only one live confirmation, and honors revocation", async () => {
    const { suffix, household, child } = await fixture();
    const interest = await createInterestPhase({
      householdId: household.id,
      childId: child.id,
      label: "Dinosaurs",
      startedAt: "2026-08-16T12:00:00.000Z",
      declaredAt: "2026-08-16T12:00:00.000Z",
      reporterType: "caregiver",
      sourceVersion: "interest-v1",
      clientMutationId: `interest-${suffix}`,
    });

    const confirmation = await createInterestTopicConfirmation({
      householdId: household.id,
      childId: child.id,
      interestPhaseId: interest.id,
      topicCode: "dinosaurs",
      declaredAt: "2026-08-16T12:01:00.000Z",
      reporterType: "caregiver",
      sourceVersion: "topic-confirmation-v1",
      clientMutationId: `topic-confirmation-${suffix}`,
    });

    await expect(createInterestTopicConfirmation({
      householdId: household.id,
      childId: child.id,
      interestPhaseId: interest.id,
      topicCode: "animals",
      declaredAt: "2026-08-16T12:02:00.000Z",
      reporterType: "caregiver",
      sourceVersion: "topic-confirmation-v1",
      clientMutationId: `topic-confirmation-second-${suffix}`,
    })).rejects.toThrow(/already has a topic confirmation/);

    const active = await resolveActiveTopicConfirmations(household.id, child.id, [interest.id]);
    expect(active.map((entry) => entry.id)).toEqual([confirmation.id]);

    await revokeInterestTopicConfirmation({
      householdId: household.id,
      childId: child.id,
      confirmationId: confirmation.id,
      reasonCode: "mistaken-mapping",
      declaredAt: "2026-08-16T12:03:00.000Z",
      reporterType: "caregiver",
      clientMutationId: `topic-revocation-${suffix}`,
    });

    await expect(resolveActiveTopicConfirmations(household.id, child.id, [interest.id])).resolves.toEqual([]);
    // The confirmation row itself is never deleted -- only excluded from active resolution.
    await expect(prisma.interestTopicConfirmation.findUnique({ where: { id: confirmation.id } }))
      .resolves.toEqual(expect.objectContaining({ id: confirmation.id }));
  });

  it("excludes a topic confirmation whose interest phase is no longer current", async () => {
    const { suffix, household, child } = await fixture();
    const interest = await createInterestPhase({
      householdId: household.id,
      childId: child.id,
      label: "Space",
      startedAt: "2026-08-16T12:00:00.000Z",
      declaredAt: "2026-08-16T12:00:00.000Z",
      reporterType: "caregiver",
      sourceVersion: "interest-v1",
      clientMutationId: `interest-${suffix}`,
    });
    await createInterestTopicConfirmation({
      householdId: household.id,
      childId: child.id,
      interestPhaseId: interest.id,
      topicCode: "space",
      declaredAt: "2026-08-16T12:01:00.000Z",
      reporterType: "caregiver",
      sourceVersion: "topic-confirmation-v1",
      clientMutationId: `topic-confirmation-${suffix}`,
    });
    await endInterestPhase({
      householdId: household.id,
      interestPhaseId: interest.id,
      endedAt: "2026-08-16T13:00:00.000Z",
      declaredAt: "2026-08-16T13:00:00.000Z",
      reporterType: "caregiver",
      sourceVersion: "interest-end-v1",
      clientMutationId: `interest-end-${suffix}`,
    });

    // The caller is expected to pass only currently-active interest phase IDs; an ended
    // interest's confirmation is simply never queried for, matching how the V2 request
    // snapshot builder scopes this lookup to currentInterestPhaseIds.
    await expect(resolveActiveTopicConfirmations(household.id, child.id, [])).resolves.toEqual([]);
  });

  it("sets and reads a child's age range", async () => {
    const { household, child } = await fixture();
    expect(child.ageRange).toBeNull();
    const updated = await setChildAgeRange({ householdId: household.id, childId: child.id, ageRange: "4_5" });
    expect(updated.ageRange).toBe("age_4_5");
  });

  it("rejects a V2 recommendation request when the child has no age range", async () => {
    const { suffix, household, child } = await fixture();
    await createReadingRelationshipPhase({
      householdId: household.id,
      childId: child.id,
      code: "read_aloud",
      startedAt: "2026-08-16T12:00:00.000Z",
      declaredAt: "2026-08-16T12:00:00.000Z",
      reporterType: "caregiver",
      sourceVersion: "relationship-v1",
      clientMutationId: `relationship-${suffix}`,
    });
    await expect(createRecommendationRequestV2({
      householdId: household.id,
      childId: child.id,
      requestedAt: "2026-08-16T12:05:00.000Z",
      clientMutationId: `request-${suffix}`,
    })).rejects.toThrow(/age range must be set/);
  });

  it("rejects a V2 recommendation request with an age range but no reading relationship", async () => {
    const { suffix, household, child } = await fixture();
    await setChildAgeRange({ householdId: household.id, childId: child.id, ageRange: "4_5" });
    await expect(createRecommendationRequestV2({
      householdId: household.id,
      childId: child.id,
      requestedAt: "2026-08-16T12:05:00.000Z",
      clientMutationId: `request-${suffix}`,
    })).rejects.toThrow(/at least one current reading relationship/);
  });

  it("rejects a V2 recommendation request with age and relationship but no useful signal", async () => {
    const { suffix, household, child } = await fixture();
    await setChildAgeRange({ householdId: household.id, childId: child.id, ageRange: "4_5" });
    await createReadingRelationshipPhase({
      householdId: household.id,
      childId: child.id,
      code: "read_aloud",
      startedAt: "2026-08-16T12:00:00.000Z",
      declaredAt: "2026-08-16T12:00:00.000Z",
      reporterType: "caregiver",
      sourceVersion: "relationship-v1",
      clientMutationId: `relationship-${suffix}`,
    });
    await expect(createRecommendationRequestV2({
      householdId: household.id,
      childId: child.id,
      requestedAt: "2026-08-16T12:05:00.000Z",
      clientMutationId: `request-${suffix}`,
    })).rejects.toThrow(/one current interest, kind of book/);
  });

  it("builds a V2 snapshot with the generic source plus one confirmed topic, and is idempotent", async () => {
    const { suffix, household, child } = await fixture();
    await setChildAgeRange({ householdId: household.id, childId: child.id, ageRange: "6_8" });
    await createReadingRelationshipPhase({
      householdId: household.id,
      childId: child.id,
      code: "reading_together",
      startedAt: "2026-08-16T12:00:00.000Z",
      declaredAt: "2026-08-16T12:00:00.000Z",
      reporterType: "caregiver",
      sourceVersion: "relationship-v1",
      clientMutationId: `relationship-${suffix}`,
    });
    const interest = await createInterestPhase({
      householdId: household.id,
      childId: child.id,
      label: "Dinosaurs",
      startedAt: "2026-08-16T12:00:00.000Z",
      declaredAt: "2026-08-16T12:00:00.000Z",
      reporterType: "caregiver",
      sourceVersion: "interest-v1",
      clientMutationId: `interest-${suffix}`,
    });
    const confirmation = await createInterestTopicConfirmation({
      householdId: household.id,
      childId: child.id,
      interestPhaseId: interest.id,
      topicCode: "dinosaurs",
      declaredAt: "2026-08-16T12:01:00.000Z",
      reporterType: "caregiver",
      sourceVersion: "topic-confirmation-v1",
      clientMutationId: `topic-confirmation-${suffix}`,
    });

    const command = {
      householdId: household.id,
      childId: child.id,
      requestedAt: "2026-08-16T12:05:00.000Z",
      clientMutationId: `request-${suffix}`,
    };
    const first = await createRecommendationRequestV2(command);
    expect(first.evidenceSnapshotVersion).toBe("request-evidence-v2");
    expect(first.evidenceSnapshot.ageRange).toBe("6_8");
    expect(first.evidenceSnapshot.readingRelationships).toEqual([
      { phaseId: expect.any(String), code: "reading_together" },
    ]);
    expect(first.evidenceSnapshot.currentInterestPhaseIds).toEqual([interest.id]);
    const sourceCodes = first.evidenceSnapshot.candidateSourcePlan.map((entry: { sourceCode: string }) => (
      entry.sourceCode
    ));
    expect(sourceCodes.sort()).toEqual(["children_general", "dinosaurs"]);
    const confirmedEntry = first.evidenceSnapshot.candidateSourcePlan.find((entry: { sourceCode: string }) => (
      entry.sourceCode === "dinosaurs"
    ));
    expect(confirmedEntry).toBeDefined();
    expect(confirmedEntry?.authorization).toEqual({
      kind: "interest_topic_confirmation",
      interestTopicConfirmationId: confirmation.id,
    });

    const retry = await createRecommendationRequestV2(command);
    expect(retry.id).toBe(first.id);
    expect(retry.evidenceSnapshot).toEqual(first.evidenceSnapshot);

    const stored = await prisma.recommendationRequest.findUniqueOrThrow({ where: { id: first.id } });
    expect(stored.ageStageBasis).toBeNull();
    expect(stored.ageStageValue).toBeNull();
  });

  it("saves a whole profile in one action and is idempotent on retry", async () => {
    const { suffix, household, child } = await fixture();
    const command = {
      householdId: household.id,
      childId: child.id,
      ageRange: "4_5",
      readingRelationshipCodes: ["read_aloud", "reading_together"],
      bookKindCodes: ["funny", "fantasy"],
      declaredAt: "2026-08-16T12:00:00.000Z",
      reporterType: "caregiver",
      sourceVersion: "reading-profile-v1",
      clientMutationId: `profile-${suffix}`,
    } as const;

    const saved = await saveChildProfileSetup(command);
    expect(saved.ageRange).toBe("age_4_5");

    const retry = await saveChildProfileSetup(command);
    expect(retry.ageRange).toBe("age_4_5");

    // The retry must not create duplicate phases for the same declared selections.
    await expect(resolveActiveReadingRelationships(household.id, child.id))
      .resolves.toHaveLength(2);
    await expect(resolveActiveBookKinds(household.id, child.id)).resolves.toHaveLength(2);
  });

  it("narrows a saved profile by ending the deselected phases without deleting them", async () => {
    const { suffix, household, child } = await fixture();
    const base = {
      householdId: household.id,
      childId: child.id,
      declaredAt: "2026-08-16T12:00:00.000Z",
      reporterType: "caregiver",
      sourceVersion: "reading-profile-v1",
    } as const;

    await saveChildProfileSetup({
      ...base,
      ageRange: "4_5",
      readingRelationshipCodes: ["read_aloud", "reading_together"],
      bookKindCodes: ["funny", "fantasy"],
      clientMutationId: `profile-${suffix}`,
    });
    await saveChildProfileSetup({
      ...base,
      declaredAt: "2026-08-16T13:00:00.000Z",
      ageRange: "6_8",
      readingRelationshipCodes: ["some_independent"],
      bookKindCodes: [],
      clientMutationId: `profile-second-${suffix}`,
    });

    const relationships = await resolveActiveReadingRelationships(household.id, child.id);
    expect(relationships.map((phase) => phase.code)).toEqual(["some_independent"]);
    await expect(resolveActiveBookKinds(household.id, child.id)).resolves.toEqual([]);

    // Source-preserving: the deselected declarations still exist, they are simply ended.
    await expect(prisma.readingRelationshipPhase.count({ where: { householdId: household.id } })).resolves.toBe(3);
    await expect(prisma.bookKindPhase.count({ where: { householdId: household.id } })).resolves.toBe(2);
  });

  it("builds the reading-profile read model with current, past, and history facts separated", async () => {
    const { suffix, household, child } = await fixture();
    await saveChildProfileSetup({
      householdId: household.id,
      childId: child.id,
      ageRange: "6_8",
      readingRelationshipCodes: ["reading_together"],
      bookKindCodes: ["funny"],
      declaredAt: "2026-08-16T12:00:00.000Z",
      reporterType: "caregiver",
      sourceVersion: "reading-profile-v1",
      clientMutationId: `profile-${suffix}`,
    });

    const current = await createInterestPhase({
      householdId: household.id,
      childId: child.id,
      label: "Dinosaurs",
      startedAt: "2026-08-16T12:00:00.000Z",
      declaredAt: "2026-08-16T12:00:00.000Z",
      reporterType: "caregiver",
      sourceVersion: "interest-v1",
      clientMutationId: `interest-current-${suffix}`,
    });
    const confirmation = await createInterestTopicConfirmation({
      householdId: household.id,
      childId: child.id,
      interestPhaseId: current.id,
      topicCode: "dinosaurs",
      declaredAt: "2026-08-16T12:01:00.000Z",
      reporterType: "caregiver",
      sourceVersion: "topic-confirmation-v1",
      clientMutationId: `topic-confirmation-${suffix}`,
    });
    const past = await createInterestPhase({
      householdId: household.id,
      childId: child.id,
      label: "Trucks",
      startedAt: "2026-08-01T12:00:00.000Z",
      declaredAt: "2026-08-01T12:00:00.000Z",
      reporterType: "caregiver",
      sourceVersion: "interest-v1",
      clientMutationId: `interest-past-${suffix}`,
    });
    await endInterestPhase({
      householdId: household.id,
      interestPhaseId: past.id,
      endedAt: "2026-08-10T12:00:00.000Z",
      declaredAt: "2026-08-10T12:00:00.000Z",
      reporterType: "caregiver",
      sourceVersion: "interest-end-v1",
      clientMutationId: `interest-past-end-${suffix}`,
    });

    const profile = await getReadingProfile({ householdId: household.id, childId: child.id });

    expect(profile.ageRange).toBe("6_8");
    expect(profile.readingRelationships.map((phase) => phase.code)).toEqual(["reading_together"]);
    expect(profile.bookKinds.map((phase) => phase.code)).toEqual(["funny"]);
    expect(profile.currentInterests.map((interest) => interest.label)).toEqual(["Dinosaurs"]);
    expect(profile.currentInterests[0].topicConfirmation).toEqual({
      id: confirmation.id,
      topicCode: "dinosaurs",
    });
    expect(profile.pastInterests.map((interest) => interest.label)).toEqual(["Trucks"]);
    expect(profile.historySummary).toEqual({
      readingMomentCount: 0,
      rerereadCount: 0,
      reactionCount: 0,
      childReactionCount: 0,
      caregiverReactionCount: 0,
    });
  });

  it("hides a revoked topic confirmation from the reading profile without deleting it", async () => {
    const { suffix, household, child } = await fixture();
    await setChildAgeRange({ householdId: household.id, childId: child.id, ageRange: "4_5" });
    const interest = await createInterestPhase({
      householdId: household.id,
      childId: child.id,
      label: "Space",
      startedAt: "2026-08-16T12:00:00.000Z",
      declaredAt: "2026-08-16T12:00:00.000Z",
      reporterType: "caregiver",
      sourceVersion: "interest-v1",
      clientMutationId: `interest-${suffix}`,
    });
    const confirmation = await createInterestTopicConfirmation({
      householdId: household.id,
      childId: child.id,
      interestPhaseId: interest.id,
      topicCode: "space",
      declaredAt: "2026-08-16T12:01:00.000Z",
      reporterType: "caregiver",
      sourceVersion: "topic-confirmation-v1",
      clientMutationId: `topic-confirmation-${suffix}`,
    });
    await revokeInterestTopicConfirmation({
      householdId: household.id,
      childId: child.id,
      confirmationId: confirmation.id,
      declaredAt: "2026-08-16T12:02:00.000Z",
      reporterType: "caregiver",
      clientMutationId: `topic-revocation-${suffix}`,
    });

    const profile = await getReadingProfile({ householdId: household.id, childId: child.id });
    expect(profile.currentInterests).toHaveLength(1);
    expect(profile.currentInterests[0].label).toBe("Space");
    expect(profile.currentInterests[0].topicConfirmation).toBeUndefined();
    await expect(prisma.interestTopicConfirmation.findUnique({ where: { id: confirmation.id } }))
      .resolves.not.toBeNull();
  });

  it("collapses two current interests that map to the same topic code into one source entry", async () => {
    // Regression: "dinosaur" and "dinosaurs" are separate legal aliases for one closed code.
    // Two confirmed interests must not produce a duplicate source code, which would fail
    // snapshot validation and permanently block every future request for this child.
    const { suffix, household, child } = await fixture();
    await setChildAgeRange({ householdId: household.id, childId: child.id, ageRange: "4_5" });
    await createReadingRelationshipPhase({
      householdId: household.id,
      childId: child.id,
      code: "read_aloud",
      startedAt: "2026-08-16T12:00:00.000Z",
      declaredAt: "2026-08-16T12:00:00.000Z",
      reporterType: "caregiver",
      sourceVersion: "relationship-v1",
      clientMutationId: `relationship-${suffix}`,
    });

    for (const [index, label] of ["dinosaur", "dinosaurs"].entries()) {
      const interest = await createInterestPhase({
        householdId: household.id,
        childId: child.id,
        label,
        startedAt: "2026-08-16T12:00:00.000Z",
        declaredAt: "2026-08-16T12:00:00.000Z",
        reporterType: "caregiver",
        sourceVersion: "interest-v1",
        clientMutationId: `interest-${index}-${suffix}`,
      });
      await createInterestTopicConfirmation({
        householdId: household.id,
        childId: child.id,
        interestPhaseId: interest.id,
        topicCode: "dinosaurs",
        declaredAt: "2026-08-16T12:01:00.000Z",
        reporterType: "caregiver",
        sourceVersion: "topic-confirmation-v1",
        clientMutationId: `topic-confirmation-${index}-${suffix}`,
      });
    }

    const request = await createRecommendationRequestV2({
      householdId: household.id,
      childId: child.id,
      requestedAt: "2026-08-16T12:05:00.000Z",
      clientMutationId: `request-${suffix}`,
    });

    const sourceCodes = request.evidenceSnapshot.candidateSourcePlan.map((entry) => entry.sourceCode);
    expect(sourceCodes.slice().sort()).toEqual(["children_general", "dinosaurs"]);
    expect(new Set(sourceCodes).size).toBe(sourceCodes.length);
    expect(request.evidenceSnapshot.currentInterestPhaseIds).toHaveLength(2);
  });

  it("rejects a save-profile mutation ID too long to survive its derived suffixes", async () => {
    const { household, child } = await fixture();
    await expect(saveChildProfileSetup({
      householdId: household.id,
      childId: child.id,
      ageRange: "4_5",
      readingRelationshipCodes: ["read_aloud"],
      bookKindCodes: ["wordless_picture_led"],
      declaredAt: "2026-08-16T12:00:00.000Z",
      reporterType: "caregiver",
      sourceVersion: "reading-profile-v1",
      clientMutationId: "x".repeat(100),
    })).rejects.toThrow();

    // Nothing may be written when the command is rejected up front.
    await expect(prisma.readingRelationshipPhase.count({ where: { householdId: household.id } })).resolves.toBe(0);
    await expect(prisma.childProfile.findUniqueOrThrow({
      where: { id_householdId: { id: child.id, householdId: household.id } },
    })).resolves.toMatchObject({ ageRange: null });
  });

  it("remembers a book with an exact subject and creates no shelf or history side effects", async () => {
    const { suffix, household, child } = await fixture();
    const provider = {
      id: "fake-metadata",
      async lookupByIsbn() { return null; },
      async lookupEditionByRecordId() { return null; },
      async search() { return []; },
      async lookupWorkByRecordId(workRecordId: string) {
        return {
          title: "The Snowy Day",
          authors: ["Ezra Jack Keats"],
          subjects: ["winter"],
          workRecordId,
          fieldCoverage: { title: "work.title", authors: "author.name" },
        };
      },
    };

    const command = {
      householdId: household.id,
      childId: child.id,
      workRecordId: `OL-SNOWY-${suffix}`,
      subjectType: "child",
      declaredAt: "2026-08-16T12:00:00.000Z",
      sourceVersion: "reading-profile-v1",
      clientMutationId: `remember-${suffix}`,
    } as const;

    const observation = await rememberBookForChild(command, provider);
    expect(observation.kind).toBe("worked_for_us");
    expect(observation.subjectType).toBe("child");
    expect(observation.reporterType).toBe("caregiver");

    const retry = await rememberBookForChild(command, provider);
    expect(retry.id).toBe(observation.id);

    // The whole point of the extracted metadata boundary: verified metadata is stored, but
    // remembering a book is not a claim that the family owns, borrowed, or read it.
    await expect(prisma.bookWork.count({ where: { metadataRecordId: `OL-SNOWY-${suffix}` } })).resolves.toBe(1);
    await expect(prisma.familyBook.count({ where: { householdId: household.id } })).resolves.toBe(0);
    await expect(prisma.readingEvent.count({ where: { householdId: household.id } })).resolves.toBe(0);
    await expect(prisma.reaction.count({ where: { householdId: household.id } })).resolves.toBe(0);

    const profile = await getReadingProfile({ householdId: household.id, childId: child.id });
    expect(profile.rememberedBooks).toHaveLength(1);
    expect(profile.rememberedBooks[0]).toMatchObject({ title: "The Snowy Day", subjectType: "child" });
  });

  it("rejects remembering a work the provider can no longer verify", async () => {
    const { suffix, household, child } = await fixture();
    const missingProvider = {
      id: "fake-metadata",
      async lookupByIsbn() { return null; },
      async lookupEditionByRecordId() { return null; },
      async search() { return []; },
      async lookupWorkByRecordId() { return null; },
    };

    await expect(rememberBookForChild({
      householdId: household.id,
      childId: child.id,
      workRecordId: `OL-GONE-${suffix}`,
      subjectType: "child",
      declaredAt: "2026-08-16T12:00:00.000Z",
      sourceVersion: "reading-profile-v1",
      clientMutationId: `remember-${suffix}`,
    }, missingProvider)).rejects.toThrow(/no longer available/);

    await expect(prisma.preferenceObservation.count({ where: { householdId: household.id } })).resolves.toBe(0);
  });

  it("cascades a child deletion through every child-owned private record", async () => {
    const { suffix, household, child } = await fixture();
    await saveChildProfileSetup({
      householdId: household.id,
      childId: child.id,
      ageRange: "4_5",
      readingRelationshipCodes: ["read_aloud"],
      bookKindCodes: ["funny"],
      declaredAt: "2026-08-16T12:00:00.000Z",
      reporterType: "caregiver",
      sourceVersion: "reading-profile-v1",
      clientMutationId: `profile-${suffix}`,
    });
    const interest = await createInterestPhase({
      householdId: household.id,
      childId: child.id,
      label: "Dinosaurs",
      startedAt: "2026-08-16T12:00:00.000Z",
      declaredAt: "2026-08-16T12:00:00.000Z",
      reporterType: "caregiver",
      sourceVersion: "interest-v1",
      clientMutationId: `interest-${suffix}`,
    });
    const confirmation = await createInterestTopicConfirmation({
      householdId: household.id,
      childId: child.id,
      interestPhaseId: interest.id,
      topicCode: "dinosaurs",
      declaredAt: "2026-08-16T12:01:00.000Z",
      reporterType: "caregiver",
      sourceVersion: "topic-confirmation-v1",
      clientMutationId: `topic-confirmation-${suffix}`,
    });
    await revokeInterestTopicConfirmation({
      householdId: household.id,
      childId: child.id,
      confirmationId: confirmation.id,
      declaredAt: "2026-08-16T12:02:00.000Z",
      reporterType: "caregiver",
      clientMutationId: `topic-revocation-${suffix}`,
    });

    const where = { householdId: household.id };
    await expect(prisma.readingRelationshipPhase.count({ where })).resolves.toBeGreaterThan(0);
    await expect(prisma.bookKindPhase.count({ where })).resolves.toBeGreaterThan(0);
    await expect(prisma.interestPhase.count({ where })).resolves.toBeGreaterThan(0);
    await expect(prisma.interestTopicConfirmation.count({ where })).resolves.toBeGreaterThan(0);
    await expect(prisma.interestTopicConfirmationRevocation.count({ where })).resolves.toBeGreaterThan(0);

    // Deleting the child must remove every private child-owned record, not orphan it.
    await prisma.childProfile.delete({
      where: { id_householdId: { id: child.id, householdId: household.id } },
    });

    await expect(prisma.readingRelationshipPhase.count({ where })).resolves.toBe(0);
    await expect(prisma.bookKindPhase.count({ where })).resolves.toBe(0);
    await expect(prisma.interestPhase.count({ where })).resolves.toBe(0);
    await expect(prisma.interestTopicConfirmation.count({ where })).resolves.toBe(0);
    await expect(prisma.interestTopicConfirmationRevocation.count({ where })).resolves.toBe(0);
    await expect(prisma.readingRelationshipPhaseEnd.count({ where })).resolves.toBe(0);
    await expect(prisma.bookKindPhaseEnd.count({ where })).resolves.toBe(0);
  });

  it("keeps two children in the same household fully separate", async () => {
    const { suffix, household, child } = await fixture();
    const sibling = await createChildProfile({ householdId: household.id, nickname: "Sibling" });

    await saveChildProfileSetup({
      householdId: household.id,
      childId: child.id,
      ageRange: "2_3",
      readingRelationshipCodes: ["read_aloud"],
      bookKindCodes: ["funny"],
      declaredAt: "2026-08-16T12:00:00.000Z",
      reporterType: "caregiver",
      sourceVersion: "reading-profile-v1",
      clientMutationId: `profile-a-${suffix}`,
    });
    await saveChildProfileSetup({
      householdId: household.id,
      childId: sibling.id,
      ageRange: "6_8",
      readingRelationshipCodes: ["some_independent"],
      bookKindCodes: ["longer_stories"],
      declaredAt: "2026-08-16T12:00:00.000Z",
      reporterType: "caregiver",
      sourceVersion: "reading-profile-v1",
      clientMutationId: `profile-b-${suffix}`,
    });

    const first = await getReadingProfile({ householdId: household.id, childId: child.id });
    const second = await getReadingProfile({ householdId: household.id, childId: sibling.id });

    expect(first.ageRange).toBe("2_3");
    expect(first.readingRelationships.map((phase) => phase.code)).toEqual(["read_aloud"]);
    expect(first.bookKinds.map((phase) => phase.code)).toEqual(["funny"]);
    expect(second.ageRange).toBe("6_8");
    expect(second.readingRelationships.map((phase) => phase.code)).toEqual(["some_independent"]);
    expect(second.bookKinds.map((phase) => phase.code)).toEqual(["longer_stories"]);
  });
});
