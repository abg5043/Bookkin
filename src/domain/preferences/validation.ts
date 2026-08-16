import { z } from "zod";
import { caregiverReporterSchema } from "@/domain/reading/validation";

const identifierSchema = z.string().trim().min(1).max(120);

export const preferenceObservationInputSchema = z.object({
  householdId: identifierSchema,
  childId: identifierSchema,
  workId: identifierSchema,
  kind: z.literal("worked_for_us"),
  subjectType: z.enum(["child", "caregiver", "family_reference"]),
  reporterType: caregiverReporterSchema,
  declaredAt: z.coerce.date(),
  sourceType: z.literal("explicit_preference"),
  sourceVersion: z.string().trim().min(1).max(80),
  clientMutationId: identifierSchema,
}).strict();

export type PreferenceObservationInput = z.infer<typeof preferenceObservationInputSchema>;
