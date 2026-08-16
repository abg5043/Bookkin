import { z } from "zod";
import { DomainInvariantError } from "@/domain/shared/errors";

const identifierSchema = z.string().trim().min(1).max(120);

export const ageStageBandV1Schema = z.discriminatedUnion("basis", [
  z.object({
    basis: z.literal("age"),
    value: z.enum(["2_3", "4_5", "6_8"]),
  }).strict(),
  z.object({
    basis: z.literal("reading_stage"),
    value: z.enum(["pre_reader", "emergent_reader", "early_independent"]),
  }).strict(),
]);

function sortedUniqueIdentifierArray() {
  return z.array(identifierSchema).superRefine((ids, context) => {
    if (new Set(ids).size !== ids.length) {
      context.addIssue({ code: "custom", message: "Evidence IDs must be unique." });
    }
    for (let index = 1; index < ids.length; index += 1) {
      if (ids[index - 1].localeCompare(ids[index]) >= 0) {
        context.addIssue({ code: "custom", message: "Evidence IDs must be sorted." });
        break;
      }
    }
  });
}

export const requestEvidenceV1Schema = z.object({
  ageStageBand: ageStageBandV1Schema,
  currentInterestPhaseIds: sortedUniqueIdentifierArray(),
  historicalInterestPhaseIds: sortedUniqueIdentifierArray(),
  preferenceObservationIds: sortedUniqueIdentifierArray(),
  readingEventIds: sortedUniqueIdentifierArray(),
  reactionIds: sortedUniqueIdentifierArray(),
  requestReferenceIds: sortedUniqueIdentifierArray(),
}).strict().superRefine((snapshot, context) => {
  const current = new Set(snapshot.currentInterestPhaseIds);
  if (snapshot.historicalInterestPhaseIds.some((id) => current.has(id))) {
    context.addIssue({
      code: "custom",
      path: ["historicalInterestPhaseIds"],
      message: "An interest phase cannot be both current and historical.",
    });
  }
});

export const requestEvidenceVersion = "request-evidence-v1" as const;
export type AgeStageBandV1 = z.infer<typeof ageStageBandV1Schema>;
export type RequestEvidenceV1 = z.infer<typeof requestEvidenceV1Schema>;

export function sortedUniqueIds(ids: readonly string[]): string[] {
  return [...new Set(ids)].sort((left, right) => left.localeCompare(right));
}

export function assertColdStartReady(snapshot: RequestEvidenceV1): void {
  const hasMinimumEvidence = snapshot.currentInterestPhaseIds.length > 0
    || snapshot.preferenceObservationIds.length > 0
    || snapshot.requestReferenceIds.length > 0;
  if (!hasMinimumEvidence) {
    throw new DomainInvariantError(
      "A recommendation request needs one current interest, durable preference, or verified request reference.",
    );
  }
}
