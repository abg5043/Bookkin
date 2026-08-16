import { afterEach, describe, expect, it, vi } from "vitest";

import { createCatalogHandoff } from "../../src/application/libraries/library-adapter";
import {
  JOHNSON_COUNTY_LIBRARY_ID,
  JOHNSON_COUNTY_LIBRARY_NAME,
  johnsonCountyLibraryAdapter,
} from "../../src/infrastructure/libraries/johnson-county-library";
import { resolveLibraryAdapter } from "../../src/infrastructure/libraries/library-adapters";

const createHandoff = johnsonCountyLibraryAdapter.capabilities.catalogSearch!.createHandoff;

function expectSearchUrl(urlString: string, expectedQuery: string): void {
  const url = new URL(urlString);

  expect(url.protocol).toBe("https:");
  expect(url.origin).toBe("https://jocolibrary.bibliocommons.com");
  expect(url.pathname).toBe("/v2/search");
  expect([...url.searchParams.entries()]).toEqual([
    ["query", expectedQuery],
    ["searchType", "smart"],
  ]);
  expect(url.search).toBe(`?query=${encodeURIComponent(expectedQuery).replace(/%20/g, "+")}&searchType=smart`);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Johnson County Library adapter", () => {
  it("declares a fixed code-owned identity and catalog-search capability", () => {
    expect(johnsonCountyLibraryAdapter.id).toBe(JOHNSON_COUNTY_LIBRARY_ID);
    expect(johnsonCountyLibraryAdapter.displayName).toBe(JOHNSON_COUNTY_LIBRARY_NAME);
    expect(johnsonCountyLibraryAdapter.capabilities.catalogSearch).toBeDefined();
  });

  it.each([
    ["0-306-40615-2", "0306406152"],
    ["978-0-306-40615-7", "9780306406157"],
    ["0 8044 2957 x", "080442957X"],
  ])("normalizes a valid ISBN search: %s", (isbn, normalizedIsbn) => {
    const result = createHandoff({ isbn });

    expect(result).toMatchObject({
      status: "ready",
      librarySystemId: JOHNSON_COUNTY_LIBRARY_ID,
      librarySystemName: JOHNSON_COUNTY_LIBRARY_NAME,
      primary: {
        adapterId: JOHNSON_COUNTY_LIBRARY_ID,
        queryKind: "isbn",
        normalizedQuery: normalizedIsbn,
      },
    });
    if (result.status === "ready") {
      expect(result.fallback).toBeUndefined();
      expectSearchUrl(result.primary.url, normalizedIsbn);
    }
  });

  it("prefers ISBN and supplies a separately usable normalized title fallback", () => {
    const result = createHandoff({
      isbn: "978-0-306-40615-7",
      title: "  The\tSnowy\nDay  ",
    });

    expect(result).toMatchObject({
      status: "ready",
      primary: { queryKind: "isbn", normalizedQuery: "9780306406157" },
      fallback: { queryKind: "title", normalizedQuery: "The Snowy Day" },
    });
    if (result.status === "ready" && result.fallback) {
      expectSearchUrl(result.primary.url, "9780306406157");
      expectSearchUrl(result.fallback.url, "The Snowy Day");
    }
  });

  it("does not create a redundant title fallback equal to the normalized ISBN", () => {
    const result = createHandoff({
      isbn: "978-0-306-40615-7",
      title: "  9780306406157  ",
    });

    expect(result.status).toBe("ready");
    if (result.status === "ready") {
      expect(result.primary.normalizedQuery).toBe("9780306406157");
      expect(result.fallback).toBeUndefined();
    }
  });

  it("uses a normalized title when ISBN is absent or blank", () => {
    const decomposedTitle = "  Cafe\u0301\tMoon  ";

    for (const isbn of [undefined, "  "]) {
      const result = createHandoff({ isbn, title: decomposedTitle });

      expect(result).toMatchObject({
        status: "ready",
        primary: { queryKind: "title", normalizedQuery: "Café Moon" },
      });
      if (result.status === "ready") {
        expect(result.fallback).toBeUndefined();
        expectSearchUrl(result.primary.url, "Café Moon");
      }
    }
  });

  it("encodes reserved characters and CRLF without changing the fixed URL contract", () => {
    const title = "A & B? #1 / \"quote\"\r\nnext";
    const result = createHandoff({ title });

    expect(result.status).toBe("ready");
    if (result.status === "ready") {
      expect(result.primary.normalizedQuery).toBe("A & B? #1 / \"quote\" next");
      expectSearchUrl(result.primary.url, "A & B? #1 / \"quote\" next");
      expect(new URL(result.primary.url).searchParams.size).toBe(2);
    }
  });

  it("returns invalid_isbn without exposing the malformed value or using the title", () => {
    const malformed = "9780306406158-secret";
    const result = createHandoff({ isbn: malformed, title: "The Snowy Day" });

    expect(result).toEqual({ status: "invalid_input", reason: "invalid_isbn" });
    expect(JSON.stringify(result)).not.toContain(malformed);
  });

  it.each([
    {},
    { isbn: "" },
    { title: " \t\r\n " },
    { isbn: " ", title: " " },
  ])("returns missing_search_term when no usable input exists", (input) => {
    expect(createHandoff(input)).toEqual({
      status: "invalid_input",
      reason: "missing_search_term",
    });
  });

  it("constructs links without network access", () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);

    expect(createHandoff({ title: "The Snowy Day" }).status).toBe("ready");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("resolves only the known code-owned adapter ID", () => {
    expect(resolveLibraryAdapter(JOHNSON_COUNTY_LIBRARY_ID)).toBe(johnsonCountyLibraryAdapter);
    expect(resolveLibraryAdapter("unknown-library")).toBeNull();
    expect(resolveLibraryAdapter("https://attacker.example")).toBeNull();
  });

  it("fails closed when resolver and dispatcher compose for an unknown ID", () => {
    const adapterId = "unknown-library";

    expect(createCatalogHandoff(
      adapterId,
      resolveLibraryAdapter(adapterId),
      { title: "The Snowy Day" },
    )).toEqual({
      status: "unsupported",
      adapterId,
      capability: "catalog_search",
    });
  });
});
