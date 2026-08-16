import type { InterestPhase, InterestPhaseEnd } from "@prisma/client";
import {
  interestPhaseEndInputSchema,
  interestPhaseInputSchema,
} from "@/domain/interests/validation";
import { DomainInvariantError } from "@/domain/shared/errors";
import { resolveValidChains } from "@/domain/reading/valid-chain";
import { amendmentCommandSchema } from "@/domain/reading/validation";
import { prisma } from "@/infrastructure/db/prisma";
import { assertChildBelongsToHousehold, sameInstant } from "@/application/shared/ownership";
import { z } from "zod";

function phaseMatches(
  existing: InterestPhase,
  input: ReturnType<typeof interestPhaseInputSchema.parse>,
): boolean {
  return existing.childId === input.childId
    && existing.label === input.label
    && sameInstant(existing.startedAt, input.startedAt)
    && sameInstant(existing.declaredAt, input.declaredAt)
    && existing.reporterType === input.reporterType
    && existing.sourceVersion === input.sourceVersion;
}

function endMatches(
  existing: InterestPhaseEnd,
  input: ReturnType<typeof interestPhaseEndInputSchema.parse>,
): boolean {
  return existing.interestPhaseId === input.interestPhaseId
    && sameInstant(existing.endedAt, input.endedAt)
    && sameInstant(existing.declaredAt, input.declaredAt)
    && existing.reporterType === input.reporterType
    && existing.sourceVersion === input.sourceVersion;
}

export async function createInterestPhase(rawInput: unknown): Promise<InterestPhase> {
  const input = interestPhaseInputSchema.parse(rawInput);
  return prisma.$transaction(async (transaction) => {
    await assertChildBelongsToHousehold(transaction, input.householdId, input.childId);
    const phase = await transaction.interestPhase.upsert({
      where: {
        householdId_clientMutationId: {
          householdId: input.householdId,
          clientMutationId: input.clientMutationId,
        },
      },
      update: {},
      create: input,
    });
    if (!phaseMatches(phase, input)) {
      throw new DomainInvariantError("This interest mutation ID was already used for different input.");
    }
    return phase;
  });
}

export async function endInterestPhase(rawInput: unknown): Promise<InterestPhaseEnd> {
  const input = interestPhaseEndInputSchema.parse(rawInput);
  return prisma.$transaction(async (transaction) => {
    const existingMutation = await transaction.interestPhaseEnd.findUnique({
      where: {
        householdId_clientMutationId: {
          householdId: input.householdId,
          clientMutationId: input.clientMutationId,
        },
      },
    });
    if (existingMutation !== null) {
      if (!endMatches(existingMutation, input)) {
        throw new DomainInvariantError("This interest-end mutation ID was already used for different input.");
      }
      return existingMutation;
    }

    const phase = await transaction.interestPhase.findUnique({
      where: {
        id_householdId: {
          id: input.interestPhaseId,
          householdId: input.householdId,
        },
      },
      select: { id: true, childId: true, startedAt: true },
    });
    if (phase === null) throw new DomainInvariantError("The interest phase does not belong to this household.");

    const householdPhases = await transaction.interestPhase.findMany({
      where: { householdId: input.householdId, childId: phase.childId },
      include: { targetAmendment: true },
    });
    const resolution = resolveValidChains(householdPhases, householdPhases.flatMap((record) => (
      record.targetAmendment === null ? [] : [record.targetAmendment]
    )), {
      expectedHouseholdId: input.householdId,
      isCompatibleReplacement: (target, replacement) => target.childId === replacement.childId,
    });
    if (!resolution.leaves.some((record) => record.id === phase.id)) {
      throw new DomainInvariantError("Only a current valid interest phase can be ended.");
    }
    if (input.endedAt < phase.startedAt) {
      throw new DomainInvariantError("An interest phase cannot end before it starts.");
    }

    const existingForPhase = await transaction.interestPhaseEnd.findUnique({
      where: { interestPhaseId: input.interestPhaseId },
    });
    if (existingForPhase !== null) {
      if (!endMatches(existingForPhase, input)) {
        throw new DomainInvariantError("This interest phase already has a different end declaration.");
      }
      return existingForPhase;
    }

    return transaction.interestPhaseEnd.create({ data: input });
  });
}

const correctedEndSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("none") }).strict(),
  z.object({
    action: z.literal("carry_forward"),
    clientMutationId: z.string().trim().min(1).max(120),
  }).strict(),
  z.object({
    action: z.literal("replace"),
    endedAt: z.coerce.date(),
    declaredAt: z.coerce.date(),
    reporterType: z.literal("caregiver"),
    sourceVersion: z.string().trim().min(1).max(80),
    clientMutationId: z.string().trim().min(1).max(120),
  }).strict(),
  z.object({ action: z.literal("retract") }).strict(),
]);

