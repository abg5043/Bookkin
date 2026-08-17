import { z } from "zod";
import { readingGraphFromRows, resolveCurrentReadingRecords } from "@/application/reading/current-records";
import { resolveValidChains } from "@/domain/reading/valid-chain";
import { fromPrismaAgeRange, type AgeRange } from "@/domain/children/age-range";
import { DomainInvariantError } from "@/domain/shared/errors";
import { decodeSerialized, stringListSchema } from "@/domain/shared/serialized";
import { prisma } from "@/infrastructure/db/prisma";

const inputSchema = z.object({
  householdId: z.string().trim().min(1).max(120),
  childId: z.string().trim().min(1).max(120),
}).strict();

export type ReadingProfileView = {
  childId: string;
  nickname?: string;
  ageRange?: AgeRange;
  readingRelationships: Array<{ phaseId: string; code: string }>;
  currentInterests: Array<{ phaseId: string; label: string; topicConfirmation?: { id: string; topicCode: string } }>;
  pastInterests: Array<{ phaseId: string; label: string; endedAt: string }>;
  bookKinds: Array<{ phaseId: string; code: string }>;
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

/**
 * Aggregate read model for the Reading profile settings screen. Explicit editable profile
 * signals (age range, relationships, interests, book kinds, remembered books) are kept
 * separate from the factual accumulated-history summary, matching the SDD's requirement that
 * neither surface implies an inferred personality or promises improved results.
 */
export async function getReadingProfile(rawInput: unknown): Promise<ReadingProfileView> {
  const input = inputSchema.parse(rawInput);

  const child = await prisma.childProfile.findUnique({
    where: { id_householdId: { id: input.childId, householdId: input.householdId } },
  });
  if (child === null) throw new DomainInvariantError("The child does not belong to this household.");

  const [relationshipPhases, interestPhases, bookKindPhases, observations, readingRows] = await Promise.all([
    prisma.readingRelationshipPhase.findMany({
      where: { householdId: input.householdId, childId: input.childId },
      include: { end: true, targetAmendment: true },
    }),
    prisma.interestPhase.findMany({
      where: { householdId: input.householdId, childId: input.childId },
      include: { end: true, targetAmendment: true, topicConfirmation: { include: { revocation: true } } },
    }),
    prisma.bookKindPhase.findMany({
      where: { householdId: input.householdId, childId: input.childId },
      include: { end: true, targetAmendment: true },
    }),
    prisma.preferenceObservation.findMany({
      where: { householdId: input.householdId, childId: input.childId, kind: "worked_for_us" },
      include: {
        targetAmendment: true,
        // Editions carry the verified cover; without this the declared coverUrl could never
        // be populated and a real cover would render as permanently missing.
        work: { include: { editions: { orderBy: { createdAt: "asc" } } } },
      },
    }),
    prisma.readingEvent.findMany({
      where: { householdId: input.householdId, childId: input.childId },
      include: { targetAmendment: true, reactions: { include: { targetAmendment: true } } },
    }),
  ]);

  const relationshipResolution = resolveValidChains(relationshipPhases, relationshipPhases.flatMap((phase) => (
    phase.targetAmendment === null ? [] : [phase.targetAmendment]
  )), {
    expectedHouseholdId: input.householdId,
    isCompatibleReplacement: (target, replacement) => target.childId === replacement.childId,
  });
  const activeRelationships = relationshipResolution.leaves.filter((phase) => phase.end === null);

  const interestResolution = resolveValidChains(interestPhases, interestPhases.flatMap((phase) => (
    phase.targetAmendment === null ? [] : [phase.targetAmendment]
  )), {
    expectedHouseholdId: input.householdId,
    isCompatibleReplacement: (target, replacement) => target.childId === replacement.childId,
  });

  const bookKindResolution = resolveValidChains(bookKindPhases, bookKindPhases.flatMap((phase) => (
    phase.targetAmendment === null ? [] : [phase.targetAmendment]
  )), {
    expectedHouseholdId: input.householdId,
    isCompatibleReplacement: (target, replacement) => target.childId === replacement.childId,
  });
  const activeBookKinds = bookKindResolution.leaves.filter((phase) => phase.end === null);

  const observationResolution = resolveValidChains(observations, observations.flatMap((observation) => (
    observation.targetAmendment === null ? [] : [observation.targetAmendment]
  )), {
    expectedHouseholdId: input.householdId,
    isCompatibleReplacement: (target, replacement) => (
      target.childId === replacement.childId
      && target.workId === replacement.workId
      && target.kind === replacement.kind
    ),
  });

  const graph = readingGraphFromRows(readingRows);
  const currentReadings = resolveCurrentReadingRecords(
    input.householdId,
    graph.events,
    graph.eventAmendments,
    graph.reactions,
    graph.reactionAmendments,
  );
  const allReactions = currentReadings.flatMap((event) => event.reactions);

  return {
    childId: child.id,
    nickname: child.nickname ?? undefined,
    ageRange: child.ageRange === null ? undefined : fromPrismaAgeRange(child.ageRange),
    readingRelationships: activeRelationships.map((phase) => ({ phaseId: phase.id, code: phase.code })),
    currentInterests: interestResolution.leaves
      .filter((phase) => phase.end === null)
      .map((phase) => ({
        phaseId: phase.id,
        label: phase.label,
        topicConfirmation: phase.topicConfirmation === null || phase.topicConfirmation.revocation !== null
          ? undefined
          : { id: phase.topicConfirmation.id, topicCode: phase.topicConfirmation.topicCode },
      })),
    pastInterests: interestResolution.leaves
      .filter((phase) => phase.end !== null)
      .map((phase) => ({ phaseId: phase.id, label: phase.label, endedAt: phase.end!.endedAt.toISOString() })),
    bookKinds: activeBookKinds.map((phase) => ({ phaseId: phase.id, code: phase.code })),
    rememberedBooks: observationResolution.leaves.map((observation) => {
      // Missing stays missing: only a verified cover URL is reported, never a synthesized one.
      const edition = observation.work.editions.find(
        (candidate) => candidate.coverLargeUrl !== null || candidate.coverSmallUrl !== null,
      );
      return {
        id: observation.id,
        workId: observation.workId,
        title: observation.work.title,
        authors: decodeSerialized(stringListSchema, observation.work.authors),
        coverUrl: edition?.coverLargeUrl ?? edition?.coverSmallUrl ?? undefined,
        subjectType: observation.subjectType,
      };
    }),
    historySummary: {
      readingMomentCount: currentReadings.length,
      rerereadCount: currentReadings.filter((event) => event.eventType === "reread").length,
      reactionCount: allReactions.length,
      childReactionCount: allReactions.filter((reaction) => reaction.subjectType === "child").length,
      caregiverReactionCount: allReactions.filter((reaction) => reaction.subjectType === "caregiver").length,
    },
  };
}
