import type { PreferenceObservation } from "@prisma/client";
import { z } from "zod";
import type { BookMetadataProvider } from "@/application/books/book-metadata";
import { persistVerifiedMetadata } from "@/application/books/persist-metadata";
import { createPreferenceObservation } from "@/application/preferences/preference-observations";
import { DomainInvariantError } from "@/domain/shared/errors";
import { prisma } from "@/infrastructure/db/prisma";

const identifierSchema = z.string().trim().min(1).max(120);

export const rememberBookInputSchema = z.object({
  householdId: identifierSchema,
  childId: identifierSchema,
  workRecordId: z.string().trim().min(1).max(200),
  // Deliberately unselected in the UI: the caregiver must state who the book actually worked
  // for, because subject and reporter are separate persisted facts.
  subjectType: z.enum(["child", "caregiver", "family_reference"]),
  declaredAt: z.coerce.date(),
  sourceVersion: z.string().trim().min(1).max(80),
  clientMutationId: identifierSchema,
}).strict();

/**
 * `Add a book that worked` — the durable, profile-scoped entry point for verified references.
 *
 * Persists the verified work through the shared metadata boundary and records one
 * `worked_for_us` observation. It deliberately never creates a FamilyBook, shelf status,
 * reading event, reaction, or borrowing fact: remembering that a book worked is not a claim
 * that the family owns it, borrowed it, or read it on any particular day.
 */
export async function rememberBookForChild(
  rawInput: unknown,
  provider: BookMetadataProvider,
): Promise<PreferenceObservation> {
  const input = rememberBookInputSchema.parse(rawInput);

  const metadata = await provider.lookupWorkByRecordId(input.workRecordId);
  if (metadata === null) {
    throw new DomainInvariantError("This record is no longer available from Open Library. Nothing was saved.");
  }

  const { work } = await persistVerifiedMetadata(prisma, metadata);

  return createPreferenceObservation({
    householdId: input.householdId,
    childId: input.childId,
    workId: work.id,
    kind: "worked_for_us",
    subjectType: input.subjectType,
    reporterType: "caregiver",
    declaredAt: input.declaredAt,
    sourceType: "explicit_preference",
    sourceVersion: input.sourceVersion,
    clientMutationId: input.clientMutationId,
  });
}
