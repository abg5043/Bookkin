import type { ReadingRelationshipPhase, ReadingRelationshipPhaseEnd } from "@prisma/client";
import {
  readingRelationshipCodeSchema,
  readingRelationshipPhaseEndInputSchema,
  readingRelationshipPhaseInputSchema,
} from "@/domain/reading-relationships/validation";
import { DomainInvariantError } from "@/domain/shared/errors";
import { resolveValidChains } from "@/domain/reading/valid-chain";
import { amendmentCommandSchema, caregiverReporterSchema } from "@/domain/reading/validation";
import { prisma } from "@/infrastructure/db/prisma";
import { assertChildBelongsToHousehold, sameInstant } from "@/application/shared/ownership";
import { z } from "zod";

function phaseMatches(
  existing: ReadingRelationshipPhase,
  input: ReturnType<typeof readingRelationshipPhaseInputSchema.parse>,
): boolean {
  return existing.childId === input.childId
    && existing.code === input.code
    && sameInstant(existing.startedAt, input.startedAt)
    && sameInstant(existing.declaredAt, input.declaredAt)
    && existing.reporterType === input.reporterType
    && existing.sourceVersion === input.sourceVersion;
}

function endMatches(
  existing: ReadingRelationshipPhaseEnd,
  input: ReturnType<typeof readingRelationshipPhaseEndInputSchema.parse>,
): boolean {
  return existing.relationshipPhaseId === input.relationshipPhaseId
    && sameInstant(existing.endedAt, input.endedAt)
    && sameInstant(existing.declaredAt, input.declaredAt)
    && existing.reporterType === input.reporterType
    && existing.sourceVersion === input.sourceVersion;
}

function resolvePhaseChains<T extends ReadingRelationshipPhase & {
  targetAmendment: { id: string; householdId: string; kind: "retract" | "replace"; targetId: string; replacementId: string | null } | null;
}>(phases: T[], householdId: string) {
  return resolveValidChains(phases, phases.flatMap((phase) => (
    phase.targetAmendment === null ? [] : [phase.targetAmendment]
  )), {
    expectedHouseholdId: householdId,
    isCompatibleReplacement: (target, replacement) => target.childId === replacement.childId,
  });
}

