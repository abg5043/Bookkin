import {
  Prisma,
  type Reaction,
  type ReactionAmendment,
  type ReadingEvent,
  type ReadingEventAmendment,
} from "@prisma/client";
import { z } from "zod";
import { readingGraphFromRows, resolveCurrentReadingRecords } from "@/application/reading/current-records";
import {
  amendmentCommandSchema,
  caregiverReactionValueSchema,
  childReactionValueSchema,
  readingEventInputSchema,
  reactionInputSchema,
} from "@/domain/reading/validation";
import { DomainInvariantError } from "@/domain/shared/errors";
import { prisma } from "@/infrastructure/db/prisma";
import { sameInstant } from "@/application/shared/ownership";

const identifierSchema = z.string().trim().min(1).max(120);
const versionSchema = z.string().trim().min(1).max(80);

const reactionAccountingBase = z.object({
  targetReactionId: identifierSchema,
  amendmentClientMutationId: identifierSchema,
  reasonCode: z.string().trim().min(1).max(80).optional(),
});

const reactionAccountingSchema = z.discriminatedUnion("action", [
  reactionAccountingBase.extend({
    action: z.literal("carry_forward"),
    replacementClientMutationId: identifierSchema,
    sourceVersion: versionSchema,
  }).strict(),
  reactionAccountingBase.extend({
    action: z.literal("replace"),
    replacementClientMutationId: identifierSchema,
    value: z.string().trim().min(1),
    declaredAt: z.coerce.date(),
    sourceVersion: versionSchema,
  }).strict(),
  reactionAccountingBase.extend({ action: z.literal("retract") }).strict(),
]);

export const readingEventCorrectionCommandSchema = z.discriminatedUnion("kind", [
  amendmentCommandSchema.extend({ kind: z.literal("retract") }).strict(),
  amendmentCommandSchema.extend({
    kind: z.literal("replace"),
    replacement: readingEventInputSchema,
    reactionAccounting: z.array(reactionAccountingSchema),
  }).strict(),
]).superRefine((command, context) => {
  if (command.kind !== "replace") return;
  const targets = command.reactionAccounting.map((entry) => entry.targetReactionId);
  if (new Set(targets).size !== targets.length) {
    context.addIssue({ code: "custom", path: ["reactionAccounting"], message: "Each reaction must be accounted for once." });
  }
  const mutationIds = [
    command.clientMutationId,
    command.replacement.clientMutationId,
    ...command.reactionAccounting.flatMap((entry) => [
      entry.amendmentClientMutationId,
      ...(entry.action === "retract" ? [] : [entry.replacementClientMutationId]),
    ]),
  ];
  if (new Set(mutationIds).size !== mutationIds.length) {
    context.addIssue({ code: "custom", message: "Correction mutation IDs must be unique." });
  }
});

export const reactionCorrectionCommandSchema = z.discriminatedUnion("kind", [
  amendmentCommandSchema.extend({ kind: z.literal("retract") }).strict(),
  amendmentCommandSchema.extend({
    kind: z.literal("replace"),
    replacementClientMutationId: identifierSchema,
    value: z.string().trim().min(1),
    declaredAt: z.coerce.date(),
    sourceVersion: versionSchema,
  }).strict(),
]);

async function loadHouseholdReadingGraph(
  transaction: Prisma.TransactionClient,
  householdId: string,
) {
  const rows = await transaction.readingEvent.findMany({
    where: { householdId },
    include: {
      targetAmendment: true,
      reactions: { include: { targetAmendment: true } },
    },
  });
  const graph = readingGraphFromRows(rows);
  return resolveCurrentReadingRecords(
    householdId,
    graph.events,
    graph.eventAmendments,
    graph.reactions,
    graph.reactionAmendments,
  );
}

