import { prisma } from "@/infrastructure/db/prisma";

const localHouseholdId = "local-household";

export async function getActiveHouseholdId(): Promise<string> {
  const existingHousehold = await prisma.household.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  if (existingHousehold !== null) {
    return existingHousehold.id;
  }

  const household = await prisma.household.create({
    data: { id: localHouseholdId },
    select: { id: true },
  });

  return household.id;
}
