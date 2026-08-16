import { describe, expect, it } from "vitest";
import { resolveValidChains } from "@/domain/reading/valid-chain";

const options = {
  expectedHouseholdId: "household-1",
  isCompatibleReplacement: () => true,
};

describe("source-preserving valid-chain resolution", () => {
  it("keeps only the replacement leaf and maps the source to it", () => {
    const source = { id: "source", householdId: "household-1" };
    const replacement = { id: "replacement", householdId: "household-1" };
    const result = resolveValidChains([source, replacement], [{
      householdId: "household-1",
      kind: "replace",
      targetId: source.id,
      replacementId: replacement.id,
    }], options);

    expect(result.leaves).toEqual([replacement]);
    expect(result.invalidRecordIds).toEqual(new Set([source.id]));
    expect(result.leafByRecordId.get(source.id)).toEqual(replacement);
  });

  it("removes a retracted chain without deleting its source", () => {
    const source = { id: "source", householdId: "household-1" };
    const result = resolveValidChains([source], [{
      householdId: "household-1",
      kind: "retract",
      targetId: source.id,
      replacementId: null,
    }], options);

    expect(result.leaves).toEqual([]);
    expect(result.leafByRecordId.get(source.id)).toBeNull();
  });

  it("rejects branches, cycles, and household crossings", () => {
    const records = [
      { id: "a", householdId: "household-1" },
      { id: "b", householdId: "household-1" },
    ];
    expect(() => resolveValidChains(records, [
      { householdId: "household-1", kind: "replace", targetId: "a", replacementId: "b" },
      { householdId: "household-1", kind: "retract", targetId: "a", replacementId: null },
    ], options)).toThrow(/multiple leaves/);

    expect(() => resolveValidChains(records, [
      { householdId: "household-1", kind: "replace", targetId: "a", replacementId: "b" },
      { householdId: "household-1", kind: "replace", targetId: "b", replacementId: "a" },
    ], options)).toThrow(/cycle/);

    expect(() => resolveValidChains([
      { id: "foreign", householdId: "household-2" },
    ], [], options)).toThrow(/household boundaries/);
  });
});
