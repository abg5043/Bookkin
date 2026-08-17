import type { InterestTopicConfirmation, InterestTopicConfirmationRevocation } from "@prisma/client";
import { z } from "zod";
import { DomainInvariantError } from "@/domain/shared/errors";
import { caregiverReporterSchema } from "@/domain/reading/validation";
import { topicCodeSchema } from "@/domain/interests/topic-codes";
import { prisma } from "@/infrastructure/db/prisma";
import { assertChildBelongsToHousehold, sameInstant } from "@/application/shared/ownership";

const identifierSchema = z.string().trim().min(1).max(120);
const confirmableTopicCodeSchema = topicCodeSchema.exclude(["children_general"]);

export const interestTopicConfirmationInputSchema = z.object({
  householdId: identifierSchema,
  childId: identifierSchema,
  interestPhaseId: identifierSchema,
  topicCode: confirmableTopicCodeSchema,
  declaredAt: z.coerce.date(),
  reporterType: caregiverReporterSchema,
  sourceVersion: z.string().trim().min(1).max(80),
  clientMutationId: identifierSchema,
}).strict();

function confirmationMatches(
  existing: InterestTopicConfirmation,
  input: ReturnType<typeof interestTopicConfirmationInputSchema.parse>,
): boolean {
  return existing.childId === input.childId
    && existing.interestPhaseId === input.interestPhaseId
    && existing.topicCode === input.topicCode
    && sameInstant(existing.declaredAt, input.declaredAt)
    && existing.reporterType === input.reporterType
    && existing.sourceVersion === input.sourceVersion;
}

/**
 * `Use this broad topic` only. `Not now` or dismissal stores no mapping and never calls this.
 * At most one confirmation per interest phase; a corrected/replaced interest requires a new
 * confirmation on its own replacement phase rather than reusing this one.
 */
export async function createInterestTopicConfirmation(rawInput: unknown): Promise<InterestTopicConfirmation> {
  const input = interestTopicConfirmationInputSchema.parse(rawInput);
  return prisma.$transaction(async (transaction) => {
    await assertChildBelongsToHousehold(transaction, input.householdId, input.childId);

    const phase = await transaction.interestPhase.findUnique({
      where: { id_householdId: { id: input.interestPhaseId, householdId: input.householdId } },
      select: { id: true, childId: true },
    });
    if (phase === null || phase.childId !== input.childId) {
      throw new DomainInvariantError("The interest phase does not belong to this household and child.");
    }

    const existingMutation = await transaction.interestTopicConfirmation.findUnique({
      where: {
        householdId_clientMutationId: {
          householdId: input.householdId,
          clientMutationId: input.clientMutationId,
        },
      },
    });
    if (existingMutation !== null) {
      if (!confirmationMatches(existingMutation, input)) {
        throw new DomainInvariantError("This topic-confirmation mutation ID was already used for different input.");
      }
      return existingMutation;
    }

    const existingForPhase = await transaction.interestTopicConfirmation.findUnique({
      where: {
        interestPhaseId_householdId: {
          interestPhaseId: input.interestPhaseId,
          householdId: input.householdId,
        },
      },
    });
    if (existingForPhase !== null) {
      throw new DomainInvariantError(
        "This interest already has a topic confirmation; revoke it before confirming a different topic.",
      );
    }

    return transaction.interestTopicConfirmation.create({ data: input });
  });
}

export const interestTopicConfirmationRevocationInputSchema = z.object({
  householdId: identifierSchema,
  childId: identifierSchema,
  confirmationId: identifierSchema,
  reasonCode: z.string().trim().min(1).max(80).optional(),
  declaredAt: z.coerce.date(),
  reporterType: caregiverReporterSchema,
  clientMutationId: identifierSchema,
}).strict();

function revocationMatches(
  existing: InterestTopicConfirmationRevocation,
  input: ReturnType<typeof interestTopicConfirmationRevocationInputSchema.parse>,
): boolean {
  return existing.childId === input.childId
    && existing.confirmationId === input.confirmationId
    && (existing.reasonCode ?? undefined) === input.reasonCode
    && sameInstant(existing.declaredAt, input.declaredAt)
    && existing.reporterType === input.reporterType;
}

/** Records a mistaken mapping explicitly; it is never silently overwritten by a later confirmation. */
export async function revokeInterestTopicConfirmation(
  rawInput: unknown,
): Promise<InterestTopicConfirmationRevocation> {
  const input = interestTopicConfirmationRevocationInputSchema.parse(rawInput);
  return prisma.$transaction(async (transaction) => {
    const existingMutation = await transaction.interestTopicConfirmationRevocation.findUnique({
      where: {
        householdId_clientMutationId: {
          householdId: input.householdId,
          clientMutationId: input.clientMutationId,
        },
      },
    });
    if (existingMutation !== null) {
      if (!revocationMatches(existingMutation, input)) {
        throw new DomainInvariantError(
          "This topic-confirmation-revocation mutation ID was already used for different input.",
        );
      }
      return existingMutation;
    }

    const confirmation = await transaction.interestTopicConfirmation.findUnique({
      where: { id_householdId: { id: input.confirmationId, householdId: input.householdId } },
      select: { id: true, childId: true },
    });
    if (confirmation === null || confirmation.childId !== input.childId) {
      throw new DomainInvariantError("The topic confirmation does not belong to this household and child.");
    }

    const existingRevocation = await transaction.interestTopicConfirmationRevocation.findUnique({
      where: {
        confirmationId_householdId: {
          confirmationId: input.confirmationId,
          householdId: input.householdId,
        },
      },
    });
    if (existingRevocation !== null) {
      if (!revocationMatches(existingRevocation, input)) {
        throw new DomainInvariantError("This topic confirmation already has a different revocation.");
      }
      return existingRevocation;
    }

    return transaction.interestTopicConfirmationRevocation.create({ data: input });
  });
}

/** Confirmations whose interest phase is still current, and which have not been revoked. */
export async function resolveActiveTopicConfirmations(
  householdId: string,
  childId: string,
  currentInterestPhaseIds: readonly string[],
): Promise<InterestTopicConfirmation[]> {
  if (currentInterestPhaseIds.length === 0) return [];
  const currentIds = new Set(currentInterestPhaseIds);
  const confirmations = await prisma.interestTopicConfirmation.findMany({
    where: { householdId, childId, interestPhaseId: { in: [...currentIds] } },
    include: { revocation: true },
  });
  return confirmations.filter((confirmation) => confirmation.revocation === null);
}
