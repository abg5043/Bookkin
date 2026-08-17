import { z } from "zod";
import { DomainInvariantError } from "@/domain/shared/errors";
import { ageRangeSchema } from "@/domain/children/age-range";
import { readingRelationshipCodeSchema } from "@/domain/reading-relationships/validation";
import { bookKindCodeSchema } from "@/domain/book-kinds/validation";
import { topicCodeSchema } from "@/domain/interests/topic-codes";
import { sortedUniqueIds } from "@/domain/recommendations/request-evidence";

const identifierSchema = z.string().trim().min(1).max(120);
const confirmableTopicCodeSchema = topicCodeSchema.exclude(["children_general"]);

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

function sortedUniqueByPhaseId<Code extends string>(codeSchema: z.ZodType<Code>) {
  return z.array(z.object({ phaseId: identifierSchema, code: codeSchema }).strict()).superRefine((rows, context) => {
    const phaseIds = rows.map((row) => row.phaseId);
    if (new Set(phaseIds).size !== phaseIds.length) {
      context.addIssue({ code: "custom", message: "Phase IDs must be unique." });
    }
    for (let index = 1; index < phaseIds.length; index += 1) {
      if (phaseIds[index - 1].localeCompare(phaseIds[index]) >= 0) {
        context.addIssue({ code: "custom", message: "Rows must be sorted by phase ID." });
        break;
      }
    }
  });
}

const genericSourcePlanEntrySchema = z.object({
  sourceCode: z.literal("children_general"),
  authorization: z.object({ kind: z.literal("generic") }).strict(),
}).strict();

const confirmedSourcePlanEntrySchema = z.object({
  sourceCode: confirmableTopicCodeSchema,
  authorization: z.object({
    kind: z.literal("interest_topic_confirmation"),
    interestTopicConfirmationId: identifierSchema,
  }).strict(),
}).strict();

const candidateSourcePlanEntrySchema = z.union([genericSourcePlanEntrySchema, confirmedSourcePlanEntrySchema]);

export const requestEvidenceV2Schema = z.object({
  ageRange: ageRangeSchema,
  readingRelationships: sortedUniqueByPhaseId(readingRelationshipCodeSchema),
  currentInterestPhaseIds: sortedUniqueIdentifierArray(),
  historicalInterestPhaseIds: sortedUniqueIdentifierArray(),
  bookKinds: sortedUniqueByPhaseId(bookKindCodeSchema),
  preferenceObservationIds: sortedUniqueIdentifierArray(),
  readingEventIds: sortedUniqueIdentifierArray(),
  reactionIds: sortedUniqueIdentifierArray(),
  requestReferenceIds: z.union([z.tuple([]), z.tuple([identifierSchema])]),
  candidateSourcePlan: z.array(candidateSourcePlanEntrySchema),
}).strict().superRefine((snapshot, context) => {
  const current = new Set(snapshot.currentInterestPhaseIds);
  if (snapshot.historicalInterestPhaseIds.some((id) => current.has(id))) {
    context.addIssue({
      code: "custom",
      path: ["historicalInterestPhaseIds"],
      message: "An interest phase cannot be both current and historical.",
    });
  }

  const genericEntries = snapshot.candidateSourcePlan.filter((entry) => entry.authorization.kind === "generic");
  if (genericEntries.length !== 1) {
    context.addIssue({
      code: "custom",
      path: ["candidateSourcePlan"],
      message: "The source plan must include exactly one generic entry.",
    });
  }
  const sourceCodes = snapshot.candidateSourcePlan.map((entry) => entry.sourceCode);
  if (new Set(sourceCodes).size !== sourceCodes.length) {
    context.addIssue({ code: "custom", path: ["candidateSourcePlan"], message: "Source codes must be unique." });
  }
  // Confirmation-to-current-interest-phase ownership is verified by the use case that builds
  // this snapshot, since that check needs the InterestTopicConfirmation's own interestPhaseId,
  // which this JSON shape does not carry.
});

export const requestEvidenceV2Version = "request-evidence-v2" as const;
export type RequestEvidenceV2 = z.infer<typeof requestEvidenceV2Schema>;

export { sortedUniqueIds };

export function assertColdStartReadyV2(snapshot: RequestEvidenceV2): void {
  if (snapshot.readingRelationships.length === 0) {
    throw new DomainInvariantError("A recommendation request needs at least one current reading relationship.");
  }
  const hasUsefulSignal = snapshot.currentInterestPhaseIds.length > 0
    || snapshot.bookKinds.length > 0
    || snapshot.preferenceObservationIds.length > 0
    || snapshot.readingEventIds.length > 0
    || snapshot.reactionIds.length > 0
    || snapshot.requestReferenceIds.length > 0;
  if (!hasUsefulSignal) {
    throw new DomainInvariantError(
      "A recommendation request needs one current interest, kind of book, durable preference, reading history signal, or verified request reference.",
    );
  }
}
