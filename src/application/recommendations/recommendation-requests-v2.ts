import type { Prisma, RecommendationRequest } from "@prisma/client";
import { z } from "zod";
import { resolveCurrentReadingRecords, readingGraphFromRows } from "@/application/reading/current-records";
import { assertChildBelongsToHousehold, assertVerifiedWork, sameInstant } from "@/application/shared/ownership";
import { resolveValidChains } from "@/domain/reading/valid-chain";
import { fromPrismaAgeRange } from "@/domain/children/age-range";
import { sortedUniqueIds } from "@/domain/recommendations/request-evidence";
import {
  assertColdStartReadyV2,
  requestEvidenceV2Schema,
  requestEvidenceV2Version,
  type RequestEvidenceV2,
} from "@/domain/recommendations/request-evidence-v2";
import { CHILDREN_GENERAL_TOPIC_CODE } from "@/domain/interests/topic-codes";
import { DomainInvariantError } from "@/domain/shared/errors";
import { prisma } from "@/infrastructure/db/prisma";

const identifierSchema = z.string().trim().min(1).max(120);

const requestReferenceCommandSchema = z.object({
  workId: identifierSchema,
  purpose: z.literal("more_like_this"),
  selectedAt: z.coerce.date(),
  sourceVersion: z.string().trim().min(1).max(80),
  clientMutationId: identifierSchema,
}).strict();

export const recommendationRequestV2CommandSchema = z.object({
  householdId: identifierSchema,
  childId: identifierSchema,
  requestedAt: z.coerce.date(),
  clientMutationId: identifierSchema,
  references: z.array(requestReferenceCommandSchema).max(1).default([]),
}).strict();

export type RecommendationRequestV2Command = z.infer<typeof recommendationRequestV2CommandSchema>;

function referenceMatches(
  existing: {
    workId: string;
    purpose: "more_like_this";
    selectedAt: Date;
    sourceVersion: string;
    clientMutationId: string;
  },
  input: RecommendationRequestV2Command["references"][number],
): boolean {
  return existing.workId === input.workId
    && existing.purpose === input.purpose
    && sameInstant(existing.selectedAt, input.selectedAt)
    && existing.sourceVersion === input.sourceVersion
    && existing.clientMutationId === input.clientMutationId;
}

async function buildCurrentEvidenceV2(
  transaction: Prisma.TransactionClient,
  householdId: string,
  childId: string,
  ageRange: "age_2_3" | "age_4_5" | "age_6_8",
  requestReferenceIds: readonly string[],
): Promise<RequestEvidenceV2> {
  const [relationshipPhases, interestPhases, bookKindPhases, observations, readingRows] = await Promise.all([
    transaction.readingRelationshipPhase.findMany({
      where: { householdId, childId },
      include: { end: true, targetAmendment: true },
    }),
    transaction.interestPhase.findMany({
      where: { householdId, childId },
      include: { end: true, targetAmendment: true },
    }),
    transaction.bookKindPhase.findMany({
      where: { householdId, childId },
      include: { end: true, targetAmendment: true },
    }),
    transaction.preferenceObservation.findMany({
      where: { householdId, childId },
      include: { targetAmendment: true },
    }),
    transaction.readingEvent.findMany({
      where: { householdId, childId },
      include: {
        targetAmendment: true,
        reactions: { include: { targetAmendment: true } },
      },
    }),
  ]);

  const relationshipResolution = resolveValidChains(relationshipPhases, relationshipPhases.flatMap((phase) => (
    phase.targetAmendment === null ? [] : [phase.targetAmendment]
  )), {
    expectedHouseholdId: householdId,
    isCompatibleReplacement: (target, replacement) => target.childId === replacement.childId,
  });
  const activeRelationships = relationshipResolution.leaves.filter((phase) => phase.end === null);

  const interestResolution = resolveValidChains(interestPhases, interestPhases.flatMap((phase) => (
    phase.targetAmendment === null ? [] : [phase.targetAmendment]
  )), {
    expectedHouseholdId: householdId,
    isCompatibleReplacement: (target, replacement) => target.childId === replacement.childId,
  });
  const currentInterestPhases = interestResolution.leaves.filter((phase) => phase.end === null);
  const historicalInterestPhases = interestResolution.leaves.filter((phase) => phase.end !== null);
  const currentInterestPhaseIds = sortedUniqueIds(currentInterestPhases.map((phase) => phase.id));

  const bookKindResolution = resolveValidChains(bookKindPhases, bookKindPhases.flatMap((phase) => (
    phase.targetAmendment === null ? [] : [phase.targetAmendment]
  )), {
    expectedHouseholdId: householdId,
    isCompatibleReplacement: (target, replacement) => target.childId === replacement.childId,
  });
  const activeBookKinds = bookKindResolution.leaves.filter((phase) => phase.end === null);

  const observationResolution = resolveValidChains(observations, observations.flatMap((observation) => (
    observation.targetAmendment === null ? [] : [observation.targetAmendment]
  )), {
    expectedHouseholdId: householdId,
    isCompatibleReplacement: (target, replacement) => (
      target.childId === replacement.childId
      && target.workId === replacement.workId
      && target.kind === replacement.kind
    ),
  });

  const graph = readingGraphFromRows(readingRows);
  const currentReadings = resolveCurrentReadingRecords(
    householdId,
    graph.events,
    graph.eventAmendments,
    graph.reactions,
    graph.reactionAmendments,
  );

  const unrevokedConfirmations = currentInterestPhaseIds.length === 0
    ? []
    : (await transaction.interestTopicConfirmation.findMany({
      where: { householdId, childId, interestPhaseId: { in: currentInterestPhaseIds } },
      include: { revocation: true },
      orderBy: { id: "asc" },
    })).filter((confirmation) => confirmation.revocation === null);

  // Two separate current interests can legitimately map to the same closed topic code (for
  // example the aliases "dinosaur" and "dinosaurs"). The source plan requires unique source
  // codes, so collapse duplicates deterministically by lowest confirmation ID rather than
  // letting the snapshot fail validation and block every future request for this child.
  const confirmationsByTopicCode = new Map<string, (typeof unrevokedConfirmations)[number]>();
  for (const confirmation of unrevokedConfirmations) {
    if (!confirmationsByTopicCode.has(confirmation.topicCode)) {
      confirmationsByTopicCode.set(confirmation.topicCode, confirmation);
    }
  }
  const planConfirmations = [...confirmationsByTopicCode.values()];

  const snapshot = requestEvidenceV2Schema.parse({
    ageRange: fromPrismaAgeRange(ageRange),
    readingRelationships: [...activeRelationships]
      .map((phase) => ({ phaseId: phase.id, code: phase.code }))
      .sort((left, right) => left.phaseId.localeCompare(right.phaseId)),
    currentInterestPhaseIds,
    historicalInterestPhaseIds: sortedUniqueIds(historicalInterestPhases.map((phase) => phase.id)),
    bookKinds: [...activeBookKinds]
      .map((phase) => ({ phaseId: phase.id, code: phase.code }))
      .sort((left, right) => left.phaseId.localeCompare(right.phaseId)),
    preferenceObservationIds: sortedUniqueIds(observationResolution.leaves.map((observation) => observation.id)),
    readingEventIds: sortedUniqueIds(currentReadings.map((event) => event.id)),
    reactionIds: sortedUniqueIds(currentReadings.flatMap((event) => event.reactions.map((reaction) => reaction.id))),
    requestReferenceIds: sortedUniqueIds(requestReferenceIds).slice(0, 1),
    candidateSourcePlan: [
      { sourceCode: CHILDREN_GENERAL_TOPIC_CODE, authorization: { kind: "generic" as const } },
      ...planConfirmations.map((confirmation) => ({
        sourceCode: confirmation.topicCode,
        authorization: {
          kind: "interest_topic_confirmation" as const,
          interestTopicConfirmationId: confirmation.id,
        },
      })),
    ],
  });
  assertColdStartReadyV2(snapshot);
  return snapshot;
}

