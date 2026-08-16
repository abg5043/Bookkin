import { describe, expect, it } from "vitest";
import {
  assertColdStartReady,
  requestEvidenceV1Schema,
  sortedUniqueIds,
} from "@/domain/recommendations/request-evidence";

function snapshot(overrides: Record<string, unknown> = {}) {
  return requestEvidenceV1Schema.parse({
    ageStageBand: { basis: "age", value: "2_3" },
    currentInterestPhaseIds: [],
    historicalInterestPhaseIds: [],
    preferenceObservationIds: [],
    readingEventIds: [],
    reactionIds: [],
    requestReferenceIds: [],
    ...overrides,
  });
}

describe("recommendation request evidence", () => {
  it("sorts, deduplicates, and freezes identifier sets", () => {
    expect(sortedUniqueIds(["b", "a", "b"])).toEqual(["a", "b"]);
    expect(requestEvidenceV1Schema.safeParse({
      ...snapshot(),
      currentInterestPhaseIds: ["b", "a"],
    }).success).toBe(false);
  });

  it("requires a current interest, preference, or request reference for cold start", () => {
    expect(() => assertColdStartReady(snapshot())).toThrow(/needs one current interest/);
    expect(() => assertColdStartReady(snapshot({ currentInterestPhaseIds: ["interest-1"] }))).not.toThrow();
    expect(() => assertColdStartReady(snapshot({ preferenceObservationIds: ["preference-1"] }))).not.toThrow();
    expect(() => assertColdStartReady(snapshot({ requestReferenceIds: ["reference-1"] }))).not.toThrow();
  });

  it("does not let an interest be current and historical at once", () => {
    expect(requestEvidenceV1Schema.safeParse({
      ...snapshot(),
      currentInterestPhaseIds: ["interest-1"],
      historicalInterestPhaseIds: ["interest-1"],
    }).success).toBe(false);
  });
});
