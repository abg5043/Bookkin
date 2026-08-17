import type { Prisma, RecommendationRequest } from "@prisma/client";
import { z } from "zod";
import { resolveCurrentReadingRecords, readingGraphFromRows } from "@/application/reading/current-records";
import { assertChildBelongsToHousehold, assertVerifiedWork, sameInstant } from "@/application/shared/ownership";
import { resolveValidChains } from "@/domain/reading/valid-chain";
import {
  ageStageBandV1Schema,
  assertColdStartReady,
  requestEvidenceV1Schema,
  requestEvidenceVersion,
  sortedUniqueIds,
  type RequestEvidenceV1,
} from "@/domain/recommendations/request-evidence";
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

export const recommendationRequestCommandSchema = z.object({
  householdId: identifierSchema,
  childId: identifierSchema,
  requestedAt: z.coerce.date(),
  ageStageBand: ageStageBandV1Schema,
  clientMutationId: identifierSchema,
  references: z.array(requestReferenceCommandSchema).max(20).default([]),
}).strict().superRefine((command, context) => {
  const referenceKeys = command.references.map((reference) => `${reference.purpose}:${reference.workId}`);
  if (new Set(referenceKeys).size !== referenceKeys.length) {
    context.addIssue({
      code: "custom",
      path: ["references"],
      message: "A request can reference a work only once for each purpose.",
    });
  }
  const mutationIds = command.references.map((reference) => reference.clientMutationId);
  if (new Set(mutationIds).size !== mutationIds.length) {
    context.addIssue({
      code: "custom",
      path: ["references"],
      message: "Request-reference mutation IDs must be unique.",
    });
  }
});

export type RecommendationRequestCommand = z.infer<typeof recommendationRequestCommandSchema>;

function toPrismaAgeStageValue(value: RecommendationRequestCommand["ageStageBand"]["value"]) {
  if (value === "2_3") return "age_2_3" as const;
  if (value === "4_5") return "age_4_5" as const;
  if (value === "6_8") return "age_6_8" as const;
  return value;
}

function fromPrismaAgeStageValue(value: RecommendationRequest["ageStageValue"]): string {
  if (value === "age_2_3") return "2_3";
  if (value === "age_4_5") return "4_5";
  if (value === "age_6_8") return "6_8";
  if (value === null) {
    throw new DomainInvariantError("This recommendation request has no legacy age/stage value to compare.");
  }
  return value;
}

async function buildCurrentEvidence(
  transaction: Prisma.TransactionClient,
  householdId: string,
  childId: string,
  ageStageBand: RecommendationRequestCommand["ageStageBand"],
  requestReferenceIds: readonly string[],
): Promise<RequestEvidenceV1> {
  const [phases, observations, readingRows] = await Promise.all([
    transaction.interestPhase.findMany({
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

  const phaseResolution = resolveValidChains(phases, phases.flatMap((phase) => (
    phase.targetAmendment === null ? [] : [phase.targetAmendment]
  )), {
    expectedHouseholdId: householdId,
    isCompatibleReplacement: (target, replacement) => target.childId === replacement.childId,
  });

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

  const snapshot = requestEvidenceV1Schema.parse({
    ageStageBand,
    currentInterestPhaseIds: sortedUniqueIds(
      phaseResolution.leaves.filter((phase) => phase.end === null).map((phase) => phase.id),
    ),
    historicalInterestPhaseIds: sortedUniqueIds(
      phaseResolution.leaves.filter((phase) => phase.end !== null).map((phase) => phase.id),
    ),
    preferenceObservationIds: sortedUniqueIds(observationResolution.leaves.map((observation) => observation.id)),
    readingEventIds: sortedUniqueIds(currentReadings.map((event) => event.id)),
    reactionIds: sortedUniqueIds(currentReadings.flatMap((event) => event.reactions.map((reaction) => reaction.id))),
    requestReferenceIds: sortedUniqueIds(requestReferenceIds),
  });
  assertColdStartReady(snapshot);
  return snapshot;
}

function referenceMatches(
  existing: {
    workId: string;
    purpose: "more_like_this";
    selectedAt: Date;
    sourceVersion: string;
    clientMutationId: string;
  },
  input: RecommendationRequestCommand["references"][number],
): boolean {
  return existing.workId === input.workId
    && existing.purpose === input.purpose
    && sameInstant(existing.selectedAt, input.selectedAt)
    && existing.sourceVersion === input.sourceVersion
    && existing.clientMutationId === input.clientMutationId;
}

export async function createRecommendationRequest(
  rawCommand: unknown,
): Promise<RecommendationRequest & { evidenceSnapshot: RequestEvidenceV1 }> {
  const command = recommendationRequestCommandSchema.parse(rawCommand);

  return prisma.$transaction(async (transaction) => {
    await assertChildBelongsToHousehold(transaction, command.householdId, command.childId);

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
      const ageStageMatches = existing.ageStageBasis === command.ageStageBand.basis
        && fromPrismaAgeStageValue(existing.ageStageValue) === command.ageStageBand.value;
      const expectedReferences = [...command.references]
        .sort((left, right) => left.clientMutationId.localeCompare(right.clientMutationId));
      if (
        existing.childId !== command.childId
        || !sameInstant(existing.requestedAt, command.requestedAt)
        || !ageStageMatches
        || existing.references.length !== expectedReferences.length
        || existing.references.some((reference, index) => !referenceMatches(reference, expectedReferences[index]))
      ) {
        throw new DomainInvariantError("This request mutation ID was already used for different input.");
      }
      return {
        ...existing,
        evidenceSnapshot: requestEvidenceV1Schema.parse(existing.evidenceSnapshot),
      };
    }

    for (const reference of command.references) {
      await assertVerifiedWork(transaction, reference.workId);
    }

    const preliminarySnapshot = requestEvidenceV1Schema.parse({
      ageStageBand: command.ageStageBand,
      currentInterestPhaseIds: [],
      historicalInterestPhaseIds: [],
      preferenceObservationIds: [],
      readingEventIds: [],
      reactionIds: [],
      requestReferenceIds: [],
    });

    const request = await transaction.recommendationRequest.create({
      data: {
        householdId: command.householdId,
        childId: command.childId,
        requestedAt: command.requestedAt,
        ageStageBasis: command.ageStageBand.basis,
        ageStageValue: toPrismaAgeStageValue(command.ageStageBand.value),
        evidenceSnapshotVersion: requestEvidenceVersion,
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

    const evidenceSnapshot = await buildCurrentEvidence(
      transaction,
      command.householdId,
      command.childId,
      command.ageStageBand,
      references.map((reference) => reference.id),
    );

    const completed = await transaction.recommendationRequest.update({
      where: { id_householdId: { id: request.id, householdId: command.householdId } },
      data: { evidenceSnapshot },
    });

    return { ...completed, evidenceSnapshot };
  });
}
