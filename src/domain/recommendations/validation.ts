import { z } from "zod";
import { DomainInvariantError } from "@/domain/shared/errors";

const identifierSchema = z.string().trim().min(1).max(120);

export const recommendationActionTypeSchema = z.enum([
  "saved",
  "not_for_us",
  "catalog_opened",
  "replacement_requested",
  "reading_attributed",
]);

// This freezes the future domain boundary only. Checkpoint 5B adds no action persistence.
export const recommendationActionInputSchema = z.object({
  householdId: identifierSchema,
  requestId: identifierSchema,
  workId: identifierSchema,
  actionType: recommendationActionTypeSchema,
  declaredAt: z.coerce.date(),
  clientMutationId: identifierSchema,
  readingEventId: identifierSchema.optional(),
}).strict().superRefine((action, context) => {
  const requiresReadingEvent = action.actionType === "reading_attributed";
  if (requiresReadingEvent !== (action.readingEventId !== undefined)) {
    context.addIssue({
      code: "custom",
      path: ["readingEventId"],
      message: requiresReadingEvent
        ? "Reading attribution requires a valid reading event."
        : "Only reading attribution may link a reading event.",
    });
  }
});

export type RecommendationActionInput = z.infer<typeof recommendationActionInputSchema>;
export type RecommendationDisposition = "saved" | "not_for_us" | null;

export function currentRecommendationDisposition(
  actions: readonly RecommendationActionInput[],
): RecommendationDisposition {
  const dispositions = actions
    .map((action, index) => ({ action, index }))
    .filter(({ action }) => action.actionType === "saved" || action.actionType === "not_for_us")
    .sort((left, right) => {
      const timeDifference = left.action.declaredAt.getTime() - right.action.declaredAt.getTime();
      return timeDifference || left.index - right.index;
    });

  const latest = dispositions.at(-1)?.action.actionType;
  return latest === "saved" || latest === "not_for_us" ? latest : null;
}

export const evidenceStateSchema = z.enum(["sufficient", "limited"]);
export const limitedResultReasonSchema = z.enum([
  "verified_pool_exhausted",
  "exclusions_reduced_pool",
  "provider_coverage_limited",
]);

const bagBaseSchema = z.object({
  requestId: identifierSchema,
  evidenceState: evidenceStateSchema,
  targetCount: z.literal(5),
  actualCount: z.number().int().min(0).max(5),
  workIds: z.array(identifierSchema).max(5),
}).strict();

export const recommendationBagResultSchema = z.discriminatedUnion("resultType", [
  bagBaseSchema.extend({
    resultType: z.literal("normal"),
    actualCount: z.number().int().min(3).max(5),
    workIds: z.array(identifierSchema).min(3).max(5),
  }).strict(),
  bagBaseSchema.extend({
    resultType: z.literal("limited_verified_pool"),
    actualCount: z.number().int().min(1).max(2),
    workIds: z.array(identifierSchema).min(1).max(2),
    reason: limitedResultReasonSchema,
  }).strict(),
  bagBaseSchema.extend({
    resultType: z.literal("no_eligible_candidates"),
    actualCount: z.literal(0),
    workIds: z.tuple([]),
    reason: limitedResultReasonSchema,
  }).strict(),
]).superRefine((result, context) => {
  if (result.actualCount !== result.workIds.length) {
    context.addIssue({
      code: "custom",
      path: ["actualCount"],
      message: "Actual count must equal the number of work IDs.",
    });
  }
  if (new Set(result.workIds).size !== result.workIds.length) {
    context.addIssue({
      code: "custom",
      path: ["workIds"],
      message: "Recommendation results cannot contain duplicate works.",
    });
  }
});

export type RecommendationBagResult = z.infer<typeof recommendationBagResultSchema>;

export function validateRecommendationBagResult(
  rawResult: unknown,
  verifiedWorkIds: ReadonlySet<string>,
): RecommendationBagResult {
  const result = recommendationBagResultSchema.parse(rawResult);
  for (const workId of result.workIds) {
    if (!verifiedWorkIds.has(workId)) {
      throw new DomainInvariantError(`Recommendation work is not verified: ${workId}.`);
    }
  }
  return result;
}
