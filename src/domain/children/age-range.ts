import { z } from "zod";

export const ageRangeSchema = z.enum(["2_3", "4_5", "6_8"]);
export type AgeRange = z.infer<typeof ageRangeSchema>;

export function toPrismaAgeRange(value: AgeRange) {
  if (value === "2_3") return "age_2_3" as const;
  if (value === "4_5") return "age_4_5" as const;
  return "age_6_8" as const;
}

export function fromPrismaAgeRange(value: "age_2_3" | "age_4_5" | "age_6_8"): AgeRange {
  if (value === "age_2_3") return "2_3";
  if (value === "age_4_5") return "4_5";
  return "6_8";
}
