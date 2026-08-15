import { type BookMetadataProvider, type VerifiedBookMetadata } from "@/application/books/book-metadata";
import { normalizeIsbn } from "@/domain/books/isbn";
import { decodeSerialized, metadataProvenanceSchema, stringListSchema } from "@/domain/shared/serialized";
import { prisma } from "@/infrastructure/db/prisma";

export async function lookupByIsbn(
  input: string,
  provider: BookMetadataProvider,
): Promise<VerifiedBookMetadata | null> {
  const isbn = normalizeIsbn(input);
  const cachedEdition = await prisma.bookEdition.findFirst({
    where: isbn.length === 10 ? { isbn10: isbn } : { isbn13: isbn },
    include: { work: true },
  });

  if (cachedEdition !== null) {
    const provenance = cachedEdition.work.metadataProvenance === null
      ? undefined
      : decodeSerialized(metadataProvenanceSchema, cachedEdition.work.metadataProvenance);

    return {
      isbn,
      isbn10: cachedEdition.isbn10 ?? undefined,
      isbn13: cachedEdition.isbn13 ?? undefined,
      title: cachedEdition.work.title,
      subtitle: cachedEdition.work.subtitle ?? undefined,
      authors: decodeSerialized(stringListSchema, cachedEdition.work.authors),
      description: cachedEdition.work.description ?? undefined,
      subjects: cachedEdition.work.subjects === null
        ? []
        : decodeSerialized(stringListSchema, cachedEdition.work.subjects),
      series: cachedEdition.work.series ?? undefined,
      publisher: cachedEdition.publisher ?? undefined,
      publicationDate: cachedEdition.publicationDate ?? undefined,
      pageCount: cachedEdition.pageCount ?? undefined,
      coverSmallUrl: cachedEdition.coverSmallUrl ?? undefined,
      coverLargeUrl: cachedEdition.coverLargeUrl ?? undefined,
      workRecordId: cachedEdition.work.metadataRecordId ?? cachedEdition.work.id,
      editionRecordId: cachedEdition.metadataRecordId ?? cachedEdition.id,
      fieldCoverage: provenance?.fields ?? { metadata: "cached normalized record" },
    };
  }

  return provider.lookupByIsbn(isbn);
}
