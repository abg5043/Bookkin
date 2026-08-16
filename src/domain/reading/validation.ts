import { z } from "zod";

const identifierSchema = z.string().trim().min(1).max(120);
const versionSchema = z.string().trim().min(1).max(80);

export const readingMomentEventTypes = [
  "finished",
  "reread",
  "stopped",
  "rejected",
] as const;

export const readingMomentEventTypeSchema = z.enum(readingMomentEventTypes);
export const readingEventTypeSchema = readingMomentEventTypeSchema;

export const stopReasonSchema = z.enum([
  "too_long",
  "too_scary",
  "not_interested",
  "wrong_timing",
  "other",
]);

export const reporterTypeSchema = z.enum([
  "caregiver",
  "child_direct",
  "unknown_legacy",
]);

export const caregiverReporterSchema = z.literal("caregiver");

export const readingEventInputSchema = z.object({
  householdId: identifierSchema,
  childId: identifierSchema,
  workId: identifierSchema,
  editionId: identifierSchema.optional(),
  eventType: readingEventTypeSchema,
  occurredAt: z.coerce.date(),
  context: z.string().trim().min(1).max(120).optional(),
  stopReason: stopReasonSchema.optional(),
  notes: z.string().trim().min(1).max(500).optional(),
  clientMutationId: identifierSchema,
}).strict().superRefine((value, context) => {
  if (value.stopReason && value.eventType !== "stopped" && value.eventType !== "rejected") {
    context.addIssue({
      code: "custom",
      path: ["stopReason"],
      message: "A stop reason is only valid for stopped or rejected events.",
    });
  }
});

export const reactionSubjectSchema = z.enum(["child", "caregiver"]);
export const childReactionValueSchema = z.enum(["love", "like", "not_for_me"]);
export const caregiverReactionValueSchema = z.enum(["love", "like", "dislike"]);

// Kept as a presentation-adapter alias until the separately gated UI renames its prop.
export const parentReactionValueSchema = caregiverReactionValueSchema;

export const reactionSourceTypeSchema = z.enum([
  "quick_log",
  "reaction_correction",
  "correction_carry_forward",
]);

const reactionInputBase = z.object({
  householdId: identifierSchema,
  readingEventId: identifierSchema,
  declaredAt: z.coerce.date(),
  reporterType: reporterTypeSchema,
  sourceType: reactionSourceTypeSchema,
  sourceVersion: versionSchema,
  clientMutationId: identifierSchema,
});

export const reactionInputSchema = z.discriminatedUnion("subjectType", [
  reactionInputBase.extend({
  subjectType: z.literal("child"),
    value: childReactionValueSchema,
    reporterType: caregiverReporterSchema,
  }).strict(),
  reactionInputBase.extend({
    subjectType: z.literal("caregiver"),
    value: caregiverReactionValueSchema,
    reporterType: caregiverReporterSchema,
  }).strict(),
]);

export const amendmentKindSchema = z.enum(["retract", "replace"]);

export const amendmentCommandSchema = z.object({
  householdId: identifierSchema,
  targetId: identifierSchema,
  kind: amendmentKindSchema,
  declaredAt: z.coerce.date(),
  reporterType: caregiverReporterSchema,
  reasonCode: z.string().trim().min(1).max(80).optional(),
  clientMutationId: identifierSchema,
}).strict();

export type ReadingEventInput = z.infer<typeof readingEventInputSchema>;
export type ReactionInput = z.infer<typeof reactionInputSchema>;
export type AmendmentCommand = z.infer<typeof amendmentCommandSchema>;
