import type { Prisma, BookEdition, BookWork } from "@prisma/client";
import type { VerifiedBookMetadata, VerifiedBookWork } from "@/application/books/book-metadata";
import { encodeSerialized, metadataProvenanceSchema, stringListSchema } from "@/domain/shared/serialized";

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

export type PersistedVerifiedMetadata = {
  work: BookWork;
  edition: BookEdition | undefined;
};

/**
 * Upserts verified provider metadata into the shared BookWork/BookEdition tables only.
 * Extracted from saveToFamilyShelf so candidate hydration can reuse the same normalization
 * boundary without ever creating a FamilyBook, shelf status, reading event, reaction,
 * observation, or borrowing fact -- shelf save and candidate hydration both call this and
 * diverge only after it returns.
 */
export async function persistVerifiedMetadata(
  transaction: Prisma.TransactionClient,
  metadata: VerifiedBookMetadata | VerifiedBookWork,
): Promise<PersistedVerifiedMetadata> {
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

  return { work, edition };
}
