import { describe, expect, it } from "vitest";
import {
  currentRecommendationDisposition,
  recommendationActionInputSchema,
  validateRecommendationBagResult,
} from "../../src/domain/recommendations/validation";

describe("recommendation action semantics", () => {
  const actionBase = {
    householdId: "household-1",
    requestId: "request-1",
    workId: "work-1",
    clientMutationId: "action-1",
  } as const;

  it("uses the latest saved or not-for-us action as disposition", () => {
    const actions = [
      recommendationActionInputSchema.parse({
        ...actionBase,
        actionType: "saved",
        declaredAt: "2026-08-02T12:00:00.000Z",
      }),
      recommendationActionInputSchema.parse({
        ...actionBase,
        clientMutationId: "action-2",
        actionType: "catalog_opened",
        declaredAt: "2026-08-02T12:01:00.000Z",
      }),
      recommendationActionInputSchema.parse({
        ...actionBase,
        clientMutationId: "action-3",
        actionType: "not_for_us",
        declaredAt: "2026-08-02T12:02:00.000Z",
      }),
      recommendationActionInputSchema.parse({
        ...actionBase,
        clientMutationId: "action-4",
        actionType: "saved",
        declaredAt: "2026-08-02T12:03:00.000Z",
      }),
    ];

    expect(currentRecommendationDisposition(actions)).toBe("saved");
  });

  it("keeps additive actions from changing disposition", () => {
    const action = recommendationActionInputSchema.parse({
      ...actionBase,
      actionType: "catalog_opened",
      declaredAt: "2026-08-02T12:00:00.000Z",
    });

    expect(currentRecommendationDisposition([action])).toBe(null);
  });

  it("requires reading attribution to name the reading event", () => {
    expect(recommendationActionInputSchema.safeParse({
      ...actionBase,
      actionType: "reading_attributed",
      declaredAt: "2026-08-02T12:00:00.000Z",
    }).success).toBe(false);

    expect(recommendationActionInputSchema.safeParse({
      ...actionBase,
      actionType: "reading_attributed",
      readingEventId: "reading-1",
      declaredAt: "2026-08-02T12:00:00.000Z",
    }).success).toBe(true);
  });
});

describe("recommendation bag result semantics", () => {
  const verified = new Set(["work-1", "work-2", "work-3", "work-4", "work-5"]);

  it("accepts normal, limited, and empty typed results", () => {
    expect(validateRecommendationBagResult({
      requestId: "request-1",
      evidenceState: "sufficient",
      targetCount: 5,
      resultType: "normal",
      actualCount: 3,
      workIds: ["work-1", "work-2", "work-3"],
    }, verified).resultType).toBe("normal");

    expect(validateRecommendationBagResult({
      requestId: "request-1",
      evidenceState: "limited",
      targetCount: 5,
      resultType: "limited_verified_pool",
      actualCount: 2,
      workIds: ["work-1", "work-2"],
      reason: "verified_pool_exhausted",
    }, verified).resultType).toBe("limited_verified_pool");

    expect(validateRecommendationBagResult({
      requestId: "request-1",
      evidenceState: "limited",
      targetCount: 5,
      resultType: "no_eligible_candidates",
      actualCount: 0,
      workIds: [],
      reason: "exclusions_reduced_pool",
    }, verified).resultType).toBe("no_eligible_candidates");
  });

  it("rejects count mismatches, duplicate works, and unverified works", () => {
    expect(() => validateRecommendationBagResult({
      requestId: "request-1",
      evidenceState: "sufficient",
      targetCount: 5,
      resultType: "normal",
      actualCount: 4,
      workIds: ["work-1", "work-2", "work-3"],
    }, verified)).toThrow();

    expect(() => validateRecommendationBagResult({
      requestId: "request-1",
      evidenceState: "sufficient",
      targetCount: 5,
      resultType: "normal",
      actualCount: 3,
      workIds: ["work-1", "work-1", "work-2"],
    }, verified)).toThrow();

    expect(() => validateRecommendationBagResult({
      requestId: "request-1",
      evidenceState: "limited",
      targetCount: 5,
      resultType: "limited_verified_pool",
      actualCount: 1,
      workIds: ["unverified-work"],
      reason: "provider_coverage_limited",
    }, verified)).toThrow(/not verified/);
  });
});
