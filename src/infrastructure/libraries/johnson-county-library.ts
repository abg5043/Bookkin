import type {
  CatalogHandoffCreationResult,
  CatalogSearchInput,
  CatalogSearchLink,
  LibraryAdapter,
} from "../../application/libraries/library-adapter";
import { InvalidIsbnError, normalizeIsbn } from "../../domain/books/isbn";

export const JOHNSON_COUNTY_LIBRARY_ID = "johnson-county-library";
export const JOHNSON_COUNTY_LIBRARY_NAME = "Johnson County Library";

const CATALOG_ORIGIN = "https://jocolibrary.bibliocommons.com";
const CATALOG_SEARCH_PATH = "/v2/search";

function normalizeTitle(title: string | undefined): string | undefined {
  const normalized = title?.normalize("NFC").trim().replace(/\s+/gu, " ");
  return normalized || undefined;
}

function createSearchLink(
  queryKind: CatalogSearchLink["queryKind"],
  normalizedQuery: string,
): CatalogSearchLink {
  const url = new URL(CATALOG_SEARCH_PATH, CATALOG_ORIGIN);
  url.searchParams.append("query", normalizedQuery);
  url.searchParams.append("searchType", "smart");

  return {
    adapterId: JOHNSON_COUNTY_LIBRARY_ID,
    queryKind,
    normalizedQuery,
    url: url.toString(),
  };
}

function createHandoff(input: CatalogSearchInput): CatalogHandoffCreationResult {
  const normalizedTitle = normalizeTitle(input.title);
  const suppliedIsbn = input.isbn?.trim();

  if (suppliedIsbn) {
    let normalizedIsbn: string;

    try {
      normalizedIsbn = normalizeIsbn(suppliedIsbn);
    } catch (error) {
      if (error instanceof InvalidIsbnError) {
        return { status: "invalid_input", reason: "invalid_isbn" };
      }

      throw error;
    }

    const primary = createSearchLink("isbn", normalizedIsbn);
    const fallback = normalizedTitle && normalizedTitle !== normalizedIsbn
      ? createSearchLink("title", normalizedTitle)
      : undefined;

    return {
      status: "ready",
      librarySystemId: JOHNSON_COUNTY_LIBRARY_ID,
      librarySystemName: JOHNSON_COUNTY_LIBRARY_NAME,
      primary,
      ...(fallback ? { fallback } : {}),
    };
  }

  if (!normalizedTitle) {
    return { status: "invalid_input", reason: "missing_search_term" };
  }

  return {
    status: "ready",
    librarySystemId: JOHNSON_COUNTY_LIBRARY_ID,
    librarySystemName: JOHNSON_COUNTY_LIBRARY_NAME,
    primary: createSearchLink("title", normalizedTitle),
  };
}

export const johnsonCountyLibraryAdapter: LibraryAdapter = Object.freeze({
  id: JOHNSON_COUNTY_LIBRARY_ID,
  displayName: JOHNSON_COUNTY_LIBRARY_NAME,
  capabilities: Object.freeze({
    catalogSearch: Object.freeze({ createHandoff }),
  }),
});
