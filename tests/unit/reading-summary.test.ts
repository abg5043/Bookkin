import { describe, expect, it } from "vitest";
import { deriveRereadCount, sortReadingEvents } from "../../src/application/reading/summary";

describe("reading summaries", () => {
  it("derives rereads from append-only events", () => {
    expect(deriveRereadCount([
      { eventType: "finished" },
      { eventType: "reread" },
      { eventType: "rejected" },
      { eventType: "reread" },
    ])).toBe(2);
  });

  it("orders newer events first and preserves an append order tie-breaker", () => {
    const events = sortReadingEvents([
      { id: "first", eventType: "finished", occurredAt: new Date("2026-08-01T12:00:00.000Z"), createdAt: new Date("2026-08-01T12:00:01.000Z") },
      { id: "later", eventType: "reread", occurredAt: new Date("2026-08-02T12:00:00.000Z"), createdAt: new Date("2026-08-02T12:00:01.000Z") },
      { id: "same-time-later", eventType: "stopped", occurredAt: new Date("2026-08-01T12:00:00.000Z"), createdAt: new Date("2026-08-01T12:00:02.000Z") },
    ]);

    expect(events.map((event) => event.id)).toEqual(["later", "same-time-later", "first"]);
  });
});
