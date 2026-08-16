import type { PreferenceObservation } from "@prisma/client";
import { preferenceObservationInputSchema } from "@/domain/preferences/validation";
import { amendmentCommandSchema } from "@/domain/reading/validation";
import { resolveValidChains } from "@/domain/reading/valid-chain";
import { DomainInvariantError } from "@/domain/shared/errors";
import { prisma } from "@/infrastructure/db/prisma";
import { assertChildBelongsToHousehold, assertVerifiedWork, sameInstant } from "@/application/shared/ownership";
import { z } from "zod";

function matchesInput(
  existing: PreferenceObservation,
  input: ReturnType<typeof preferenceObservationInputSchema.parse>,
): boolean {
  return existing.childId === input.childId
    && existing.workId === input.workId
    && existing.kind === input.kind
    && existing.subjectType === input.subjectType
    && existing.reporterType === input.reporterType
    && sameInstant(existing.declaredAt, input.declaredAt)
    && existing.sourceType === input.sourceType
    && existing.sourceVersion === input.sourceVersion;
}

export async function createPreferenceObservation(rawInput: unknown): Promise<PreferenceObservation> {
  const input = preferenceObservationInputSchema.parse(rawInput);

  return prisma.$transaction(async (transaction) => {
    await assertChildBelongsToHousehold(transaction, input.householdId, input.childId);
    await assertVerifiedWork(transaction, input.workId);

    const observation = await transaction.preferenceObservation.upsert({
      where: {
        householdId_clientMutationId: {
          householdId: input.householdId,
          clientMutationId: input.clientMutationId,
        },
      },
      update: {},
      create: input,
    });

    if (!matchesInput(observation, input)) {
      throw new DomainInvariantError("This preference mutation ID was already used for different input.");
    }
    return observation;
  });
}

export const preferenceObservationCorrectionSchema = z.discriminatedUnion("kind", [
  amendmentCommandSchema.extend({ kind: z.literal("retract") }).strict(),
  amendmentCommandSchema.extend({
    kind: z.literal("replace"),
    replacement: preferenceObservationInputSchema,
  }).strict(),
]);

export async function correctPreferenceObservation(rawCommand: unknown) {
  const command = preferenceObservationCorrectionSchema.parse(rawCommand);
  return prisma.$transaction(async (transaction) => {
    const existing = await transaction.preferenceObservationAmendment.findUnique({
      where: {
        householdId_clientMutationId: {
          householdId: command.householdId,
          clientMutationId: command.clientMutationId,
        },
      },
    });
    if (existing !== null) {
      if (
        existing.targetId !== command.targetId
        || existing.kind !== command.kind
        || !sameInstant(existing.declaredAt, command.declaredAt)
        || existing.reporterType !== command.reporterType
        || (existing.reasonCode ?? undefined) !== command.reasonCode
      ) {
        throw new DomainInvariantError("This preference-correction mutation ID was already used for different input.");
      }
      if (command.kind === "replace") {
        const replacement = existing.replacementId === null
          ? null
          : await transaction.preferenceObservation.findUnique({ where: { id: existing.replacementId } });
        if (replacement === null || !matchesInput(replacement, command.replacement)) {
          throw new DomainInvariantError("This preference-correction mutation ID was already used for different input.");
        }
      }
      return existing;
    }

    const records = await transaction.preferenceObservation.findMany({
      where: { householdId: command.householdId },
      include: { targetAmendment: true },
    });
    const resolution = resolveValidChains(records, records.flatMap((record) => (
      record.targetAmendment === null ? [] : [record.targetAmendment]
    )), {
      expectedHouseholdId: command.householdId,
      isCompatibleReplacement: (target, replacement) => (
        target.childId === replacement.childId
        && target.workId === replacement.workId
        && target.kind === replacement.kind
      ),
    });
    const target = resolution.leaves.find((record) => record.id === command.targetId);
    if (target === undefined) {
      throw new DomainInvariantError("Only a current valid preference observation can be corrected.");
    }

    if (command.kind === "retract") {
      return transaction.preferenceObservationAmendment.create({
        data: {
          householdId: command.householdId,
          kind: command.kind,
          targetId: command.targetId,
          declaredAt: command.declaredAt,
          reporterType: command.reporterType,
          reasonCode: command.reasonCode,
          clientMutationId: command.clientMutationId,
        },
      });
    }

    const replacementInput = preferenceObservationInputSchema.parse(command.replacement);
    if (
      replacementInput.householdId !== target.householdId
      || replacementInput.childId !== target.childId
      || replacementInput.workId !== target.workId
      || replacementInput.kind !== target.kind
    ) {
      throw new DomainInvariantError("A replacement preference must keep the same household, child, work, and kind.");
    }
    await assertVerifiedWork(transaction, replacementInput.workId);
    const replacement = await transaction.preferenceObservation.create({ data: replacementInput });
    return transaction.preferenceObservationAmendment.create({
      data: {
        householdId: command.householdId,
        kind: command.kind,
        targetId: command.targetId,
        replacementId: replacement.id,
        declaredAt: command.declaredAt,
        reporterType: command.reporterType,
        reasonCode: command.reasonCode,
        clientMutationId: command.clientMutationId,
      },
    });
  });
}
