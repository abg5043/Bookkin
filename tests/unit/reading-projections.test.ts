import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMocks = vi.hoisted(() => ({
  findMany: vi.fn(),
}));

vi.mock("@/infrastructure/db/prisma", () => ({
  prisma: {
    familyBook: {
      findMany: prismaMocks.findMany,
    },
  },
}));

import { listFamilyShelf } from "@/application/family-books/family-shelf";
import { listHouseholdReadingHistory } from "@/application/reading/reading-history";

const householdEventFilter = { householdId: "household-a" };

function historyBook(id: string, title: string, eventId: string, occurredAt: string) {
  return {
    id,
    shelfStatus: "owned",
    editions: [],
    work: {
      title,
      authors: JSON.stringify([`${title} author`]),
      readingEvents: [{
        id: eventId,
        householdId: "household-a",
        childId: "child-a",
        workId: `${id}-work`,
        editionId: null,
        eventType: "finished",
        occurredAt: new Date(occurredAt),
        createdAt: new Date(occurredAt),
        context: null,
        stopReason: null,
        notes: null,
        clientMutationId: `${eventId}-mutation`,
        targetAmendment: null,
        reactions: [],
      }],
    },
  };
}

describe("reading projections", () => {
  beforeEach(() => {
    prismaMocks.findMany.mockReset();
  });

  it("scopes household history and orders books by their latest valid reading moment", async () => {
    prismaMocks.findMany.mockResolvedValue([
      historyBook("older-book", "Older", "older-event", "2026-08-01T12:00:00.000Z"),
      historyBook("newer-book", "Newer", "newer-event", "2026-08-12T12:00:00.000Z"),
    ]);

    const history = await listHouseholdReadingHistory("household-a");

    expect(history.map((book) => book.id)).toEqual(["newer-book", "older-book"]);
    expect(prismaMocks.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { householdId: "household-a" },
      include: expect.objectContaining({
        work: { include: { readingEvents: expect.objectContaining({ where: householdEventFilter }) } },
      }),
    }));
  });

  it("derives shelf recency only from household-scoped reading moments", async () => {
    prismaMocks.findMany.mockResolvedValue([{
      id: "family-book",
      shelfStatus: "borrowed",
      editions: [],
      work: {
        title: "A Book",
        authors: JSON.stringify(["An Author"]),
        readingEvents: [{
          id: "event-a",
          householdId: "household-a",
          childId: "child-a",
          workId: "work-a",
          editionId: null,
          eventType: "reread",
          occurredAt: new Date("2026-08-10T18:30:00.000Z"),
          context: null,
          stopReason: null,
          notes: null,
          clientMutationId: "event-a-mutation",
          createdAt: new Date("2026-08-10T18:30:00.000Z"),
          targetAmendment: null,
          reactions: [],
        }],
      },
    }]);

    const shelf = await listFamilyShelf("household-a");

    expect(shelf[0].lastReadAt).toBe("2026-08-10T18:30:00.000Z");
    expect(prismaMocks.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { householdId: "household-a" },
      include: expect.objectContaining({
        work: { include: { readingEvents: expect.objectContaining({
          where: householdEventFilter,
        }) } },
      }),
    }));
  });
});