export async function createReadingRelationshipPhase(rawInput: unknown): Promise<ReadingRelationshipPhase> {
  const input = readingRelationshipPhaseInputSchema.parse(rawInput);
  return prisma.$transaction(async (transaction) => {
    await assertChildBelongsToHousehold(transaction, input.householdId, input.childId);
    const phase = await transaction.readingRelationshipPhase.upsert({
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
      throw new DomainInvariantError("This reading-relationship mutation ID was already used for different input.");
    }
    return phase;
  });
}

export async function endReadingRelationshipPhase(rawInput: unknown): Promise<ReadingRelationshipPhaseEnd> {
  const input = readingRelationshipPhaseEndInputSchema.parse(rawInput);
  return prisma.$transaction(async (transaction) => {
    const existingMutation = await transaction.readingRelationshipPhaseEnd.findUnique({
      where: {
        householdId_clientMutationId: {
          householdId: input.householdId,
          clientMutationId: input.clientMutationId,
        },
      },
    });
    if (existingMutation !== null) {
      if (!endMatches(existingMutation, input)) {
        throw new DomainInvariantError("This reading-relationship-end mutation ID was already used for different input.");
      }
      return existingMutation;
    }

    const phase = await transaction.readingRelationshipPhase.findUnique({
      where: {
        id_householdId: {
          id: input.relationshipPhaseId,
          householdId: input.householdId,
        },
      },
      select: { id: true, childId: true, startedAt: true },
    });
    if (phase === null) throw new DomainInvariantError("The reading-relationship phase does not belong to this household.");

    const householdPhases = await transaction.readingRelationshipPhase.findMany({
      where: { householdId: input.householdId, childId: phase.childId },
      include: { targetAmendment: true },
    });
    const resolution = resolvePhaseChains(householdPhases, input.householdId);
    if (!resolution.leaves.some((record) => record.id === phase.id)) {
      throw new DomainInvariantError("Only a current valid reading-relationship phase can be ended.");
    }
    if (input.endedAt < phase.startedAt) {
      throw new DomainInvariantError("A reading-relationship phase cannot end before it starts.");
    }

    const existingForPhase = await transaction.readingRelationshipPhaseEnd.findUnique({
      where: { relationshipPhaseId: input.relationshipPhaseId },
    });
    if (existingForPhase !== null) {
      if (!endMatches(existingForPhase, input)) {
        throw new DomainInvariantError("This reading-relationship phase already has a different end declaration.");
      }
      return existingForPhase;
    }

    return transaction.readingRelationshipPhaseEnd.create({ data: input });
  });
}

export const readingRelationshipPhaseCorrectionSchema = z.discriminatedUnion("kind", [
  amendmentCommandSchema.extend({ kind: z.literal("retract") }).strict(),
  amendmentCommandSchema.extend({
    kind: z.literal("replace"),
    replacement: readingRelationshipPhaseInputSchema,
  }).strict(),
]);

export async function correctReadingRelationshipPhase(rawCommand: unknown) {
  const command = readingRelationshipPhaseCorrectionSchema.parse(rawCommand);
  return prisma.$transaction(async (transaction) => {
    const existing = await transaction.readingRelationshipPhaseAmendment.findUnique({
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
        throw new DomainInvariantError("This reading-relationship-correction mutation ID was already used for different input.");
      }
      if (command.kind === "replace") {
        const replacement = existing.replacementId === null
          ? null
          : await transaction.readingRelationshipPhase.findUnique({ where: { id: existing.replacementId } });
        if (replacement === null || !phaseMatches(replacement, command.replacement)) {
          throw new DomainInvariantError("This reading-relationship-correction mutation ID was already used for different input.");
        }
      }
      return existing;
    }

    const records = await transaction.readingRelationshipPhase.findMany({
      where: { householdId: command.householdId },
      include: { targetAmendment: true },
    });
    const resolution = resolvePhaseChains(records, command.householdId);
    const target = resolution.leaves.find((record) => record.id === command.targetId);
    if (target === undefined) {
      throw new DomainInvariantError("Only a current valid reading-relationship phase can be corrected.");
    }

    if (command.kind === "retract") {
      return transaction.readingRelationshipPhaseAmendment.create({
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
      throw new DomainInvariantError("A replacement reading-relationship phase must keep the same household and child.");
    }

    const replacement = await transaction.readingRelationshipPhase.create({ data: command.replacement });
    return transaction.readingRelationshipPhaseAmendment.create({
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

export async function resolveActiveReadingRelationships(
  householdId: string,
  childId: string,
): Promise<ReadingRelationshipPhase[]> {
  const phases = await prisma.readingRelationshipPhase.findMany({
    where: { householdId, childId },
    include: { end: true, targetAmendment: true },
  });
  const resolution = resolvePhaseChains(phases, householdId);
  return resolution.leaves.filter((phase) => phase.end === null);
}

const syncReadingRelationshipsInputSchema = z.object({
  householdId: z.string().trim().min(1).max(120),
  childId: z.string().trim().min(1).max(120),
  desiredCodes: z.array(readingRelationshipCodeSchema).min(1),
  declaredAt: z.coerce.date(),
  reporterType: caregiverReporterSchema,
  sourceVersion: z.string().trim().min(1).max(80),
  batchMutationId: z.string().trim().min(1).max(120),
}).strict();

/**
 * Ends every active phase not in `desiredCodes` and starts every desired code not already
 * active. Per-change mutation IDs are derived deterministically from `batchMutationId` so a
 * retried "Save profile" submission is safe. Not a single atomic transaction across changes --
 * each phase transition commits independently and is idempotently retryable on its own, which
 * matches this codebase's existing granularity for phase mutations.
 */
export async function syncReadingRelationships(rawInput: unknown): Promise<ReadingRelationshipPhase[]> {
  const input = syncReadingRelationshipsInputSchema.parse(rawInput);
  const desired = new Set<string>(input.desiredCodes);
  const active = await resolveActiveReadingRelationships(input.householdId, input.childId);
  const activeCodes = new Set(active.map((phase) => phase.code));

  for (const phase of active) {
    if (desired.has(phase.code)) continue;
    await endReadingRelationshipPhase({
      householdId: input.householdId,
      relationshipPhaseId: phase.id,
      endedAt: input.declaredAt,
      declaredAt: input.declaredAt,
      reporterType: input.reporterType,
      sourceVersion: input.sourceVersion,
      // Keyed by phase ID, not code: if two concurrent saves ever create two active phases for
      // one code, a code-keyed ID would collide and permanently wedge this axis with a
      // "already used for different input" error.
      clientMutationId: `${input.batchMutationId}:end:${phase.id}`,
    });
  }
  for (const code of input.desiredCodes) {
    if (activeCodes.has(code)) continue;
    await createReadingRelationshipPhase({
      householdId: input.householdId,
      childId: input.childId,
      code,
      startedAt: input.declaredAt,
      declaredAt: input.declaredAt,
      reporterType: input.reporterType,
      sourceVersion: input.sourceVersion,
      clientMutationId: `${input.batchMutationId}:start:${code}`,
    });
  }
  return resolveActiveReadingRelationships(input.householdId, input.childId);
}
