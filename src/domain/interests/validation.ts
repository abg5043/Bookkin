import { z } from "zod";
import { caregiverReporterSchema } from "@/domain/reading/validation";

const identifierSchema = z.string().trim().min(1).max(120);

export const interestPhaseInputSchema = z.object({
  householdId: identifierSchema,
  childId: identifierSchema,
  label: z.string().trim().min(1).max(120),
  startedAt: z.coerce.date(),
  declaredAt: z.coerce.date(),
  reporterType: caregiverReporterSchema,
  sourceVersion: z.string().trim().min(1).max(80),
  clientMutationId: identifierSchema,
}).strict();

export const interestPhaseEndInputSchema = z.object({
  householdId: identifierSchema,
  interestPhaseId: identifierSchema,
  endedAt: z.coerce.date(),
  declaredAt: z.coerce.date(),
  reporterType: caregiverReporterSchema,
  sourceVersion: z.string().trim().min(1).max(80),
  clientMutationId: identifierSchema,
}).strict();

export type InterestPhaseInput = z.infer<typeof interestPhaseInputSchema>;
export type InterestPhaseEndInput = z.infer<typeof interestPhaseEndInputSchema>;
