import type { Prisma } from "@prisma/client";
import { DomainInvariantError } from "@/domain/shared/errors";

export async function assertChildBelongsToHousehold(
  transaction: Prisma.TransactionClient,
  householdId: string,
  childId: string,
): Promise<void> {
  const child = await transaction.childProfile.findUnique({
    where: { id_householdId: { id: childId, householdId } },
    select: { id: true },
  });
  if (child === null) throw new DomainInvariantError("The child does not belong to this household.");
}

export async function assertVerifiedWork(
  transaction: Prisma.TransactionClient,
  workId: string,
): Promise<void> {
  const work = await transaction.bookWork.findUnique({
    where: { id: workId },
    select: {
      metadataProvider: true,
      metadataRecordId: true,
      metadataProvenance: true,
    },
  });
  if (
    work === null
    || work.metadataProvider === null
    || work.metadataRecordId === null
    || work.metadataProvenance === null
  ) {
    throw new DomainInvariantError("Preference and request evidence requires a verified book work.");
  }
}

export function sameInstant(left: Date, right: Date): boolean {
  return left.getTime() === right.getTime();
}
