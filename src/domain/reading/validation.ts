import { z } from "zod";

export const readingEventTypeSchema = z.enum([
  "finished",
  "reread",
  "stopped",
  "rejected",
  "borrowed",
  "returned",
  "child_selected",
  "parent_selected",
]);

export const stopReasonSchema = z.enum([
  "too_long",
  "too_scary",
  "not_interested",
  "wrong_timing",
  "other",
]);

export const readingEventInputSchema = z.object({
  householdId: z.string().trim().min(1),
  childId: z.string().trim().min(1),
  workId: z.string().trim().min(1),
  editionId: z.string().trim().min(1).optional(),
  eventType: readingEventTypeSchema,
  occurredAt: z.coerce.date(),
  context: z.string().trim().max(120).optional(),
  stopReason: stopReasonSchema.optional(),
  notes: z.string().trim().max(500).optional(),
}).superRefine((value, context) => {
  if (value.stopReason && value.eventType !== "stopped" && value.eventType !== "rejected") {
    context.addIssue({
      code: "custom",
      path: ["stopReason"],
      message: "A stop reason is only valid for stopped or rejected events.",
    });
  }
});

export const reactionSubjectSchema = z.enum(["child", "parent"]);
export const childReactionValueSchema = z.enum(["love", "like", "not_for_me"]);
export const parentReactionValueSchema = z.enum(["love", "like", "dislike"]);

export const reactionInputSchema = z.object({
  readingEventId: z.string().trim().min(1),
  subjectType: reactionSubjectSchema,
  value: z.string().trim().min(1),
  tags: z.array(z.string().trim().min(1).max(80)).max(10).optional(),
}).superRefine((reaction, context) => {
  const validValues = reaction.subjectType === "child"
    ? childReactionValueSchema.options
    : parentReactionValueSchema.options;

  if (!validValues.includes(reaction.value as never)) {
    context.addIssue({
      code: "custom",
      path: ["value"],
      message: `Invalid ${reaction.subjectType} reaction value.`,
    });
  }
});

export type ReadingEventInput = z.infer<typeof readingEventInputSchema>;
export type ReactionInput = z.infer<typeof reactionInputSchema>;
