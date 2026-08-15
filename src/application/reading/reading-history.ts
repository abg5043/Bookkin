import { z } from "zod";
import {
  childReactionValueSchema,
  parentReactionValueSchema,
  readingEventInputSchema,
  stopReasonSchema,
} from "@/domain/reading/validation";
import { prisma } from "@/infrastructure/db/prisma";
import { deriveRereadCount, sortReadingEvents } from "@/application/reading/summary";

const quickLogEventTypeSchema = z.enum(["finished", "reread", "stopped", "rejected"]);

export const quickReadingLogSchema = z.object({
  eventType: quickLogEventTypeSchema,
  childReaction: childReactionValueSchema.optional(),
  parentReaction: parentReactionValueSchema.optional(),
  stopReason: stopReasonSchema.optional(),
}).superRefine((value, context) => {
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
  parentReaction?: z.infer<typeof parentReactionValueSchema>;
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

  if (child !== null) {
    return child.id;
  }

  return (await prisma.childProfile.create({
    data: { householdId, displayName: "Family reader" },
    select: { id: true },
  })).id;
}

export async function getFamilyBookHistory(
  householdId: string,
  familyBookId: string,
): Promise<FamilyBookHistory | null> {
  const familyBook = await prisma.familyBook.findFirst({
    where: { id: familyBookId, householdId },
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
            include: { reactions: true },
          },
        },
      },
    },
  });

  if (familyBook === null) {
    return null;
  }

  const events = sortReadingEvents(familyBook.work.readingEvents).map((event) => ({
    id: event.id,
    eventType: quickLogEventTypeSchema.parse(event.eventType),
    occurredAt: event.occurredAt.toISOString(),
    stopReason: event.stopReason === null ? undefined : stopReasonSchema.parse(event.stopReason),
    childReaction: event.reactions.find((reaction) => reaction.subjectType === "child")?.value as z.infer<typeof childReactionValueSchema> | undefined,
    parentReaction: event.reactions.find((reaction) => reaction.subjectType === "parent")?.value as z.infer<typeof parentReactionValueSchema> | undefined,
  }));

  return {
    id: familyBook.id,
    title: familyBook.work.title,
    authors: JSON.parse(familyBook.work.authors) as string[],
    coverUrl: familyBook.editions[0]?.edition.coverLargeUrl ?? familyBook.editions[0]?.edition.coverSmallUrl ?? undefined,
    shelfStatus: familyBook.shelfStatus ?? undefined,
    rereadCount: deriveRereadCount(events),
    events,
  };
}

export async function appendQuickReadingLog(
  householdId: string,
  familyBookId: string,
  rawInput: unknown,
): Promise<ReadingHistoryEvent | null> {
  const input = quickReadingLogSchema.parse(rawInput);
  const familyBook = await prisma.familyBook.findFirst({
    where: { id: familyBookId, householdId },
    include: { editions: { orderBy: { lastSeenAt: "desc" }, take: 1 } },
  });
  if (familyBook === null) {
    return null;
  }

  const childId = await ensureActiveChildId(householdId);
  const occurredAt = new Date();
  const eventInput = readingEventInputSchema.parse({
    householdId,
    childId,
    workId: familyBook.workId,
    editionId: familyBook.editions[0]?.editionId,
    eventType: input.eventType,
    occurredAt,
    stopReason: input.stopReason,
  });

  const event = await prisma.$transaction(async (transaction) => {
    const created = await transaction.readingEvent.create({
      data: eventInput,
    });

    if (input.childReaction !== undefined) {
      await transaction.reaction.create({
        data: { readingEventId: created.id, subjectType: "child", value: input.childReaction },
      });
    }
    if (input.parentReaction !== undefined) {
      await transaction.reaction.create({
        data: { readingEventId: created.id, subjectType: "parent", value: input.parentReaction },
      });
    }

    return created;
  });

  return {
    id: event.id,
    eventType: quickLogEventTypeSchema.parse(event.eventType),
    occurredAt: event.occurredAt.toISOString(),
    stopReason: event.stopReason === null ? undefined : stopReasonSchema.parse(event.stopReason),
    childReaction: input.childReaction,
    parentReaction: input.parentReaction,
  };
}
