import { type VerifiedBookMetadata, type VerifiedBookWork } from "@/application/books/book-metadata";
import { type z } from "zod";
import {
  familyBookShelfStatusSchema,
} from "@/domain/family-books/validation";
import {
  encodeSerialized,
  metadataProvenanceSchema,
  stringListSchema,
} from "@/domain/shared/serialized";
import { prisma } from "@/infrastructure/db/prisma";

export type ShelfStatus = z.infer<typeof familyBookShelfStatusSchema>;

export type FamilyShelfItem = {
  id: string;
  title: string;
  authors: string[];
  coverUrl?: string;
  shelfStatus?: ShelfStatus;
};

export type SaveFamilyBookResult = {
  familyBookId: string;
  wasAlreadyOnShelf: boolean;
  shelfStatus: ShelfStatus;
};

function provenance(recordId: string, fields: Record<string, string>): string {
  return encodeSerialized(metadataProvenanceSchema, {
    provider: "open-library",
    recordId,
    fields,
  });
}

function optionalStringList(values: string[]): string | null {
  return values.length === 0 ? null : encodeSerialized(stringListSchema, values);
}

function asShelfStatus(value: string | null): ShelfStatus | undefined {
  return value === null ? undefined : familyBookShelfStatusSchema.parse(value);
}

export async function listFamilyShelf(householdId: string): Promise<FamilyShelfItem[]> {
  const familyBooks = await prisma.familyBook.findMany({
    where: { householdId },
    orderBy: { lastSeenAt: "desc" },
    include: {
      work: true,
      editions: {
        orderBy: { lastSeenAt: "desc" },
        take: 1,
        include: { edition: true },
      },
    },
  });

  return familyBooks.map((familyBook) => ({
    id: familyBook.id,
    title: familyBook.work.title,
    authors: JSON.parse(familyBook.work.authors) as string[],
    coverUrl: familyBook.editions[0]?.edition.coverLargeUrl ?? familyBook.editions[0]?.edition.coverSmallUrl ?? undefined,
    shelfStatus: asShelfStatus(familyBook.shelfStatus),
  }));
}

export async function saveToFamilyShelf(
  householdId: string,
  metadata: VerifiedBookMetadata | VerifiedBookWork,
  shelfStatus: ShelfStatus,
  addedVia: "manual_isbn" | "search" = "manual_isbn",
): Promise<SaveFamilyBookResult> {
  return prisma.$transaction(async (transaction) => {
    const work = await transaction.bookWork.upsert({
      where: {
        metadataProvider_metadataRecordId: {
          metadataProvider: "open-library",
          metadataRecordId: metadata.workRecordId,
        },
      },
      update: {
        title: metadata.title,
        subtitle: metadata.subtitle,
        authors: encodeSerialized(stringListSchema, metadata.authors),
        description: metadata.description,
        subjects: optionalStringList(metadata.subjects),
        series: metadata.series,
        metadataProvenance: provenance(metadata.workRecordId, metadata.fieldCoverage),
      },
      create: {
        title: metadata.title,
        subtitle: metadata.subtitle,
        authors: encodeSerialized(stringListSchema, metadata.authors),
        description: metadata.description,
        subjects: optionalStringList(metadata.subjects),
        series: metadata.series,
        metadataProvider: "open-library",
        metadataRecordId: metadata.workRecordId,
        metadataProvenance: provenance(metadata.workRecordId, metadata.fieldCoverage),
      },
    });

    const edition = "editionRecordId" in metadata
      ? await transaction.bookEdition.upsert({
        where: {
          metadataProvider_metadataRecordId: {
            metadataProvider: "open-library",
            metadataRecordId: metadata.editionRecordId,
          },
        },
        update: {
          workId: work.id,
          isbn10: metadata.isbn10,
          isbn13: metadata.isbn13,
          publisher: metadata.publisher,
          publicationDate: metadata.publicationDate,
          pageCount: metadata.pageCount,
          coverSmallUrl: metadata.coverSmallUrl,
          coverLargeUrl: metadata.coverLargeUrl,
          metadataProvenance: provenance(metadata.editionRecordId, metadata.fieldCoverage),
        },
        create: {
          workId: work.id,
          isbn10: metadata.isbn10,
          isbn13: metadata.isbn13,
          publisher: metadata.publisher,
          publicationDate: metadata.publicationDate,
          pageCount: metadata.pageCount,
          coverSmallUrl: metadata.coverSmallUrl,
          coverLargeUrl: metadata.coverLargeUrl,
          metadataProvider: "open-library",
          metadataRecordId: metadata.editionRecordId,
          metadataProvenance: provenance(metadata.editionRecordId, metadata.fieldCoverage),
        },
      })
      : undefined;

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
