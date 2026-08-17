import type { BookKindPhase, BookKindPhaseEnd } from "@prisma/client";
import {
  bookKindCodeSchema,
  bookKindPhaseEndInputSchema,
  bookKindPhaseInputSchema,
} from "@/domain/book-kinds/validation";
import { DomainInvariantError } from "@/domain/shared/errors";
import { resolveValidChains } from "@/domain/reading/valid-chain";
import { amendmentCommandSchema, caregiverReporterSchema } from "@/domain/reading/validation";
import { prisma } from "@/infrastructure/db/prisma";
import { assertChildBelongsToHousehold, sameInstant } from "@/application/shared/ownership";
import { z } from "zod";

function phaseMatches(
  existing: BookKindPhase,
  input: ReturnType<typeof bookKindPhaseInputSchema.parse>,
): boolean {
  return existing.childId === input.childId
    && existing.code === input.code
    && sameInstant(existing.startedAt, input.startedAt)
    && sameInstant(existing.declaredAt, input.declaredAt)
    && existing.reporterType === input.reporterType
    && existing.sourceVersion === input.sourceVersion;
}

function endMatches(
  existing: BookKindPhaseEnd,
  input: ReturnType<typeof bookKindPhaseEndInputSchema.parse>,
): boolean {
  return existing.bookKindPhaseId === input.bookKindPhaseId
    && sameInstant(existing.endedAt, input.endedAt)
    && sameInstant(existing.declaredAt, input.declaredAt)
    && existing.reporterType === input.reporterType
    && existing.sourceVersion === input.sourceVersion;
}

function resolvePhaseChains<T extends BookKindPhase & {
  targetAmendment: { id: string; householdId: string; kind: "retract" | "replace"; targetId: string; replacementId: string | null } | null;
}>(phases: T[], householdId: string) {
  return resolveValidChains(phases, phases.flatMap((phase) => (
    phase.targetAmendment === null ? [] : [phase.targetAmendment]
  )), {
    expectedHouseholdId: householdId,
    isCompatibleReplacement: (target, replacement) => target.childId === replacement.childId,
  });
}

