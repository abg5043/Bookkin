-- Replace the multi-classification prototype with one current shelf status.
-- Preserve only unambiguous legacy values; mixed records remain NULL for review.
ALTER TABLE "FamilyBook" ADD COLUMN "shelfStatus" TEXT;

UPDATE "FamilyBook"
SET "shelfStatus" = (
  SELECT "value"
  FROM "FamilyBookClassification"
  WHERE "FamilyBookClassification"."familyBookId" = "FamilyBook"."id"
    AND "value" IN ('owned', 'borrowed', 'wishlist')
  LIMIT 1
)
WHERE (
  SELECT COUNT(*)
  FROM "FamilyBookClassification"
  WHERE "FamilyBookClassification"."familyBookId" = "FamilyBook"."id"
    AND "value" IN ('owned', 'borrowed', 'wishlist')
) = 1;

DROP TABLE "FamilyBookClassification";