export const interestPhaseCorrectionSchema = z.discriminatedUnion("kind", [
  amendmentCommandSchema.extend({ kind: z.literal("retract") }).strict(),
  amendmentCommandSchema.extend({
    kind: z.literal("replace"),
    replacement: interestPhaseInputSchema,
    endAccounting: correctedEndSchema,
  }).strict(),
]);

export async function correctInterestPhase(rawCommand: unknown) {
  const command = interestPhaseCorrectionSchema.parse(rawCommand);
  return prisma.$transaction(async (transaction) => {
    const existing = await transaction.interestPhaseAmendment.findUnique({
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
        throw new DomainInvariantError("This interest-correction mutation ID was already used for different input.");
      }
      if (command.kind === "replace") {
        const replacement = existing.replacementId === null
          ? null
          : await transaction.interestPhase.findUnique({
            where: { id: existing.replacementId },
            include: { end: true },
          });
        if (replacement === null || !phaseMatches(replacement, command.replacement)) {
          throw new DomainInvariantError("This interest-correction mutation ID was already used for different input.");
        }
        const target = await transaction.interestPhase.findUnique({
          where: { id: command.targetId },
          include: { end: true },
        });
        if (target === null) {
          throw new DomainInvariantError("The corrected interest source is missing.");
        }
        if (command.endAccounting.action === "none" && target.end !== null) {
          throw new DomainInvariantError("This interest-correction retry has different end accounting.");
        }
        if (command.endAccounting.action === "retract" && (target.end === null || replacement.end !== null)) {
          throw new DomainInvariantError("This interest-correction retry has different end accounting.");
        }
        if (command.endAccounting.action === "carry_forward") {
          if (
            target.end === null
            || replacement.end === null
            || replacement.end.clientMutationId !== command.endAccounting.clientMutationId
            || replacement.end.endedAt.getTime() !== target.end.endedAt.getTime()
            || replacement.end.declaredAt.getTime() !== target.end.declaredAt.getTime()
            || replacement.end.reporterType !== target.end.reporterType
            || replacement.end.sourceVersion !== target.end.sourceVersion
          ) {
            throw new DomainInvariantError("This interest-correction retry has different end accounting.");
          }
        }
        if (command.endAccounting.action === "replace") {
          if (
            replacement.end === null
            || replacement.end.clientMutationId !== command.endAccounting.clientMutationId
            || !sameInstant(replacement.end.endedAt, command.endAccounting.endedAt)
            || !sameInstant(replacement.end.declaredAt, command.endAccounting.declaredAt)
            || replacement.end.reporterType !== command.endAccounting.reporterType
            || replacement.end.sourceVersion !== command.endAccounting.sourceVersion
          ) {
            throw new DomainInvariantError("This interest-correction retry has different end accounting.");
          }
        }
      }
      return existing;
    }

    const records = await transaction.interestPhase.findMany({
      where: { householdId: command.householdId },
      include: { end: true, targetAmendment: true },
    });
    const resolution = resolveValidChains(records, records.flatMap((record) => (
      record.targetAmendment === null ? [] : [record.targetAmendment]
    )), {
      expectedHouseholdId: command.householdId,
      isCompatibleReplacement: (target, replacement) => target.childId === replacement.childId,
    });
    const target = resolution.leaves.find((record) => record.id === command.targetId);
    if (target === undefined) {
      throw new DomainInvariantError("Only a current valid interest phase can be corrected.");
    }

    if (command.kind === "retract") {
      return transaction.interestPhaseAmendment.create({
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

    if (command.replacement.householdId !== target.householdId || command.replacement.childId !== target.childId) {
      throw new DomainInvariantError("A replacement interest phase must keep the same household and child.");
    }
    const hasEnd = target.end !== null;
    if ((!hasEnd && command.endAccounting.action !== "none") || (hasEnd && command.endAccounting.action === "none")) {
      throw new DomainInvariantError("The correction must explicitly account for the current interest end.");
    }

    const replacement = await transaction.interestPhase.create({ data: command.replacement });
    if (command.endAccounting.action === "carry_forward" && target.end !== null) {
      await transaction.interestPhaseEnd.create({
        data: {
          householdId: command.householdId,
          interestPhaseId: replacement.id,
          endedAt: target.end.endedAt,
          declaredAt: target.end.declaredAt,
          reporterType: target.end.reporterType,
          sourceVersion: target.end.sourceVersion,
          clientMutationId: command.endAccounting.clientMutationId,
        },
      });
    } else if (command.endAccounting.action === "replace") {
      if (command.endAccounting.endedAt < replacement.startedAt) {
        throw new DomainInvariantError("An interest phase cannot end before it starts.");
      }
      await transaction.interestPhaseEnd.create({
        data: {
          householdId: command.householdId,
          interestPhaseId: replacement.id,
          endedAt: command.endAccounting.endedAt,
          declaredAt: command.endAccounting.declaredAt,
          reporterType: command.endAccounting.reporterType,
          sourceVersion: command.endAccounting.sourceVersion,
          clientMutationId: command.endAccounting.clientMutationId,
        },
      });
    }

    return transaction.interestPhaseAmendment.create({
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
