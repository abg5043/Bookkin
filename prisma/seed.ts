import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Deterministic showcase seed for the Checkpoint 7P protected preview.
 *
 * Every book below is a real, well-known children's title with accurate bibliographic facts,
 * recorded under an explicit `bookkin-showcase-seed` provider so it can never be mistaken for a
 * verified Open Library record. Nothing here is invented: no fabricated title, author, cover
 * URL, age guidance, or subject. Fields Bookkin has not verified are left absent rather than
 * filled in, which is what the product promises everywhere else.
 *
 * Re-running this is safe and idempotent; it is the preview reset path.
 */

/**
 * Cover images are served locally from `public/showcase-covers/` and each one is the genuine
 * cover of the title it is attached to. `Goodnight Moon` deliberately has no cover so a
 * reviewer sees the real "Cover unavailable" state alongside the populated one — showing only
 * the happy path would hide how Bookkin handles metadata it does not have.
 */
const showcaseWorks = [
  {
    id: "showcase-work-snowy-day",
    title: "The Snowy Day",
    authors: ["Ezra Jack Keats"],
    subjects: ["winter", "snow", "city life"],
    shelfStatus: "owned" as const,
    coverUrl: "/showcase-covers/snowy-day-cover.jpg",
  },
  {
    id: "showcase-work-wild-things",
    title: "Where the Wild Things Are",
    authors: ["Maurice Sendak"],
    subjects: ["imagination", "feelings"],
    shelfStatus: "owned" as const,
    coverUrl: "/showcase-covers/wild-things-cover.jpg",
  },
  {
    id: "showcase-work-market-street",
    title: "Last Stop on Market Street",
    authors: ["Matt de la Peña", "Christian Robinson"],
    subjects: ["city life", "buses", "family", "gratitude"],
    shelfStatus: "borrowed" as const,
    coverUrl: "/showcase-covers/market-street-cover.jpg",
  },
  {
    id: "showcase-work-goodnight-moon",
    title: "Goodnight Moon",
    authors: ["Margaret Wise Brown"],
    subjects: ["bedtime", "rhyming"],
    shelfStatus: "wishlist" as const,
    coverUrl: undefined,
  },
];

