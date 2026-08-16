import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  caregiverReactionValueSchema,
  childReactionValueSchema,
  readingEventInputSchema,
  readingMomentEventTypeSchema,
  reactionInputSchema,
  stopReasonSchema,
} from "@/domain/reading/validation";
import { prisma } from "@/infrastructure/db/prisma";
import { deriveRereadCount, sortReadingEvents } from "@/application/reading/summary";
import {
  readingGraphFromRows,
  resolveCurrentReadingRecords,
  type CurrentReadingRecord,
} from "@/application/reading/current-records";
import { DomainInvariantError } from "@/domain/shared/errors";

const quickLogEventTypeSchema = readingMomentEventTypeSchema;

export const quickReadingLogSchema = z.object({
  eventType: quickLogEventTypeSchema,
  childReaction: childReactionValueSchema.optional(),
  // Presentation adapter name retained until the separately gated UI copy update.
  parentReaction: caregiverReactionValueSchema.optional(),
  stopReason: stopReasonSchema.optional(),
  clientMutationId: z.string().trim().min(1).max(80).optional(),
}).strict().superRefine((value, context) => {
  if (value.stopReason !== undefined && value.eventType !== "stopped" && value.eventType !== "rejected") {
    context.addIssue({
      code: "custom",
      path: ["stopReason"],
      message: "A reason is only available for stopped or rejected books.",
    });
  }
});

export type QuickReadingLog = z.infer<typeof quickReadingLogSchema>;

export type ReadingHistoryEvent = {
  id: string;
  eventType: z.infer<typeof quickLogEventTypeSchema>;
  occurredAt: string;
  stopReason?: z.infer<typeof stopReasonSchema>;
  childReaction?: z.infer<typeof childReactionValueSchema>;
  // Existing visual components consume this key but display the role as Caregiver.
  parentReaction?: z.infer<typeof caregiverReactionValueSchema>;
};

export type FamilyBookHistory = {
  id: string;
  title: string;
  authors: string[];
  coverUrl?: string;
  shelfStatus?: string;
  rereadCount: number;
  events: ReadingHistoryEvent[];
};

