import { z } from "zod";

export const familyBookShelfStatusSchema = z.enum([
  "owned",
  "borrowed",
  "wishlist",
]);

export const familyBookInputSchema = z.object({
  householdId: z.string().trim().min(1),
  workId: z.string().trim().min(1),
  editionId: z.string().trim().min(1).optional(),
  shelfStatus: familyBookShelfStatusSchema,
  addedVia: z.enum(["scan", "manual_isbn", "search", "recommendation", "seed"]),
});
