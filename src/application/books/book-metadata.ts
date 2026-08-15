export type MetadataFieldCoverage = Record<string, string>;

export type VerifiedBookWork = {
  title: string;
  subtitle?: string;
  authors: string[];
  description?: string;
  subjects: string[];
  series?: string;
  coverSmallUrl?: string;
  coverLargeUrl?: string;
  workRecordId: string;
  fieldCoverage: MetadataFieldCoverage;
};

export type VerifiedBookMetadata = VerifiedBookWork & {
  isbn: string;
  isbn10?: string;
  isbn13?: string;
  publisher?: string;
  publicationDate?: string;
  pageCount?: number;
  editionRecordId: string;
};

export type VerifiedBookSearchResult = VerifiedBookWork & {
  editionCount?: number;
  firstPublishYear?: number;
  matchingEdition?: {
    editionRecordId: string;
    title?: string;
    isbn?: string;
    publicationDate?: string;
  };
};

export interface BookMetadataProvider {
  readonly id: string;
  lookupByIsbn(isbn: string): Promise<VerifiedBookMetadata | null>;
  lookupWorkByRecordId(workRecordId: string): Promise<VerifiedBookWork | null>;
  lookupEditionByRecordId(editionRecordId: string): Promise<VerifiedBookMetadata | null>;
  search(query: string, field: "title" | "author"): Promise<VerifiedBookSearchResult[]>;
}

export class MetadataProviderError extends Error {
  constructor(providerId: string) {
    super(`The ${providerId} metadata provider could not complete the lookup.`);
    this.name = "MetadataProviderError";
  }
}
