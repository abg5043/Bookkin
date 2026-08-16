import { describe, expect, it, vi } from "vitest";

import {
  createCatalogHandoff,
  type LibraryAdapter,
} from "../../src/application/libraries/library-adapter";

describe("library adapter capability dispatch", () => {
  it("returns a typed unsupported result for an unknown adapter", () => {
    expect(createCatalogHandoff("unknown-library", null, { title: "The Snowy Day" })).toEqual({
      status: "unsupported",
      adapterId: "unknown-library",
      capability: "catalog_search",
    });
  });

  it("returns a typed unsupported result when catalog search is absent", () => {
    const adapter: LibraryAdapter = {
      id: "searchless-library",
      displayName: "Searchless Library",
      capabilities: {},
    };

    expect(createCatalogHandoff(adapter.id, adapter, { title: "The Snowy Day" })).toEqual({
      status: "unsupported",
      adapterId: "searchless-library",
      capability: "catalog_search",
    });
  });

  it("fails closed when a capable adapter does not match the requested ID", () => {
    const createHandoff = vi.fn(() => ({
      status: "invalid_input" as const,
      reason: "missing_search_term" as const,
    }));
    const adapter: LibraryAdapter = {
      id: "known-library",
      displayName: "Known Library",
      capabilities: { catalogSearch: { createHandoff } },
    };

    expect(createCatalogHandoff("unknown-library", adapter, { title: "The Snowy Day" })).toEqual({
      status: "unsupported",
      adapterId: "unknown-library",
      capability: "catalog_search",
    });
    expect(createHandoff).not.toHaveBeenCalled();
  });

  it("delegates only when the catalog-search capability exists", () => {
    const createHandoff = vi.fn(() => ({
      status: "invalid_input" as const,
      reason: "missing_search_term" as const,
    }));
    const adapter: LibraryAdapter = {
      id: "catalog-library",
      displayName: "Catalog Library",
      capabilities: { catalogSearch: { createHandoff } },
    };
    const input = { title: "  " };

    expect(createCatalogHandoff(adapter.id, adapter, input)).toEqual({
      status: "invalid_input",
      reason: "missing_search_term",
    });
    expect(createHandoff).toHaveBeenCalledOnce();
    expect(createHandoff).toHaveBeenCalledWith(input);
  });
});