function assertReactionValue(subjectType: Reaction["subjectType"], value: string): void {
  const schema = subjectType === "child" ? childReactionValueSchema : caregiverReactionValueSchema;
  if (!schema.safeParse(value).success) {
    throw new DomainInvariantError(`Invalid ${subjectType} reaction value.`);
  }
}

async function idempotentReadingAmendment(
  transaction: Prisma.TransactionClient,
  householdId: string,
  clientMutationId: string,
  targetId: string,
  kind: "retract" | "replace",
): Promise<ReadingEventAmendment | null> {
  const existing = await transaction.readingEventAmendment.findUnique({
    where: { householdId_clientMutationId: { householdId, clientMutationId } },
  });
  if (existing !== null && (existing.targetId !== targetId || existing.kind !== kind)) {
    throw new DomainInvariantError("This reading-correction mutation ID was already used for different input.");
  }
  return existing;
}

async function idempotentReactionAmendment(
  transaction: Prisma.TransactionClient,
  householdId: string,
  clientMutationId: string,
  targetId: string,
  kind: "retract" | "replace",
): Promise<ReactionAmendment | null> {
  const existing = await transaction.reactionAmendment.findUnique({
    where: { householdId_clientMutationId: { householdId, clientMutationId } },
  });
  if (existing !== null && (existing.targetId !== targetId || existing.kind !== kind)) {
    throw new DomainInvariantError("This reaction-correction mutation ID was already used for different input.");
  }
  return existing;
}

