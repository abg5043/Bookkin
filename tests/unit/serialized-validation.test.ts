import { describe, expect, it } from "vitest";
import {
  decodeSerialized,
  encodeSerialized,
  metadataProvenanceSchema,
  sourceSignalsSchema,
} from "../../src/domain/shared/serialized";

describe("serialized field shapes", () => {
  it("round-trips verified metadata provenance", () => {
    const value = {
      provider: "open-library",
      recordId: "FIXTURE-WORK",
      fields: { title: "provider", authors: "provider" },
    };
    const encoded = encodeSerialized(metadataProvenanceSchema, value);

    expect(decodeSerialized(metadataProvenanceSchema, encoded)).toEqual(value);
  });

  it("rejects source signals without evidence", () => {
    expect(sourceSignalsSchema.safeParse([{ code: "child_loved", value: 8 }]).success).toBe(false);
  });
});
