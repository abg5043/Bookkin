import { describe, expect, it, vi } from "vitest";
import { OpenLibraryBookMetadataProvider } from "../../src/infrastructure/metadata/open-library";

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("Open Library metadata provider", () => {
  it("normalizes a verified edition and records coverage without inventing missing fields", async () => {
    // Bibliographic facts are verified against WorldCat record 7273374.
    // Provider record and cover IDs are explicit synthetic contract identifiers.
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.endsWith("/isbn/9780306406157.json")) {
        return response({
          key: "/books/FIXTURE-EDITION",
          title: "Error-Correction Coding for Digital Communications",
          authors: [
            { key: "/authors/FIXTURE-GEORGE-CLARK" },
            { key: "/authors/FIXTURE-J-BIBB-CAIN" },
          ],
          isbn_13: ["9780306406157"],
          works: [{ key: "/works/FIXTURE-WORK" }],
          covers: [42],
        });
      }

      if (url.endsWith("/works/FIXTURE-WORK.json")) {
        return response({ title: "Error-Correction Coding for Digital Communications" });
      }

      if (url.endsWith("/authors/FIXTURE-GEORGE-CLARK.json")) {
        return response({ name: "George C. Clark" });
      }

      if (url.endsWith("/authors/FIXTURE-J-BIBB-CAIN.json")) {
        return response({ name: "J. Bibb Cain" });
      }

      return response({}, 404);
    }) as typeof fetch;
    const provider = new OpenLibraryBookMetadataProvider(fetcher);

    const result = await provider.lookupByIsbn("978-0-306-40615-7");

    expect(result).toMatchObject({
      isbn: "9780306406157",
      isbn13: "9780306406157",
      title: "Error-Correction Coding for Digital Communications",
      authors: ["George C. Clark", "J. Bibb Cain"],
      subjects: [],
      workRecordId: "FIXTURE-WORK",
      editionRecordId: "FIXTURE-EDITION",
      fieldCoverage: {
        pageCount: "missing",
        ageGuidance: "missing",
      },
    });
    expect(result?.coverSmallUrl).toBe("https://covers.openlibrary.org/b/id/42-S.jpg?default=false");
  });

  it("returns no result for a provider 404", async () => {
    const provider = new OpenLibraryBookMetadataProvider(
      vi.fn(async () => response({}, 404)) as typeof fetch,
    );

    await expect(provider.lookupByIsbn("9780306406157")).resolves.toBeNull();
  });

  it("normalizes title search results as works with an optional verified edition", async () => {
    // The Snowy Day bibliographic facts are verified against publisher ISBN 9780670012701.
    // Provider record IDs are explicit synthetic contract identifiers.
    const provider = new OpenLibraryBookMetadataProvider(
      vi.fn(async (input: string | URL | Request) => {
        const url = String(input);
        if (url.includes("/search.json?")) {
          return response({
            docs: [{
              key: "/works/FIXTURE-SNOWY-DAY-WORK",
              title: "The Snowy Day",
              author_name: ["Ezra Jack Keats"],
              first_publish_year: 1962,
              editions: {
                docs: [{
                  key: "/books/FIXTURE-SNOWY-DAY-EDITION",
                  title: "The Snowy Day",
                  isbn: ["9780670012701"],
                  publish_date: ["2011"],
                }],
              },
            }],
          });
        }

        return response({}, 404);
      }) as typeof fetch,
    );

    await expect(provider.search("snowy", "title")).resolves.toEqual([expect.objectContaining({
      title: "The Snowy Day",
      authors: ["Ezra Jack Keats"],
      workRecordId: "FIXTURE-SNOWY-DAY-WORK",
      matchingEdition: {
        editionRecordId: "FIXTURE-SNOWY-DAY-EDITION",
        title: "The Snowy Day",
        isbn: "9780670012701",
        publicationDate: "2011",
      },
    })]);
  });
});
