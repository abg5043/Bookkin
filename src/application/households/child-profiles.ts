import type { ChildProfile } from "@prisma/client";
import { z } from "zod";
import { DomainInvariantError } from "@/domain/shared/errors";
import { ageRangeSchema, toPrismaAgeRange } from "@/domain/children/age-range";
import { readingRelationshipCodeSchema } from "@/domain/reading-relationships/validation";
import { bookKindCodeSchema } from "@/domain/book-kinds/validation";
import { caregiverReporterSchema } from "@/domain/reading/validation";
import { syncReadingRelationships } from "@/application/reading-relationships/reading-relationship-phases";
import { syncBookKinds } from "@/application/book-kinds/book-kind-phases";
import { prisma } from "@/infrastructure/db/prisma";

const identifierSchema = z.string().trim().min(1).max(120);

export const createChildProfileInputSchema = z.object({
  householdId: identifierSchema,
  nickname: z.string().trim().min(1).max(80).optional(),
}).strict();

/**
 * ChildProfile has no clientMutationId column (not part of the approved schema addition),
 * so creation is not retry-idempotent the way phase/event mutations are. The caller is
 * responsible for not double-submitting.
 */
export async function createChildProfile(rawInput: unknown): Promise<ChildProfile> {
  const input = createChildProfileInputSchema.parse(rawInput);
  const household = await prisma.household.findUnique({
    where: { id: input.householdId },
    select: { id: true },
  });
  if (household === null) throw new DomainInvariantError("The household does not exist.");
  return prisma.childProfile.create({ data: input });
}

export const setChildAgeRangeInputSchema = z.object({
  householdId: identifierSchema,
  childId: identifierSchema,
  ageRange: ageRangeSchema,
}).strict();

export async function setChildAgeRange(rawInput: unknown): Promise<ChildProfile> {
  const input = setChildAgeRangeInputSchema.parse(rawInput);
  const child = await prisma.childProfile.findUnique({
    where: { id_householdId: { id: input.childId, householdId: input.householdId } },
    select: { id: true },
  });
  if (child === null) throw new DomainInvariantError("The child does not belong to this household.");
  return prisma.childProfile.update({
    where: { id_householdId: { id: input.childId, householdId: input.householdId } },
    data: { ageRange: toPrismaAgeRange(input.ageRange) },
  });
}

export async function listChildProfiles(householdId: string): Promise<ChildProfile[]> {
  return prisma.childProfile.findMany({ where: { householdId }, orderBy: { createdAt: "asc" } });
}

export const saveChildProfileSetupInputSchema = z.object({
  householdId: identifierSchema,
  childId: identifierSchema,
  ageRange: ageRangeSchema,
  readingRelationshipCodes: z.array(readingRelationshipCodeSchema).min(1),
  bookKindCodes: z.array(bookKindCodeSchema),
  declaredAt: z.coerce.date(),
  reporterType: caregiverReporterSchema,
  sourceVersion: z.string().trim().min(1).max(80),
  // Capped below the 120-char store limit because this ID is suffixed twice before it reaches
  // the phase schemas: ":book-kinds" + ":start:" + the longest code is 38 characters. Accepting
  // the full 120 here would let a schema-legal ID fail validation mid-save, after the age range
  // had already been written.
  clientMutationId: z.string().trim().min(1).max(80),
}).strict();

/**
 * One combined save for the setup/settings "Save profile" action, matching the approved
 * mockup's single submit. Orchestrates three independently idempotent use cases with
 * deterministic per-change mutation IDs derived from one caller-supplied ID; see
 * syncReadingRelationships and syncBookKinds for why this is not one atomic transaction.
 */
export async function saveChildProfileSetup(rawInput: unknown): Promise<ChildProfile> {
  const input = saveChildProfileSetupInputSchema.parse(rawInput);

  await setChildAgeRange({ householdId: input.householdId, childId: input.childId, ageRange: input.ageRange });
  await syncReadingRelationships({
    householdId: input.householdId,
    childId: input.childId,
    desiredCodes: input.readingRelationshipCodes,
    declaredAt: input.declaredAt,
    reporterType: input.reporterType,
    sourceVersion: input.sourceVersion,
    batchMutationId: `${input.clientMutationId}:relationships`,
  });
  await syncBookKinds({
    householdId: input.householdId,
    childId: input.childId,
    desiredCodes: input.bookKindCodes,
    declaredAt: input.declaredAt,
    reporterType: input.reporterType,
    sourceVersion: input.sourceVersion,
    batchMutationId: `${input.clientMutationId}:book-kinds`,
  });

  return prisma.childProfile.findUniqueOrThrow({
    where: { id_householdId: { id: input.childId, householdId: input.householdId } },
  });
}