export async function createRecommendationRequestV2(
  rawCommand: unknown,
): Promise<RecommendationRequest & { evidenceSnapshot: RequestEvidenceV2 }> {
  const command = recommendationRequestV2CommandSchema.parse(rawCommand);

  return prisma.$transaction(async (transaction) => {
    await assertChildBelongsToHousehold(transaction, command.householdId, command.childId);
    const child = await transaction.childProfile.findUnique({
      where: { id_householdId: { id: command.childId, householdId: command.householdId } },
      select: { ageRange: true },
    });
    if (child === null) throw new DomainInvariantError("The child does not belong to this household.");
    if (child.ageRange === null) {
      throw new DomainInvariantError("This child's age range must be set before a recommendation request.");
    }
    const ageRange = child.ageRange;

    const existing = await transaction.recommendationRequest.findUnique({
      where: {
        householdId_clientMutationId: {
          householdId: command.householdId,
          clientMutationId: command.clientMutationId,
        },
      },
      include: { references: { orderBy: { clientMutationId: "asc" } } },
    });
    if (existing !== null) {
      const expectedReferences = [...command.references]
        .sort((left, right) => left.clientMutationId.localeCompare(right.clientMutationId));
      if (
        existing.childId !== command.childId
        || existing.evidenceSnapshotVersion !== requestEvidenceV2Version
        || !sameInstant(existing.requestedAt, command.requestedAt)
        || existing.references.length !== expectedReferences.length
        || existing.references.some((reference, index) => !referenceMatches(reference, expectedReferences[index]))
      ) {
        throw new DomainInvariantError("This request mutation ID was already used for different input.");
      }
      return {
        ...existing,
        evidenceSnapshot: requestEvidenceV2Schema.parse(existing.evidenceSnapshot),
      };
    }

    for (const reference of command.references) {
      await assertVerifiedWork(transaction, reference.workId);
    }

    const preliminarySnapshot = requestEvidenceV2Schema.parse({
      ageRange: fromPrismaAgeRange(ageRange),
      readingRelationships: [],
      currentInterestPhaseIds: [],
      historicalInterestPhaseIds: [],
      bookKinds: [],
      preferenceObservationIds: [],
      readingEventIds: [],
      reactionIds: [],
      requestReferenceIds: [],
      candidateSourcePlan: [{ sourceCode: CHILDREN_GENERAL_TOPIC_CODE, authorization: { kind: "generic" as const } }],
    });

    const request = await transaction.recommendationRequest.create({
      data: {
        householdId: command.householdId,
        childId: command.childId,
        requestedAt: command.requestedAt,
        ageStageBasis: null,
        ageStageValue: null,
        evidenceSnapshotVersion: requestEvidenceV2Version,
        evidenceSnapshot: preliminarySnapshot,
        clientMutationId: command.clientMutationId,
      },
    });

    const references = [];
    for (const reference of command.references) {
      references.push(await transaction.recommendationRequestReference.create({
        data: {
          householdId: command.householdId,
          requestId: request.id,
          ...reference,
        },
      }));
    }

    const evidenceSnapshot = await buildCurrentEvidenceV2(
      transaction,
      command.householdId,
      command.childId,
      ageRange,
      references.map((reference) => reference.id),
    );

    const completed = await transaction.recommendationRequest.update({
      where: { id_householdId: { id: request.id, householdId: command.householdId } },
      data: { evidenceSnapshot },
    });

    return { ...completed, evidenceSnapshot };
  });
}