export async function createBookKindPhase(rawInput: unknown): Promise<BookKindPhase> {
  const input = bookKindPhaseInputSchema.parse(rawInput);
  return prisma.$transaction(async (transaction) => {
    await assertChildBelongsToHousehold(transaction, input.householdId, input.childId);
    const phase = await transaction.bookKindPhase.upsert({
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
      throw new DomainInvariantError("This book-kind mutation ID was already used for different input.");
    }
    return phase;
  });
}

export async function endBookKindPhase(rawInput: unknown): Promise<BookKindPhaseEnd> {
  const input = bookKindPhaseEndInputSchema.parse(rawInput);
  return prisma.$transaction(async (transaction) => {
    const existingMutation = await transaction.bookKindPhaseEnd.findUnique({
      where: {
        householdId_clientMutationId: {
          householdId: input.householdId,
          clientMutationId: input.clientMutationId,
        },
      },
    });
    if (existingMutation !== null) {
      if (!endMatches(existingMutation, input)) {
        throw new DomainInvariantError("This book-kind-end mutation ID was already used for different input.");
      }
      return existingMutation;
    }

    const phase = await transaction.bookKindPhase.findUnique({
      where: {
        id_householdId: {
          id: input.bookKindPhaseId,
          householdId: input.householdId,
        },
      },
      select: { id: true, childId: true, startedAt: true },
    });
    if (phase === null) throw new DomainInvariantError("The book-kind phase does not belong to this household.");

    const householdPhases = await transaction.bookKindPhase.findMany({
      where: { householdId: input.householdId, childId: phase.childId },
      include: { targetAmendment: true },
    });
    const resolution = resolvePhaseChains(householdPhases, input.householdId);
    if (!resolution.leaves.some((record) => record.id === phase.id)) {
      throw new DomainInvariantError("Only a current valid book-kind phase can be ended.");
    }
    if (input.endedAt < phase.startedAt) {
      throw new DomainInvariantError("A book-kind phase cannot end before it starts.");
    }

    const existingForPhase = await transaction.bookKindPhaseEnd.findUnique({
      where: { bookKindPhaseId: input.bookKindPhaseId },
    });
    if (existingForPhase !== null) {
      if (!endMatches(existingForPhase, input)) {
        throw new DomainInvariantError("This book-kind phase already has a different end declaration.");
      }
      return existingForPhase;
    }

    return transaction.bookKindPhaseEnd.create({ data: input });
  });
}

export const bookKindPhaseCorrectionSchema = z.discriminatedUnion("kind", [
  amendmentCommandSchema.extend({ kind: z.literal("retract") }).strict(),
  amendmentCommandSchema.extend({
    kind: z.literal("replace"),
    replacement: bookKindPhaseInputSchema,
  }).strict(),
]);

export async function correctBookKindPhase(rawCommand: unknown) {
  const command = bookKindPhaseCorrectionSchema.parse(rawCommand);
  return prisma.$transaction(async (transaction) => {
    const existing = await transaction.bookKindPhaseAmendment.findUnique({
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
        throw new DomainInvariantError("This book-kind-correction mutation ID was already used for different input.");
      }
      if (command.kind === "replace") {
        const replacement = existing.replacementId === null
          ? null
          : await transaction.bookKindPhase.findUnique({ where: { id: existing.replacementId } });
        if (replacement === null || !phaseMatches(replacement, command.replacement)) {
          throw new DomainInvariantError("This book-kind-correction mutation ID was already used for different input.");
        }
      }
      return existing;
    }

    const records = await transaction.bookKindPhase.findMany({
      where: { householdId: command.householdId },
      include: { targetAmendment: true },
    });
    const resolution = resolvePhaseChains(records, command.householdId);
    const target = resolution.leaves.find((record) => record.id === command.targetId);
    if (target === undefined) {
      throw new DomainInvariantError("Only a current valid book-kind phase can be corrected.");
    }

    if (command.kind === "retract") {
      return transaction.bookKindPhaseAmendment.create({
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
      throw new DomainInvariantError("A replacement book-kind phase must keep the same household and child.");
    }

    const replacement = await transaction.bookKindPhase.create({ data: command.replacement });
    return transaction.bookKindPhaseAmendment.create({
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

export async function resolveActiveBookKinds(
  householdId: string,
  childId: string,
): Promise<BookKindPhase[]> {
  const phases = await prisma.bookKindPhase.findMany({
    where: { householdId, childId },
    include: { end: true, targetAmendment: true },
  });
  const resolution = resolvePhaseChains(phases, householdId);
  return resolution.leaves.filter((phase) => phase.end === null);
}

const syncBookKindsInputSchema = z.object({
  householdId: z.string().trim().min(1).max(120),
  childId: z.string().trim().min(1).max(120),
  desiredCodes: z.array(bookKindCodeSchema),
  declaredAt: z.coerce.date(),
  reporterType: caregiverReporterSchema,
  sourceVersion: z.string().trim().min(1).max(80),
  batchMutationId: z.string().trim().min(1).max(120),
}).strict();

/**
 * Ends every active phase not in `desiredCodes` and starts every desired code not already
 * active. Book kinds are optional, so an empty `desiredCodes` array is valid and simply ends
 * everything currently active. See syncReadingRelationships for the idempotency approach.
 */
export async function syncBookKinds(rawInput: unknown): Promise<BookKindPhase[]> {
  const input = syncBookKindsInputSchema.parse(rawInput);
  const desired = new Set<string>(input.desiredCodes);
  const active = await resolveActiveBookKinds(input.householdId, input.childId);
  const activeCodes = new Set(active.map((phase) => phase.code));

  for (const phase of active) {
    if (desired.has(phase.code)) continue;
    await endBookKindPhase({
      householdId: input.householdId,
      bookKindPhaseId: phase.id,
      endedAt: input.declaredAt,
      declaredAt: input.declaredAt,
      reporterType: input.reporterType,
      sourceVersion: input.sourceVersion,
      // Keyed by phase ID, not code -- see syncReadingRelationships for the collision this avoids.
      clientMutationId: `${input.batchMutationId}:end:${phase.id}`,
    });
  }
  for (const code of input.desiredCodes) {
    if (activeCodes.has(code)) continue;
    await createBookKindPhase({
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
  return resolveActiveBookKinds(input.householdId, input.childId);
}
