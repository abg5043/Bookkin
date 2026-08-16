import { describe, expect, it } from "vitest";
import { reactionInputSchema, readingEventInputSchema } from "../../src/domain/reading/validation";

describe("reading and reaction validation", () => {
  it("accepts a finished reading event with a UTC timestamp", () => {
    const result = readingEventInputSchema.safeParse({
      householdId: "household-1",
      childId: "child-1",
      workId: "work-1",
      eventType: "finished",
      occurredAt: "2026-08-02T12:00:00.000Z",
      clientMutationId: "reading-1",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.occurredAt.toISOString()).toBe("2026-08-02T12:00:00.000Z");
    }
  });

  it("rejects a stop reason on a non-stop event", () => {
    const result = readingEventInputSchema.safeParse({
      householdId: "household-1",
      childId: "child-1",
      workId: "work-1",
      eventType: "finished",
      occurredAt: "2026-08-02T12:00:00.000Z",
      stopReason: "too_long",
      clientMutationId: "reading-2",
    });

    expect(result.success).toBe(false);
  });

  it("accepts controlled reasons only for stopped or rejected events", () => {
    expect(readingEventInputSchema.safeParse({
      householdId: "household-1",
      childId: "child-1",
      workId: "work-1",
      eventType: "rejected",
      occurredAt: "2026-08-02T12:00:00.000Z",
      stopReason: "too_scary",
      clientMutationId: "reading-3",
    }).success).toBe(true);
  });

  it("keeps child and caregiver reaction vocabularies separate and records provenance", () => {
    const base = {
      householdId: "household-1",
      readingEventId: "event-1",
      declaredAt: "2026-08-02T12:00:00.000Z",
      reporterType: "caregiver",
      sourceType: "quick_log",
      sourceVersion: "quick-log-v1",
      clientMutationId: "reaction-1",
    } as const;

    expect(reactionInputSchema.safeParse({
      ...base,
      subjectType: "child",
      value: "love",
    }).success).toBe(true);

    expect(reactionInputSchema.safeParse({
      ...base,
      subjectType: "child",
      value: "dislike",
    }).success).toBe(false);

    expect(reactionInputSchema.safeParse({
      ...base,
      subjectType: "caregiver",
      value: "dislike",
    }).success).toBe(true);

    expect(reactionInputSchema.safeParse({
      ...base,
      subjectType: "child",
      value: "like",
      reporterType: "child_direct",
    }).success).toBe(false);
  });
});
