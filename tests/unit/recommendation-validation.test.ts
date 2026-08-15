import { describe, expect, it } from "vitest";
import {
  currentRecommendationDisposition,
  recommendationActionInputSchema,
} from "../../src/domain/recommendations/validation";

describe("recommendation action semantics", () => {
  it("uses the latest saved or rejected action as disposition", () => {
    const actions = [
      recommendationActionInputSchema.parse({
        recommendationId: "recommendation-1",
        actionType: "saved",
        occurredAt: "2026-08-02T12:00:00.000Z",
      }),
      recommendationActionInputSchema.parse({
        recommendationId: "recommendation-1",
        actionType: "catalog_opened",
        occurredAt: "2026-08-02T12:01:00.000Z",
      }),
      recommendationActionInputSchema.parse({
        recommendationId: "recommendation-1",
        actionType: "rejected",
        occurredAt: "2026-08-02T12:02:00.000Z",
      }),
      recommendationActionInputSchema.parse({
        recommendationId: "recommendation-1",
        actionType: "saved",
        occurredAt: "2026-08-02T12:03:00.000Z",
      }),
    ];

    expect(currentRecommendationDisposition(actions)).toBe("saved");
  });

  it("keeps additive actions from changing disposition", () => {
    const action = recommendationActionInputSchema.parse({
      recommendationId: "recommendation-1",
      actionType: "finished",
      occurredAt: "2026-08-02T12:00:00.000Z",
    });

    expect(currentRecommendationDisposition([action])).toBe(null);
  });
});
