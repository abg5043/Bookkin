export type LibraryCapability = "catalog_search";

export type CatalogSearchInput = Readonly<{
  isbn?: string;
  title?: string;
}>;

export type CatalogSearchLink = Readonly<{
  adapterId: string;
  queryKind: "isbn" | "title";
  normalizedQuery: string;
  url: string;
}>;

export type CatalogHandoffCreationResult =
  | Readonly<{
      status: "ready";
      librarySystemId: string;
      librarySystemName: string;
      primary: CatalogSearchLink;
      fallback?: CatalogSearchLink;
    }>
  | Readonly<{
      status: "invalid_input";
      reason: "missing_search_term" | "invalid_isbn";
    }>;

export type CatalogHandoffResult =
  | CatalogHandoffCreationResult
  | Readonly<{
      status: "unsupported";
      adapterId: string;
      capability: LibraryCapability;
    }>;

export interface CatalogSearchCapability {
  createHandoff(input: CatalogSearchInput): CatalogHandoffCreationResult;
}

export interface LibraryAdapter {
  readonly id: string;
  readonly displayName: string;
  readonly capabilities: Readonly<{
    catalogSearch?: CatalogSearchCapability;
  }>;
}

export function createCatalogHandoff(
  adapterId: string,
  adapter: LibraryAdapter | null | undefined,
  input: CatalogSearchInput,
): CatalogHandoffResult {
  const catalogSearch = adapter?.capabilities.catalogSearch;

  if (!adapter || adapter.id !== adapterId || !catalogSearch) {
    return {
      status: "unsupported",
      adapterId,
      capability: "catalog_search",
    };
  }

  return catalogSearch.createHandoff(input);
}