export async function correctReadingEvent(rawCommand: unknown): Promise<ReadingEventAmendment> {
  const command = readingEventCorrectionCommandSchema.parse(rawCommand);

  try {
    return await prisma.$transaction(async (transaction) => {
    const existing = await idempotentReadingAmendment(
      transaction,
      command.householdId,
      command.clientMutationId,
      command.targetId,
      command.kind,
    );
    if (existing !== null) {
      if (
        !sameInstant(existing.declaredAt, command.declaredAt)
        || existing.reporterType !== command.reporterType
        || (existing.reasonCode ?? undefined) !== command.reasonCode
      ) {
        throw new DomainInvariantError("This reading-correction mutation ID was already used for different input.");
      }
      if (command.kind === "replace") {
        const replacement = existing.replacementId === null
          ? null
          : await transaction.readingEvent.findUnique({ where: { id: existing.replacementId } });
        if (
          replacement === null
          || replacement.clientMutationId !== command.replacement.clientMutationId
          || replacement.householdId !== command.replacement.householdId
          || replacement.childId !== command.replacement.childId
          || replacement.workId !== command.replacement.workId
          || (replacement.editionId ?? undefined) !== command.replacement.editionId
          || replacement.eventType !== command.replacement.eventType
          || !sameInstant(replacement.occurredAt, command.replacement.occurredAt)
          || (replacement.context ?? undefined) !== command.replacement.context
          || (replacement.stopReason ?? undefined) !== command.replacement.stopReason
          || (replacement.notes ?? undefined) !== command.replacement.notes
        ) {
          throw new DomainInvariantError("This reading-correction mutation ID was already used for different input.");
        }

        const source = await transaction.readingEvent.findUnique({
          where: { id: command.targetId },
          include: { reactions: { include: { targetAmendment: true } } },
        });
        const commandedReactionIds = new Set(
          command.reactionAccounting.map((accounting) => accounting.targetReactionId),
        );
        if (
          source === null
          || source.reactions.length !== commandedReactionIds.size
          || source.reactions.some((reaction) => (
            !commandedReactionIds.has(reaction.id) || reaction.targetAmendment === null
          ))
        ) {
          throw new DomainInvariantError("This reading-correction retry has different reaction accounting.");
        }

        for (const accounting of command.reactionAccounting) {
          const reactionAmendment = await transaction.reactionAmendment.findUnique({
            where: {
              householdId_clientMutationId: {
                householdId: command.householdId,
                clientMutationId: accounting.amendmentClientMutationId,
              },
            },
            include: { replacement: true, target: true },
          });
          const expectedKind = accounting.action === "retract" ? "retract" : "replace";
          if (
            reactionAmendment === null
            || reactionAmendment.targetId !== accounting.targetReactionId
            || reactionAmendment.kind !== expectedKind
            || !sameInstant(reactionAmendment.declaredAt, command.declaredAt)
            || reactionAmendment.reporterType !== command.reporterType
            || (reactionAmendment.reasonCode ?? undefined) !== accounting.reasonCode
          ) {
            throw new DomainInvariantError("This reading-correction retry has different reaction accounting.");
          }
          if (accounting.action !== "retract") {
            const reaction = reactionAmendment.replacement;
            if (
              reaction === null
              || reaction.clientMutationId !== accounting.replacementClientMutationId
              || reaction.readingEventId !== replacement.id
              || reaction.sourceVersion !== accounting.sourceVersion
              || reaction.sourceType !== (
                accounting.action === "carry_forward" ? "correction_carry_forward" : "reaction_correction"
              )
              || reaction.subjectType !== reactionAmendment.target.subjectType
              || (accounting.action === "replace" && (
                reaction.value !== accounting.value
                || !sameInstant(reaction.declaredAt, accounting.declaredAt)
                || reaction.reporterType !== "caregiver"
              ))
              || (accounting.action === "carry_forward" && (
                reaction.value !== reactionAmendment.target.value
                || !sameInstant(reaction.declaredAt, reactionAmendment.target.declaredAt)
                || reaction.reporterType !== reactionAmendment.target.reporterType
              ))
            ) {
              throw new DomainInvariantError("This reading-correction retry has different reaction accounting.");
            }
          }
        }
      }
      return existing;
    }

    const currentEvents = await loadHouseholdReadingGraph(transaction, command.householdId);
    const target = currentEvents.find((event) => event.id === command.targetId);
    if (target === undefined) {
      throw new DomainInvariantError("Only a current valid reading event can be corrected.");
    }

    if (command.kind === "retract") {
      return transaction.readingEventAmendment.create({
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

    if (
      command.replacement.householdId !== target.householdId
      || command.replacement.childId !== target.childId
      || command.replacement.workId !== target.workId
    ) {
      throw new DomainInvariantError("A replacement reading event must keep the same household, child, and work.");
    }

    const accountedIds = new Set(command.reactionAccounting.map((entry) => entry.targetReactionId));
    const currentReactionIds = new Set(target.reactions.map((reaction) => reaction.id));
    if (
      accountedIds.size !== currentReactionIds.size
      || [...accountedIds].some((id) => !currentReactionIds.has(id))
    ) {
      throw new DomainInvariantError("Every current reaction must be explicitly carried forward, replaced, or retracted.");
    }

    const replacement = await transaction.readingEvent.create({ data: command.replacement });

    for (const accounting of command.reactionAccounting) {
      const oldReaction = target.reactions.find((reaction) => reaction.id === accounting.targetReactionId);
      if (oldReaction === undefined) {
        throw new DomainInvariantError("Reaction accounting named a reaction outside the corrected event.");
      }

      let replacementReaction: Reaction | null = null;
      if (accounting.action === "carry_forward") {
        replacementReaction = await transaction.reaction.create({
          data: {
            householdId: command.householdId,
            readingEventId: replacement.id,
            subjectType: oldReaction.subjectType,
            value: oldReaction.value,
            declaredAt: oldReaction.declaredAt,
            reporterType: oldReaction.reporterType,
            sourceType: "correction_carry_forward",
            sourceVersion: accounting.sourceVersion,
            clientMutationId: accounting.replacementClientMutationId,
          },
        });
      } else if (accounting.action === "replace") {
        assertReactionValue(oldReaction.subjectType, accounting.value);
        replacementReaction = await transaction.reaction.create({
          data: {
            householdId: command.householdId,
            readingEventId: replacement.id,
            subjectType: oldReaction.subjectType,
            value: accounting.value as Reaction["value"],
            declaredAt: accounting.declaredAt,
            reporterType: "caregiver",
            sourceType: "reaction_correction",
            sourceVersion: accounting.sourceVersion,
            clientMutationId: accounting.replacementClientMutationId,
          },
        });
      }

      await transaction.reactionAmendment.create({
        data: {
          householdId: command.householdId,
          kind: replacementReaction === null ? "retract" : "replace",
          targetId: oldReaction.id,
          replacementId: replacementReaction?.id,
          declaredAt: command.declaredAt,
          reporterType: command.reporterType,
          reasonCode: accounting.reasonCode,
          clientMutationId: accounting.amendmentClientMutationId,
        },
      });
    }

    return transaction.readingEventAmendment.create({
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
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const concurrentResult = await prisma.readingEventAmendment.findUnique({
        where: {
          householdId_clientMutationId: {
            householdId: command.householdId,
            clientMutationId: command.clientMutationId,
          },
        },
      });
      if (concurrentResult !== null) return correctReadingEvent(command);
    }
    throw error;
  }
}

export async function correctReaction(rawCommand: unknown): Promise<ReactionAmendment> {
  const command = reactionCorrectionCommandSchema.parse(rawCommand);

  return prisma.$transaction(async (transaction) => {
    const existing = await idempotentReactionAmendment(
      transaction,
      command.householdId,
      command.clientMutationId,
      command.targetId,
      command.kind,
    );
    if (existing !== null) {
      if (
        !sameInstant(existing.declaredAt, command.declaredAt)
        || existing.reporterType !== command.reporterType
        || (existing.reasonCode ?? undefined) !== command.reasonCode
      ) {
        throw new DomainInvariantError("This reaction-correction mutation ID was already used for different input.");
      }
      if (command.kind === "replace") {
        const replacement = existing.replacementId === null
          ? null
          : await transaction.reaction.findUnique({ where: { id: existing.replacementId } });
        if (
          replacement === null
          || replacement.clientMutationId !== command.replacementClientMutationId
          || replacement.value !== command.value
          || !sameInstant(replacement.declaredAt, command.declaredAt)
          || replacement.sourceVersion !== command.sourceVersion
          || replacement.sourceType !== "reaction_correction"
        ) {
          throw new DomainInvariantError("This reaction-correction mutation ID was already used for different input.");
        }
      }
      return existing;
    }

    const currentEvents = await loadHouseholdReadingGraph(transaction, command.householdId);
    const target = currentEvents.flatMap((event) => event.reactions).find((reaction) => reaction.id === command.targetId);
    if (target === undefined) {
      throw new DomainInvariantError("Only a reaction on a current valid reading event can be corrected.");
    }

    if (command.kind === "retract") {
      return transaction.reactionAmendment.create({
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

    assertReactionValue(target.subjectType, command.value);
    reactionInputSchema.parse({
      householdId: command.householdId,
      readingEventId: target.readingEventId,
      subjectType: target.subjectType,
      value: command.value,
      declaredAt: command.declaredAt,
      reporterType: "caregiver",
      sourceType: "reaction_correction",
      sourceVersion: command.sourceVersion,
      clientMutationId: command.replacementClientMutationId,
    });
    const replacement = await transaction.reaction.create({
      data: {
        householdId: command.householdId,
        readingEventId: target.readingEventId,
        subjectType: target.subjectType,
        value: command.value as Reaction["value"],
        declaredAt: command.declaredAt,
        reporterType: "caregiver",
        sourceType: "reaction_correction",
        sourceVersion: command.sourceVersion,
        clientMutationId: command.replacementClientMutationId,
      },
    });

    return transaction.reactionAmendment.create({
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

export type ReadingEventCorrectionResult = ReadingEvent | ReadingEventAmendment;
