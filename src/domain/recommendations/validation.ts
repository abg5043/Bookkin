import { z } from "zod";

export const recommendationActionTypeSchema = z.enum([
  "saved",
  "rejected",
  "catalog_opened",
  "scanned",
  "borrowed",
  "finished",
  "reread",
]);

export const recommendationActionInputSchema = z.object({
  recommendationId: z.string().trim().min(1),
  actionType: recommendationActionTypeSchema,
  occurredAt: z.coerce.date(),
  readingEventId: z.string().trim().min(1).optional(),
  familyBookEditionId: z.string().trim().min(1).optional(),
});

export type RecommendationActionInput = z.infer<typeof recommendationActionInputSchema>;
export type RecommendationDisposition = "saved" | "rejected" | null;

export function currentRecommendationDisposition(
  actions: readonly RecommendationActionInput[],
): RecommendationDisposition {
  const dispositions = actions
    .map((action, index) => ({ action, index }))
    .filter(({ action }) => action.actionType === "saved" || action.actionType === "rejected")
    .sort((left, right) => {
      const timeDifference = left.action.occurredAt.getTime() - right.action.occurredAt.getTime();
      return timeDifference || left.index - right.index;
    });

  return dispositions.at(-1)?.action.actionType === "saved"
    ? "saved"
    : dispositions.at(-1)?.action.actionType === "rejected"
      ? "rejected"
      : null;
}
