import {
  type BookMetadataProvider,
  MetadataProviderError,
  type VerifiedBookMetadata,
  type VerifiedBookSearchResult,
  type VerifiedBookWork,
} from "@/application/books/book-metadata";
import { isValidIsbn, normalizeIsbn } from "@/domain/books/isbn";

type Fetcher = typeof fetch;
type AuthorReference = { key?: string };

type OpenLibraryEdition = {
  key?: string;
  title?: string;
  subtitle?: string;
  authors?: AuthorReference[];
  publishers?: string[];
  publish_date?: string;
  number_of_pages?: number;
  covers?: number[];
  isbn_10?: string[];
  isbn_13?: string[];
  works?: AuthorReference[];
  series?: string[];
};

type OpenLibraryWork = {
  key?: string;
  title?: string;
  description?: string | { value?: string };
  subjects?: string[];
  series?: string[];
  covers?: number[];
  authors?: Array<{ author?: AuthorReference }>;
};

type OpenLibrarySearchEdition = {
  key?: string;
  title?: string;
  isbn?: string[];
  publish_date?: string | string[];
};

type OpenLibrarySearchDocument = {
  key?: string;
  title?: string;
  author_name?: string[];
  cover_i?: number;
  edition_count?: number;
  first_publish_year?: number;
  editions?: { docs?: OpenLibrarySearchEdition[] };
};

type OpenLibraryAuthor = { name?: string };