async function main() {
  const household = await prisma.household.upsert({
    where: { id: "seed-household" },
    update: {},
    create: { id: "seed-household" },
  });

  const child = await prisma.childProfile.upsert({
    where: { id: "seed-child" },
    update: { ageRange: "age_4_5" },
    create: {
      id: "seed-child",
      householdId: household.id,
      nickname: "Demo reader",
      ageRange: "age_4_5",
    },
  });

  // A completed profile so a reviewer sees the Reading profile settings view rather than an
  // unfinished setup form.
  await prisma.readingRelationshipPhase.upsert({
    where: { id: "showcase-relationship-read-aloud" },
    update: {},
    create: {
      id: "showcase-relationship-read-aloud",
      householdId: household.id,
      childId: child.id,
      code: "read_aloud",
      startedAt: new Date("2026-08-01T12:00:00.000Z"),
      declaredAt: new Date("2026-08-01T12:00:00.000Z"),
      reporterType: "caregiver",
      sourceVersion: "showcase-seed-v1",
      clientMutationId: "showcase-relationship-read-aloud",
    },
  });

  await prisma.bookKindPhase.upsert({
    where: { id: "showcase-kind-funny" },
    update: {},
    create: {
      id: "showcase-kind-funny",
      householdId: household.id,
      childId: child.id,
      code: "funny",
      startedAt: new Date("2026-08-01T12:00:00.000Z"),
      declaredAt: new Date("2026-08-01T12:00:00.000Z"),
      reporterType: "caregiver",
      sourceVersion: "showcase-seed-v1",
      clientMutationId: "showcase-kind-funny",
    },
  });

  // One current interest, deliberately left WITHOUT a topic confirmation so a reviewer can see
  // the consent prompt behavior for themselves rather than being shown the post-consent state.
  await prisma.interestPhase.upsert({
    where: { id: "showcase-interest-dinosaurs" },
    update: {},
    create: {
      id: "showcase-interest-dinosaurs",
      householdId: household.id,
      childId: child.id,
      label: "Dinosaurs",
      startedAt: new Date("2026-08-01T12:00:00.000Z"),
      declaredAt: new Date("2026-08-01T12:00:00.000Z"),
      reporterType: "caregiver",
      sourceVersion: "showcase-seed-v1",
      clientMutationId: "showcase-interest-dinosaurs",
    },
  });

  // Deterministic reset: remove showcase records this seed no longer defines, so changing the
  // book list leaves no orphans behind. Scoped strictly to the showcase provider — records a
  // caregiver added themselves are never touched.
  const showcaseIds = showcaseWorks.map((work) => work.id);
  const staleWorks = await prisma.bookWork.findMany({
    where: { metadataProvider: "bookkin-showcase-seed", id: { notIn: showcaseIds } },
    select: { id: true },
  });
  if (staleWorks.length > 0) {
    const staleIds = staleWorks.map((work) => work.id);
    await prisma.familyBookEdition.deleteMany({ where: { edition: { workId: { in: staleIds } } } });
    await prisma.familyBook.deleteMany({ where: { workId: { in: staleIds } } });
    await prisma.bookEdition.deleteMany({ where: { workId: { in: staleIds } } });
    await prisma.bookWork.deleteMany({ where: { id: { in: staleIds } } });
    console.log(`Removed ${staleWorks.length} showcase book(s) no longer in the seed.`);
  }

  for (const work of showcaseWorks) {
    await prisma.bookWork.upsert({
      where: { id: work.id },
      update: {},
      create: {
        id: work.id,
        title: work.title,
        authors: JSON.stringify(work.authors),
        subjects: JSON.stringify(work.subjects),
        metadataProvider: "bookkin-showcase-seed",
        metadataRecordId: work.id,
        metadataProvenance: JSON.stringify({
          provider: "bookkin-showcase-seed",
          recordId: work.id,
          fields: { title: "showcase seed", authors: "showcase seed", subjects: "showcase seed" },
        }),
      },
    });

    const familyBook = await prisma.familyBook.upsert({
      where: { householdId_workId: { householdId: household.id, workId: work.id } },
      update: { shelfStatus: work.shelfStatus },
      create: {
        householdId: household.id,
        workId: work.id,
        addedVia: "showcase_seed",
        shelfStatus: work.shelfStatus,
      },
    });

    // Cover URLs live on the edition, so a work without a cover simply gets no edition row and
    // renders through the genuine missing-cover path rather than a placeholder value.
    if (work.coverUrl === undefined) continue;

    const editionId = `${work.id}-edition`;
    await prisma.bookEdition.upsert({
      where: { id: editionId },
      update: { coverSmallUrl: work.coverUrl, coverLargeUrl: work.coverUrl },
      create: {
        id: editionId,
        workId: work.id,
        coverSmallUrl: work.coverUrl,
        coverLargeUrl: work.coverUrl,
        metadataProvider: "bookkin-showcase-seed",
        metadataRecordId: editionId,
        metadataProvenance: JSON.stringify({
          provider: "bookkin-showcase-seed",
          recordId: editionId,
          fields: { cover: "showcase seed" },
        }),
      },
    });

    await prisma.familyBookEdition.upsert({
      where: { familyBookId_editionId: { familyBookId: familyBook.id, editionId } },
      update: {},
      create: {
        householdId: household.id,
        familyBookId: familyBook.id,
        editionId,
        addedVia: "showcase_seed",
      },
    });
  }

  // One reading moment with reactions, so the Reading profile history summary is non-zero and
  // the History view has something real to show.
  await prisma.readingEvent.upsert({
    where: { id: "showcase-reading-snowy-day" },
    update: {},
    create: {
      id: "showcase-reading-snowy-day",
      householdId: household.id,
      childId: child.id,
      workId: "showcase-work-snowy-day",
      eventType: "finished",
      occurredAt: new Date("2026-08-10T19:30:00.000Z"),
      clientMutationId: "showcase-reading-snowy-day",
    },
  });

  await prisma.reaction.upsert({
    where: { id: "showcase-reaction-snowy-day-child" },
    update: {},
    create: {
      id: "showcase-reaction-snowy-day-child",
      householdId: household.id,
      readingEventId: "showcase-reading-snowy-day",
      subjectType: "child",
      value: "love",
      declaredAt: new Date("2026-08-10T19:35:00.000Z"),
      reporterType: "caregiver",
      sourceType: "quick_log",
      sourceVersion: "showcase-seed-v1",
      clientMutationId: "showcase-reaction-snowy-day-child",
    },
  });

  console.log(`Seeded household ${household.id} with child ${child.id}.`);
  const withCovers = showcaseWorks.filter((work) => work.coverUrl !== undefined).length;
  console.log(`Showcase shelf: ${showcaseWorks.length} real children's books, 1 reading moment, 1 reaction.`);
  console.log(`Covers: ${withCovers} served locally, ${showcaseWorks.length - withCovers} deliberately missing to show that state.`);
  console.log("All showcase metadata is recorded under the 'bookkin-showcase-seed' provider.");
  console.log("No age guidance is seeded, because Bookkin has not verified it.");
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
