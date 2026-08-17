import { type VerifiedBookMetadata, type VerifiedBookWork } from "@/application/books/book-metadata";
import { persistVerifiedMetadata } from "@/application/books/persist-metadata";
import { type z } from "zod";
import {
  familyBookShelfStatusSchema,
} from "@/domain/family-books/validation";
import { readingGraphFromRows, resolveCurrentReadingRecords } from "@/application/reading/current-records";
import { sortReadingEvents } from "@/application/reading/summary";
import { prisma } from "@/infrastructure/db/prisma";

export type ShelfStatus = z.infer<typeof familyBookShelfStatusSchema>;

export type FamilyShelfItem = {
  id: string;
  title: string;
  authors: string[];
  coverUrl?: string;
  shelfStatus?: ShelfStatus;
  lastReadAt?: string;
};

export type SaveFamilyBookResult = {
  familyBookId: string;
  wasAlreadyOnShelf: boolean;
  shelfStatus: ShelfStatus;
};

function asShelfStatus(value: string | null): ShelfStatus | undefined {
  return value === null ? undefined : familyBookShelfStatusSchema.parse(value);
}

export async function listFamilyShelf(householdId: string): Promise<FamilyShelfItem[]> {
  const familyBooks = await prisma.familyBook.findMany({
    where: { householdId },
    orderBy: { lastSeenAt: "desc" },
    include: {
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
      editions: {
        orderBy: { lastSeenAt: "desc" },
        take: 1,
        include: { edition: true },
      },
    },
  });

  return familyBooks.map((familyBook) => {
    const graph = readingGraphFromRows(familyBook.work.readingEvents);
    const latestEvent = sortReadingEvents(resolveCurrentReadingRecords(
      householdId,
      graph.events,
      graph.eventAmendments,
      graph.reactions,
      graph.reactionAmendments,
    ))[0];
    return {
      id: familyBook.id,
      title: familyBook.work.title,
      authors: JSON.parse(familyBook.work.authors) as string[],
      coverUrl: familyBook.editions[0]?.edition.coverLargeUrl
        ?? familyBook.editions[0]?.edition.coverSmallUrl
        ?? undefined,
      shelfStatus: asShelfStatus(familyBook.shelfStatus),
      lastReadAt: latestEvent?.occurredAt.toISOString(),
    };
  });
}

export async function saveToFamilyShelf(
  householdId: string,
  metadata: VerifiedBookMetadata | VerifiedBookWork,
  shelfStatus: ShelfStatus,
  addedVia: "manual_isbn" | "search" = "manual_isbn",
): Promise<SaveFamilyBookResult> {
  return prisma.$transaction(async (transaction) => {
    const { work, edition } = await persistVerifiedMetadata(transaction, metadata);

    const existingFamilyBook = await transaction.familyBook.findUnique({
      where: { householdId_workId: { householdId, workId: work.id } },
      select: { id: true },
    });

    const familyBook = await transaction.familyBook.upsert({
      where: { householdId_workId: { householdId, workId: work.id } },
      update: { lastSeenAt: new Date(), shelfStatus },
      create: {
        householdId,
        workId: work.id,
        addedVia,
        shelfStatus,
      },
    });

    if (edition !== undefined) {
      await transaction.familyBookEdition.upsert({
        where: { familyBookId_editionId: { familyBookId: familyBook.id, editionId: edition.id } },
        update: { lastSeenAt: new Date() },
        create: {
          householdId,
          familyBookId: familyBook.id,
          editionId: edition.id,
          addedVia,
        },
      });
    }

    return {
      familyBookId: familyBook.id,
      wasAlreadyOnShelf: existingFamilyBook !== null,
      shelfStatus,
    };
  });
}

export const shelfStatuses = [
  "owned",
  "borrowed",
  "wishlist",
] as const satisfies readonly ShelfStatus[];