async function ensureActiveChildId(householdId: string): Promise<string> {
  const child = await prisma.childProfile.findFirst({
    where: { householdId },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  if (child !== null) return child.id;

  return (await prisma.childProfile.create({
    data: { householdId },
    select: { id: true },
  })).id;
}

function currentEventsFromRows(
  householdId: string,
  rows: Parameters<typeof readingGraphFromRows>[0],
): CurrentReadingRecord[] {
  const graph = readingGraphFromRows(rows);
  return resolveCurrentReadingRecords(
    householdId,
    graph.events,
    graph.eventAmendments,
    graph.reactions,
    graph.reactionAmendments,
  );
}

function toHistoryEvent(event: CurrentReadingRecord): ReadingHistoryEvent {
  const childReaction = event.reactions.find((reaction) => reaction.subjectType === "child");
  const caregiverReaction = event.reactions.find((reaction) => reaction.subjectType === "caregiver");
  return {
    id: event.id,
    eventType: quickLogEventTypeSchema.parse(event.eventType),
    occurredAt: event.occurredAt.toISOString(),
    stopReason: event.stopReason === null ? undefined : stopReasonSchema.parse(event.stopReason),
    childReaction: childReaction === undefined
      ? undefined
      : childReactionValueSchema.parse(childReaction.value),
    parentReaction: caregiverReaction === undefined
      ? undefined
      : caregiverReactionValueSchema.parse(caregiverReaction.value),
  };
}

export async function getFamilyBookHistory(
  householdId: string,
  familyBookId: string,
): Promise<FamilyBookHistory | null> {
  const familyBook = await prisma.familyBook.findUnique({
    where: { id_householdId: { id: familyBookId, householdId } },
    include: {
      editions: {
        orderBy: { lastSeenAt: "desc" },
        take: 1,
        include: { edition: true },
      },
      work: {
        include: {
          readingEvents: {
            where: { householdId },
            include: {
              targetAmendment: true,
              reactions: { include: { targetAmendment: true } },
            },
          },
        },
      },
    },
  });

  if (familyBook === null) return null;

  const events = sortReadingEvents(currentEventsFromRows(householdId, familyBook.work.readingEvents))
    .map(toHistoryEvent);

  return {
    id: familyBook.id,
    title: familyBook.work.title,
    authors: JSON.parse(familyBook.work.authors) as string[],
    coverUrl: familyBook.editions[0]?.edition.coverLargeUrl
      ?? familyBook.editions[0]?.edition.coverSmallUrl
      ?? undefined,
    shelfStatus: familyBook.shelfStatus ?? undefined,
    rereadCount: deriveRereadCount(events),
    events,
  };
}

export async function listHouseholdReadingHistory(householdId: string): Promise<FamilyBookHistory[]> {
  const familyBooks = await prisma.familyBook.findMany({
    where: { householdId },
    include: {
      editions: {
        orderBy: { lastSeenAt: "desc" },
        take: 1,
        include: { edition: true },
      },
      work: {
        include: {
          readingEvents: {
            where: { householdId },
            include: {
              targetAmendment: true,
              reactions: { include: { targetAmendment: true } },
            },
          },
        },
      },
    },
  });

  return familyBooks.flatMap((familyBook) => {
    const events = sortReadingEvents(currentEventsFromRows(householdId, familyBook.work.readingEvents))
      .map(toHistoryEvent);
    if (events.length === 0) return [];
    return [{
      id: familyBook.id,
      title: familyBook.work.title,
      authors: JSON.parse(familyBook.work.authors) as string[],
      coverUrl: familyBook.editions[0]?.edition.coverLargeUrl
        ?? familyBook.editions[0]?.edition.coverSmallUrl
        ?? undefined,
      shelfStatus: familyBook.shelfStatus ?? undefined,
      rereadCount: deriveRereadCount(events),
      events,
    }];
  }).sort((left, right) => {
    const latestDifference = Date.parse(right.events[0].occurredAt) - Date.parse(left.events[0].occurredAt);
    return latestDifference !== 0 ? latestDifference : left.id.localeCompare(right.id);
  });
}

export async function appendQuickReadingLog(
  householdId: string,
  familyBookId: string,
  rawInput: unknown,
): Promise<ReadingHistoryEvent | null> {
  const input = quickReadingLogSchema.parse(rawInput);
  const familyBook = await prisma.familyBook.findUnique({
    where: { id_householdId: { id: familyBookId, householdId } },
    include: { editions: { orderBy: { lastSeenAt: "desc" }, take: 1 } },
  });
  if (familyBook === null) return null;

  const childId = await ensureActiveChildId(householdId);
  const occurredAt = new Date();
  const clientMutationId = input.clientMutationId ?? randomUUID();
  const eventInput = readingEventInputSchema.parse({
    householdId,
    childId,
    workId: familyBook.workId,
    editionId: familyBook.editions[0]?.editionId,
    eventType: input.eventType,
    occurredAt,
    stopReason: input.stopReason,
    clientMutationId,
  });

  const event = await prisma.$transaction(async (transaction) => {
    const existing = await transaction.readingEvent.findUnique({
      where: { householdId_clientMutationId: { householdId, clientMutationId } },
      include: { reactions: true },
    });
    if (existing !== null) {
      const existingChildReaction = existing.reactions.find((reaction) => reaction.subjectType === "child")?.value;
      const existingCaregiverReaction = existing.reactions.find((reaction) => reaction.subjectType === "caregiver")?.value;
      if (
        existing.childId !== childId
        || existing.workId !== familyBook.workId
        || existing.eventType !== input.eventType
        || (existing.stopReason ?? undefined) !== input.stopReason
        || existingChildReaction !== input.childReaction
        || existingCaregiverReaction !== input.parentReaction
      ) {
        throw new DomainInvariantError("This reading mutation ID was already used for different input.");
      }
      return existing;
    }

    const created = await transaction.readingEvent.create({ data: eventInput });
    const reactions = [];

    if (input.childReaction !== undefined) {
      const data = reactionInputSchema.parse({
        householdId,
        readingEventId: created.id,
        subjectType: "child",
        value: input.childReaction,
        declaredAt: occurredAt,
        reporterType: "caregiver",
        sourceType: "quick_log",
        sourceVersion: "quick-log-v1",
        clientMutationId: `${clientMutationId}:child`,
      });
      reactions.push(await transaction.reaction.create({ data }));
    }
    if (input.parentReaction !== undefined) {
      const data = reactionInputSchema.parse({
        householdId,
        readingEventId: created.id,
        subjectType: "caregiver",
        value: input.parentReaction,
        declaredAt: occurredAt,
        reporterType: "caregiver",
        sourceType: "quick_log",
        sourceVersion: "quick-log-v1",
        clientMutationId: `${clientMutationId}:caregiver`,
      });
      reactions.push(await transaction.reaction.create({ data }));
    }

    return { ...created, reactions };
  });

  return toHistoryEvent({ ...event, reactions: event.reactions });
}
