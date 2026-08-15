import { describe, expect, it } from "vitest";
import { familyBookInputSchema } from "../../src/domain/family-books/validation";
import { assertHouseholdScope } from "../../src/domain/shared/household";
import { DomainInvariantError } from "../../src/domain/shared/errors";

describe("family-book validation", () => {
  it("requires one current shelf status", () => {
    expect(familyBookInputSchema.safeParse({
      householdId: "household-1",
      workId: "work-1",
      addedVia: "manual_isbn",
      shelfStatus: "borrowed",
    }).success).toBe(true);

    expect(familyBookInputSchema.safeParse({
      householdId: "household-1",
      workId: "work-1",
      addedVia: "manual_isbn",
      shelfStatus: "discovered",
    }).success).toBe(false);

    expect(familyBookInputSchema.safeParse({
      householdId: "household-1",
      workId: "work-1",
      addedVia: "manual_isbn",
    }).success).toBe(false);
  });

  it("rejects records from another household", () => {
    expect(() => assertHouseholdScope("household-1", "household-2")).toThrow(DomainInvariantError);
    expect(() => assertHouseholdScope("household-1", "household-1", undefined)).not.toThrow();
  });
});
