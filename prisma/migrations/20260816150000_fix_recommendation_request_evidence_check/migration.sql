-- The Checkpoint 5B baseline hardcoded "evidenceSnapshotVersion = 'request-evidence-v1'" into
-- this constraint, which blocks every request-evidence-v2 row outright. It is superseded by
-- the two Checkpoint 7A constraints added in the previous migration
-- (RecommendationRequest_evidenceSnapshotVersion_check and
-- RecommendationRequest_v1_v2_scalar_check), so it is dropped here rather than left in place
-- to silently reject all new writes.
ALTER TABLE "RecommendationRequest" DROP CONSTRAINT "RecommendationRequest_evidence_snapshot_check";

-- Preserve the jsonb_typeof guard the old constraint provided, folded into the v1/v2 scalar
-- check so both requirements live in one constraint again.
ALTER TABLE "RecommendationRequest" DROP CONSTRAINT "RecommendationRequest_v1_v2_scalar_check";

ALTER TABLE "RecommendationRequest"
  ADD CONSTRAINT "RecommendationRequest_v1_v2_scalar_check"
  CHECK (
    jsonb_typeof("evidenceSnapshot") = 'object'
    AND (
      ("evidenceSnapshotVersion" = 'request-evidence-v1' AND "ageStageBasis" IS NOT NULL AND "ageStageValue" IS NOT NULL)
      OR
      ("evidenceSnapshotVersion" = 'request-evidence-v2' AND "ageStageBasis" IS NULL AND "ageStageValue" IS NULL)
    )
  );
