import { describe, expect, it, vi } from "vitest";
import { OpenLibraryCandidateDiscoveryProvider } from "@/infrastructure/candidates/open-library-candidate-discovery";

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("Open Library candidate-discovery adapter", () => {
  it("sends exactly the four frozen GET parameters and normalizes provider record IDs", async () => {
    let capturedUrl: string | undefined;
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      capturedUrl = String(input);
      return response({
        docs: [
          { key: "/works/OL1W", isbn: ["9780000000001"], language: ["eng"] },
          { key: "/works/OL2W" },
          { title: "Missing key is dropped, not fabricated" },
        ],
      });
    }) as typeof fetch;
    const provider = new OpenLibraryCandidateDiscoveryProvider(fetcher);

    const results = await provider.discover("dinosaurs");

    expect(capturedUrl).toBeDefined();
    const url = new URL(capturedUrl as string);
    expect(url.origin + url.pathname).toBe("https://openlibrary.org/search.json");
    expect(Object.fromEntries(url.searchParams.entries())).toEqual({
      q: "subject:dinosaurs AND language:eng",
      fields: "key,title,author_name,edition_key,isbn,language,subject",
      limit: "100",
      page: "1",
    });

    expect(results).toEqual([
      { providerRecordId: "OL1W", position: 0, isbn: "9780000000001", language: "eng" },
      { providerRecordId: "OL2W", position: 1, isbn: undefined, language: undefined },
    ]);
  });

  it("always includes children_general in its own request and never leaks age or household data", async () => {
    let capturedUrl: string | undefined;
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      capturedUrl = String(input);
      return response({ docs: [] });
    }) as typeof fetch;
    const provider = new OpenLibraryCandidateDiscoveryProvider(fetcher);

    await provider.discover("children_general");

    const url = new URL(capturedUrl as string);
    expect(url.searchParams.get("q")).toBe('subject:"juvenile fiction" AND language:eng');
    expect([...url.searchParams.keys()].sort()).toEqual(["fields", "limit", "page", "q"]);
  });

  it("rejects a source code outside the frozen dictionary before any request is sent", async () => {
    const fetcher = vi.fn();
    const provider = new OpenLibraryCandidateDiscoveryProvider(fetcher as unknown as typeof fetch);
    await expect(provider.discover("not_a_real_code" as never)).rejects.toThrow();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("throws a provider error rather than returning an empty result on failure", async () => {
    const fetcher = vi.fn(async () => response({}, 500)) as unknown as typeof fetch;
    const provider = new OpenLibraryCandidateDiscoveryProvider(fetcher);
    await expect(provider.discover("space")).rejects.toThrow(/could not complete the request/);
  });
});
