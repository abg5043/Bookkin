import { z } from "zod";
import { caregiverReporterSchema } from "@/domain/reading/validation";

const identifierSchema = z.string().trim().min(1).max(120);

export const bookKindCodeSchema = z.enum([
  "funny",
  "informative",
  "fantasy",
  "rhyming",
  "interactive",
  "gentle_cozy",
  "longer_stories",
  "wordless_picture_led",
]);

export const bookKindPhaseInputSchema = z.object({
  householdId: identifierSchema,
  childId: identifierSchema,
  code: bookKindCodeSchema,
  startedAt: z.coerce.date(),
  declaredAt: z.coerce.date(),
  reporterType: caregiverReporterSchema,
  sourceVersion: z.string().trim().min(1).max(80),
  clientMutationId: identifierSchema,
}).strict();

export const bookKindPhaseEndInputSchema = z.object({
  householdId: identifierSchema,
  bookKindPhaseId: identifierSchema,
  endedAt: z.coerce.date(),
  declaredAt: z.coerce.date(),
  reporterType: caregiverReporterSchema,
  sourceVersion: z.string().trim().min(1).max(80),
  clientMutationId: identifierSchema,
}).strict();

export type BookKindCode = z.infer<typeof bookKindCodeSchema>;
export type BookKindPhaseInput = z.infer<typeof bookKindPhaseInputSchema>;
export type BookKindPhaseEndInput = z.infer<typeof bookKindPhaseEndInputSchema>;
