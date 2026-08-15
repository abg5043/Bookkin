import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const household = await prisma.household.upsert({
    where: { id: "seed-household" },
    update: {},
    create: { id: "seed-household" },
  });

  const child = await prisma.childProfile.upsert({
    where: { id: "seed-child" },
    update: {},
    create: {
      id: "seed-child",
      householdId: household.id,
      displayName: "Demo Reader",
      ageBand: "2-4",
      currentInterests: JSON.stringify(["picture books"]),
      contentPreferences: JSON.stringify([]),
    },
  });

  console.log(`Seeded household ${household.id} with child ${child.id}.`);
  console.log("No book metadata is seeded until verified provider records are available.");
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