function asObject(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

function asRecord<T>(value: unknown): T | null {
  return asObject(value) === null ? null : value as T;
}

function descriptionValue(description: OpenLibraryWork["description"]): string | undefined {
  if (typeof description === "string") {
    return description.trim() || undefined;
  }

  return description?.value?.trim() || undefined;
}

function recordId(key: string | undefined): string | undefined {
  return key?.split("/").filter(Boolean).at(-1);
}

function validNormalizedIsbn(values: string[] | undefined, length?: 10 | 13): string | undefined {
  return values?.map((value) => (isValidIsbn(value) ? normalizeIsbn(value) : undefined))
    .find((value) => value !== undefined && (length === undefined || value.length === length));
}

function coverUrl(coverId: number | undefined, size: "S" | "L"): string | undefined {
  return coverId === undefined
    ? undefined
    : `https://covers.openlibrary.org/b/id/${coverId}-${size}.jpg?default=false`;
}

function normalizedStrings(values: string[] | undefined): string[] {
  return (values ?? []).map((value) => value.trim()).filter(Boolean);
}

function firstString(value: string | string[] | undefined): string | undefined {
  return (typeof value === "string" ? value : value?.[0])?.trim() || undefined;
}

export class OpenLibraryBookMetadataProvider implements BookMetadataProvider {
  readonly id = "open-library";

  constructor(private readonly fetcher: Fetcher = fetch) {}

  async lookupByIsbn(input: string): Promise<VerifiedBookMetadata | null> {
    const isbn = normalizeIsbn(input);
    const response = await this.request(`/isbn/${encodeURIComponent(isbn)}.json`);
    if (response.status === 404) {
      return null;
    }
    if (!response.ok) {
      throw new MetadataProviderError(this.id);
    }

    return this.normalizeEdition(await response.json(), isbn);
  }

  async lookupEditionByRecordId(editionRecordId: string): Promise<VerifiedBookMetadata | null> {
    const response = await this.request(`/books/${encodeURIComponent(editionRecordId)}.json`);
    if (response.status === 404) {
      return null;
    }
    if (!response.ok) {
      throw new MetadataProviderError(this.id);
    }

    return this.normalizeEdition(await response.json());
  }

  async lookupWorkByRecordId(workRecordId: string): Promise<VerifiedBookWork | null> {
    const response = await this.request(`/works/${encodeURIComponent(workRecordId)}.json`);
    if (response.status === 404) {
      return null;
    }
    if (!response.ok) {
      throw new MetadataProviderError(this.id);
    }

    const work = asRecord<OpenLibraryWork>(await response.json());
    if (work === null) {
      throw new MetadataProviderError(this.id);
    }

    return this.normalizeWork(work, workRecordId);
  }

  async search(query: string, field: "title" | "author"): Promise<VerifiedBookSearchResult[]> {
    const parameters = new URLSearchParams({
      [field]: query,
      fields: "key,title,author_name,cover_i,edition_count,first_publish_year,editions,editions.key,editions.title,editions.isbn,editions.publish_date",
      limit: "10",
    });
    const response = await this.request(`/search.json?${parameters.toString()}`);
    if (!response.ok) {
      throw new MetadataProviderError(this.id);
    }

    const payload = asRecord<{ docs?: OpenLibrarySearchDocument[] }>(await response.json());
    if (payload === null) {
      throw new MetadataProviderError(this.id);
    }

    return (payload.docs ?? []).flatMap((document) => {
      const workRecordId = recordId(document.key);
      const title = document.title?.trim();
      if (workRecordId === undefined || title === undefined || title.length === 0) {
        return [];
      }

      const matchingEdition = document.editions?.docs?.[0];
      const matchingEditionRecordId = recordId(matchingEdition?.key);
      const cover = coverUrl(document.cover_i, "S");
      return [{
        title,
        authors: normalizedStrings(document.author_name),
        subjects: [],
        coverSmallUrl: cover,
        coverLargeUrl: cover === undefined ? undefined : coverUrl(document.cover_i, "L"),
        workRecordId,
        editionCount: document.edition_count,
        firstPublishYear: document.first_publish_year,
        matchingEdition: matchingEditionRecordId === undefined ? undefined : {
          editionRecordId: matchingEditionRecordId,
          title: matchingEdition?.title?.trim() || undefined,
          isbn: validNormalizedIsbn(matchingEdition?.isbn),
          publicationDate: firstString(matchingEdition?.publish_date),
        },
        fieldCoverage: {
          title: "search.title",
          authors: document.author_name?.length ? "search.author_name" : "missing",
          description: "missing",
          subjects: "missing",
          series: "missing",
          ageGuidance: "missing",
          cover: document.cover_i === undefined ? "missing" : "search.cover_i",
        },
      }];
    });
  }

  private async normalizeEdition(value: unknown, requestedIsbn?: string): Promise<VerifiedBookMetadata> {
    const edition = asRecord<OpenLibraryEdition>(value);
    const title = edition?.title?.trim();
    const editionRecordId = recordId(edition?.key);
    if (edition === null || title === undefined || title.length === 0 || editionRecordId === undefined) {
      throw new MetadataProviderError(this.id);
    }

    const workKey = edition.works?.[0]?.key;
    const workRecordId = recordId(workKey) ?? editionRecordId;
    const [work, editionAuthors] = await Promise.all([
      workKey === undefined ? Promise.resolve(undefined) : this.lookupWorkRecord(workKey),
      this.lookupAuthors(edition.authors),
    ]);
    const workMetadata = work === undefined ? undefined : await this.normalizeWork(work, workRecordId);
    const authors = editionAuthors.length > 0 ? editionAuthors : workMetadata?.authors ?? [];
    const normalizedIsbn10 = validNormalizedIsbn(edition.isbn_10, 10);
    const normalizedIsbn13 = validNormalizedIsbn(edition.isbn_13, 13);
    const coverId = edition.covers?.[0];
    const description = workMetadata?.description;
    const subjects = workMetadata?.subjects ?? [];
    const series = (edition.series ?? work?.series ?? [])[0]?.trim() || undefined;

    return {
      isbn: requestedIsbn ?? normalizedIsbn13 ?? normalizedIsbn10 ?? editionRecordId,
      isbn10: normalizedIsbn10 ?? (requestedIsbn?.length === 10 ? requestedIsbn : undefined),
      isbn13: normalizedIsbn13 ?? (requestedIsbn?.length === 13 ? requestedIsbn : undefined),
      title,
      subtitle: edition.subtitle?.trim() || undefined,
      authors,
      description,
      subjects,
      series,
      publisher: edition.publishers?.[0]?.trim() || undefined,
      publicationDate: edition.publish_date?.trim() || undefined,
      pageCount: edition.number_of_pages,
      coverSmallUrl: coverUrl(coverId, "S"),
      coverLargeUrl: coverUrl(coverId, "L"),
      workRecordId,
      editionRecordId,
      fieldCoverage: {
        title: "edition.title",
        authors: authors.length > 0 ? "author.name" : "missing",
        description: description === undefined ? "missing" : "work.description",
        subjects: subjects.length > 0 ? "work.subjects" : "missing",
        series: series === undefined ? "missing" : "edition.series or work.series",
        publisher: edition.publishers?.[0] === undefined ? "missing" : "edition.publishers",
        publicationDate: edition.publish_date === undefined ? "missing" : "edition.publish_date",
        pageCount: edition.number_of_pages === undefined ? "missing" : "edition.number_of_pages",
        ageGuidance: "missing",
        cover: coverId === undefined ? "missing" : "edition.covers",
      },
    };
  }

  private async normalizeWork(work: OpenLibraryWork, fallbackRecordId: string): Promise<VerifiedBookWork> {
    const title = work.title?.trim();
    if (title === undefined || title.length === 0) {
      throw new MetadataProviderError(this.id);
    }

    const authors = await this.lookupAuthors(work.authors?.map((entry) => entry.author ?? {}));
    const description = descriptionValue(work.description);
    const subjects = normalizedStrings(work.subjects);
    const series = work.series?.[0]?.trim() || undefined;
    const coverId = work.covers?.[0];

    return {
      title,
      authors,
      description,
      subjects,
      series,
      coverSmallUrl: coverUrl(coverId, "S"),
      coverLargeUrl: coverUrl(coverId, "L"),
      workRecordId: recordId(work.key) ?? fallbackRecordId,
      fieldCoverage: {
        title: "work.title",
        authors: authors.length > 0 ? "author.name" : "missing",
        description: description === undefined ? "missing" : "work.description",
        subjects: subjects.length > 0 ? "work.subjects" : "missing",
        series: series === undefined ? "missing" : "work.series",
        ageGuidance: "missing",
        cover: coverId === undefined ? "missing" : "work.covers",
      },
    };
  }

  private async lookupWorkRecord(workKey: string): Promise<OpenLibraryWork | undefined> {
    const response = await this.request(`${workKey}.json`);
    if (!response.ok) {
      return undefined;
    }

    return asRecord<OpenLibraryWork>(await response.json()) ?? undefined;
  }

  private async lookupAuthors(authors: AuthorReference[] | undefined): Promise<string[]> {
    if (authors === undefined) {
      return [];
    }

    const results = await Promise.all(authors.slice(0, 6).map(async (author) => {
      if (author.key === undefined) {
        return undefined;
      }

      const response = await this.request(`${author.key}.json`);
      if (!response.ok) {
        return undefined;
      }

      const value = asRecord<OpenLibraryAuthor>(await response.json());
      return value?.name?.trim() || undefined;
    }));

    return results.filter((value): value is string => value !== undefined);
  }

  private request(path: string): Promise<Response> {
    return this.fetcher(`https://openlibrary.org${path}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    }).catch(() => {
      throw new MetadataProviderError(this.id);
    });
  }
}
