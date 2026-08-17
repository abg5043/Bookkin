import { z } from "zod";
import { caregiverReporterSchema } from "@/domain/reading/validation";

const identifierSchema = z.string().trim().min(1).max(120);

export const readingRelationshipCodeSchema = z.enum([
  "read_aloud",
  "reading_together",
  "some_independent",
]);

export const readingRelationshipPhaseInputSchema = z.object({
  householdId: identifierSchema,
  childId: identifierSchema,
  code: readingRelationshipCodeSchema,
  startedAt: z.coerce.date(),
  declaredAt: z.coerce.date(),
  reporterType: caregiverReporterSchema,
  sourceVersion: z.string().trim().min(1).max(80),
  clientMutationId: identifierSchema,
}).strict();

export const readingRelationshipPhaseEndInputSchema = z.object({
  householdId: identifierSchema,
  relationshipPhaseId: identifierSchema,
  endedAt: z.coerce.date(),
  declaredAt: z.coerce.date(),
  reporterType: caregiverReporterSchema,
  sourceVersion: z.string().trim().min(1).max(80),
  clientMutationId: identifierSchema,
}).strict();

export type ReadingRelationshipCode = z.infer<typeof readingRelationshipCodeSchema>;
export type ReadingRelationshipPhaseInput = z.infer<typeof readingRelationshipPhaseInputSchema>;
export type ReadingRelationshipPhaseEndInput = z.infer<typeof readingRelationshipPhaseEndInputSchema>;
