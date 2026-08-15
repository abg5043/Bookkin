import { DomainInvariantError } from "@/domain/shared/errors";

export function assertHouseholdScope(
  expectedHouseholdId: string,
  ...ownedHouseholdIds: Array<string | undefined>
): void {
  for (const ownedHouseholdId of ownedHouseholdIds) {
    if (ownedHouseholdId !== undefined && ownedHouseholdId !== expectedHouseholdId) {
      throw new DomainInvariantError("Records must belong to the same household.");
    }
  }
}
