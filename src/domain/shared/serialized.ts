import { z } from "zod";

export const stringListSchema = z.array(z.string().trim().min(1).max(120)).max(100);

export const metadataProvenanceSchema = z.object({
  provider: z.string().trim().min(1).max(80),
  recordId: z.string().trim().min(1).max(200).nullable(),
  fields: z.record(z.string(), z.string().trim().min(1).max(100)),
});

export const sourceSignalSchema = z.object({
  code: z.string().trim().min(1).max(80),
  value: z.number().finite(),
  evidence: z.string().trim().min(1).max(500),
});

export const sourceSignalsSchema = z.array(sourceSignalSchema).max(50);

export const filtersSchema = z.record(
  z.string().trim().min(1).max(80),
  z.union([z.string(), z.number().finite(), z.boolean(), stringListSchema]),
);

export function encodeSerialized<T>(schema: z.ZodType<T>, value: T): string {
  return JSON.stringify(schema.parse(value));
}

export function decodeSerialized<T>(schema: z.ZodType<T>, value: string): T {
  return schema.parse(JSON.parse(value) as unknown);
}
