-- CreateEnum
CREATE TYPE "AgeRange" AS ENUM ('2_3', '4_5', '6_8');

-- CreateEnum
CREATE TYPE "ReadingRelationshipCode" AS ENUM ('read_aloud', 'reading_together', 'some_independent');

-- CreateEnum
CREATE TYPE "BookKindCode" AS ENUM ('funny', 'informative', 'fantasy', 'rhyming', 'interactive', 'gentle_cozy', 'longer_stories', 'wordless_picture_led');

-- CreateEnum
CREATE TYPE "TopicCode" AS ENUM ('children_general', 'animals', 'dinosaurs', 'vehicles', 'construction_vehicles', 'space', 'weather', 'ocean', 'feelings', 'friendship', 'music', 'fairy_tales', 'humor', 'bedtime');

-- CreateEnum
CREATE TYPE "CandidateSourceDisposition" AS ENUM ('resolved', 'unverified_identity', 'source_record_unavailable', 'hydration_failed');

-- CreateEnum
CREATE TYPE "CandidateEvaluationState" AS ENUM ('eligible', 'excluded');

-- CreateEnum
CREATE TYPE "CandidateExclusionReason" AS ENUM ('missing_required_metadata', 'duplicate_canonical_work', 'request_reference_work');

-- CreateEnum
CREATE TYPE "CandidatePoolAttemptStatus" AS ENUM ('started', 'sourced', 'hydrated', 'normalized', 'deduplicated', 'evaluated', 'completed', 'failed');

-- AlterTable
ALTER TABLE "ChildProfile" ADD COLUMN     "ageRange" "AgeRange";

-- Backfill: map only verified legacy age values into the new independent axis.
-- Legacy reading-stage values (pre_reader/emergent_reader/early_independent) do NOT migrate,
-- because a reading stage does not establish how a family currently reads together.
-- Missing axes remain missing and require caregiver completion; Bookkin invents nothing here.
UPDATE "ChildProfile"
SET "ageRange" = CASE "ageStageValue"
  WHEN '2_3' THEN '2_3'::"AgeRange"
  WHEN '4_5' THEN '4_5'::"AgeRange"
  WHEN '6_8' THEN '6_8'::"AgeRange"
  ELSE NULL
END
WHERE "ageStageBasis" = 'age';

-- AlterTable
ALTER TABLE "RecommendationRequest" ALTER COLUMN "ageStageBasis" DROP NOT NULL,
ALTER COLUMN "ageStageValue" DROP NOT NULL;

-- Bind evidenceSnapshotVersion to the two frozen versions and their permitted legacy-scalar combination:
-- v1 rows keep their required legacy age/stage scalars; v2 rows carry age/relationships inside evidenceSnapshot
-- and must not populate the legacy scalar columns.
ALTER TABLE "RecommendationRequest"
  ADD CONSTRAINT "RecommendationRequest_evidenceSnapshotVersion_check"
  CHECK ("evidenceSnapshotVersion" IN ('request-evidence-v1', 'request-evidence-v2'));

ALTER TABLE "RecommendationRequest"
  ADD CONSTRAINT "RecommendationRequest_v1_v2_scalar_check"
  CHECK (
    ("evidenceSnapshotVersion" = 'request-evidence-v1' AND "ageStageBasis" IS NOT NULL AND "ageStageValue" IS NOT NULL)
    OR
    ("evidenceSnapshotVersion" = 'request-evidence-v2' AND "ageStageBasis" IS NULL AND "ageStageValue" IS NULL)
  );

-- CreateTable
CREATE TABLE "ReadingRelationshipPhase" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "code" "ReadingRelationshipCode" NOT NULL,
    "startedAt" TIMESTAMPTZ(3) NOT NULL,
    "declaredAt" TIMESTAMPTZ(3) NOT NULL,
    "reporterType" "ReporterType" NOT NULL,
    "sourceVersion" VARCHAR(80) NOT NULL,
    "clientMutationId" VARCHAR(120) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReadingRelationshipPhase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReadingRelationshipPhaseEnd" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "relationshipPhaseId" TEXT NOT NULL,
    "endedAt" TIMESTAMPTZ(3) NOT NULL,
    "declaredAt" TIMESTAMPTZ(3) NOT NULL,
    "reporterType" "ReporterType" NOT NULL,
    "sourceVersion" VARCHAR(80) NOT NULL,
    "clientMutationId" VARCHAR(120) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReadingRelationshipPhaseEnd_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReadingRelationshipPhaseAmendment" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "kind" "AmendmentKind" NOT NULL,
    "targetId" TEXT NOT NULL,
    "replacementId" TEXT,
    "declaredAt" TIMESTAMPTZ(3) NOT NULL,
    "reporterType" "ReporterType" NOT NULL,
    "reasonCode" VARCHAR(80),
    "clientMutationId" VARCHAR(120) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReadingRelationshipPhaseAmendment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookKindPhase" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "code" "BookKindCode" NOT NULL,
    "startedAt" TIMESTAMPTZ(3) NOT NULL,
    "declaredAt" TIMESTAMPTZ(3) NOT NULL,
    "reporterType" "ReporterType" NOT NULL,
    "sourceVersion" VARCHAR(80) NOT NULL,
    "clientMutationId" VARCHAR(120) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookKindPhase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookKindPhaseEnd" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "bookKindPhaseId" TEXT NOT NULL,
    "endedAt" TIMESTAMPTZ(3) NOT NULL,
    "declaredAt" TIMESTAMPTZ(3) NOT NULL,
    "reporterType" "ReporterType" NOT NULL,
    "sourceVersion" VARCHAR(80) NOT NULL,
    "clientMutationId" VARCHAR(120) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookKindPhaseEnd_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookKindPhaseAmendment" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "kind" "AmendmentKind" NOT NULL,
    "targetId" TEXT NOT NULL,
    "replacementId" TEXT,
    "declaredAt" TIMESTAMPTZ(3) NOT NULL,
    "reporterType" "ReporterType" NOT NULL,
    "reasonCode" VARCHAR(80),
    "clientMutationId" VARCHAR(120) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookKindPhaseAmendment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterestTopicConfirmation" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "interestPhaseId" TEXT NOT NULL,
    "topicCode" "TopicCode" NOT NULL,
    "declaredAt" TIMESTAMPTZ(3) NOT NULL,
    "reporterType" "ReporterType" NOT NULL,
    "sourceVersion" VARCHAR(80) NOT NULL,
    "clientMutationId" VARCHAR(120) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InterestTopicConfirmation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterestTopicConfirmationRevocation" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "confirmationId" TEXT NOT NULL,
    "reasonCode" VARCHAR(80),
    "declaredAt" TIMESTAMPTZ(3) NOT NULL,
    "reporterType" "ReporterType" NOT NULL,
    "clientMutationId" VARCHAR(120) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InterestTopicConfirmationRevocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidatePoolAttempt" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "status" "CandidatePoolAttemptStatus" NOT NULL,
    "strategyVersion" VARCHAR(80) NOT NULL,
    "normalizationVersion" VARCHAR(80) NOT NULL,
    "eligibilityVersion" VARCHAR(80) NOT NULL,
    "failureCode" VARCHAR(80),
    "coverageSummary" JSONB,
    "startedAt" TIMESTAMPTZ(3) NOT NULL,
    "completedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CandidatePoolAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateSourceRecord" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "provider" VARCHAR(80) NOT NULL,
    "providerRecordId" VARCHAR(200) NOT NULL,
    "sourceCode" "TopicCode" NOT NULL,
    "providerResultPosition" INTEGER,
    "resolvedWorkId" TEXT,
    "disposition" "CandidateSourceDisposition" NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CandidateSourceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateEvaluation" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "workId" TEXT NOT NULL,
    "state" "CandidateEvaluationState" NOT NULL,
    "exclusionReason" "CandidateExclusionReason",
    "fieldCoverage" JSONB NOT NULL,
    "dedupeEvidence" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CandidateEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateEvaluationSource" (
    "evaluationId" TEXT NOT NULL,
    "sourceRecordId" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CandidateEvaluationSource_pkey" PRIMARY KEY ("evaluationId","sourceRecordId")
);

-- CreateIndex
CREATE INDEX "ReadingRelationshipPhase_householdId_childId_startedAt_idx" ON "ReadingRelationshipPhase"("householdId", "childId", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReadingRelationshipPhase_id_householdId_key" ON "ReadingRelationshipPhase"("id", "householdId");

-- CreateIndex
CREATE UNIQUE INDEX "ReadingRelationshipPhase_householdId_clientMutationId_key" ON "ReadingRelationshipPhase"("householdId", "clientMutationId");

-- CreateIndex
CREATE UNIQUE INDEX "ReadingRelationshipPhaseEnd_relationshipPhaseId_key" ON "ReadingRelationshipPhaseEnd"("relationshipPhaseId");

-- CreateIndex
CREATE INDEX "ReadingRelationshipPhaseEnd_householdId_endedAt_idx" ON "ReadingRelationshipPhaseEnd"("householdId", "endedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReadingRelationshipPhaseEnd_id_householdId_key" ON "ReadingRelationshipPhaseEnd"("id", "householdId");

-- CreateIndex
CREATE UNIQUE INDEX "ReadingRelationshipPhaseEnd_relationshipPhaseId_householdId_key" ON "ReadingRelationshipPhaseEnd"("relationshipPhaseId", "householdId");

-- CreateIndex
CREATE UNIQUE INDEX "ReadingRelationshipPhaseEnd_householdId_clientMutationId_key" ON "ReadingRelationshipPhaseEnd"("householdId", "clientMutationId");

-- CreateIndex
CREATE UNIQUE INDEX "ReadingRelationshipPhaseAmendment_targetId_key" ON "ReadingRelationshipPhaseAmendment"("targetId");

-- CreateIndex
CREATE UNIQUE INDEX "ReadingRelationshipPhaseAmendment_replacementId_key" ON "ReadingRelationshipPhaseAmendment"("replacementId");

-- CreateIndex
CREATE INDEX "ReadingRelationshipPhaseAmendment_householdId_declaredAt_idx" ON "ReadingRelationshipPhaseAmendment"("householdId", "declaredAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReadingRelationshipPhaseAmendment_householdId_clientMutatio_key" ON "ReadingRelationshipPhaseAmendment"("householdId", "clientMutationId");

-- CreateIndex
CREATE UNIQUE INDEX "ReadingRelationshipPhaseAmendment_targetId_householdId_key" ON "ReadingRelationshipPhaseAmendment"("targetId", "householdId");

-- CreateIndex
CREATE UNIQUE INDEX "ReadingRelationshipPhaseAmendment_replacementId_householdId_key" ON "ReadingRelationshipPhaseAmendment"("replacementId", "householdId");

-- CreateIndex
CREATE INDEX "BookKindPhase_householdId_childId_startedAt_idx" ON "BookKindPhase"("householdId", "childId", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "BookKindPhase_id_householdId_key" ON "BookKindPhase"("id", "householdId");

-- CreateIndex
CREATE UNIQUE INDEX "BookKindPhase_householdId_clientMutationId_key" ON "BookKindPhase"("householdId", "clientMutationId");

-- CreateIndex
CREATE UNIQUE INDEX "BookKindPhaseEnd_bookKindPhaseId_key" ON "BookKindPhaseEnd"("bookKindPhaseId");

-- CreateIndex
CREATE INDEX "BookKindPhaseEnd_householdId_endedAt_idx" ON "BookKindPhaseEnd"("householdId", "endedAt");

-- CreateIndex
CREATE UNIQUE INDEX "BookKindPhaseEnd_id_householdId_key" ON "BookKindPhaseEnd"("id", "householdId");

-- CreateIndex
CREATE UNIQUE INDEX "BookKindPhaseEnd_bookKindPhaseId_householdId_key" ON "BookKindPhaseEnd"("bookKindPhaseId", "householdId");

-- CreateIndex
CREATE UNIQUE INDEX "BookKindPhaseEnd_householdId_clientMutationId_key" ON "BookKindPhaseEnd"("householdId", "clientMutationId");

-- CreateIndex
CREATE UNIQUE INDEX "BookKindPhaseAmendment_targetId_key" ON "BookKindPhaseAmendment"("targetId");

-- CreateIndex
CREATE UNIQUE INDEX "BookKindPhaseAmendment_replacementId_key" ON "BookKindPhaseAmendment"("replacementId");

-- CreateIndex
CREATE INDEX "BookKindPhaseAmendment_householdId_declaredAt_idx" ON "BookKindPhaseAmendment"("householdId", "declaredAt");

-- CreateIndex
CREATE UNIQUE INDEX "BookKindPhaseAmendment_householdId_clientMutationId_key" ON "BookKindPhaseAmendment"("householdId", "clientMutationId");

-- CreateIndex
CREATE UNIQUE INDEX "BookKindPhaseAmendment_targetId_householdId_key" ON "BookKindPhaseAmendment"("targetId", "householdId");

-- CreateIndex
CREATE UNIQUE INDEX "BookKindPhaseAmendment_replacementId_householdId_key" ON "BookKindPhaseAmendment"("replacementId", "householdId");

-- CreateIndex
CREATE INDEX "InterestTopicConfirmation_householdId_childId_idx" ON "InterestTopicConfirmation"("householdId", "childId");

-- CreateIndex
CREATE UNIQUE INDEX "InterestTopicConfirmation_id_householdId_key" ON "InterestTopicConfirmation"("id", "householdId");

-- CreateIndex
CREATE UNIQUE INDEX "InterestTopicConfirmation_interestPhaseId_householdId_key" ON "InterestTopicConfirmation"("interestPhaseId", "householdId");

-- CreateIndex
CREATE UNIQUE INDEX "InterestTopicConfirmation_interestPhaseId_householdId_child_key" ON "InterestTopicConfirmation"("interestPhaseId", "householdId", "childId");

-- CreateIndex
CREATE UNIQUE INDEX "InterestTopicConfirmation_householdId_clientMutationId_key" ON "InterestTopicConfirmation"("householdId", "clientMutationId");

-- CreateIndex
CREATE UNIQUE INDEX "InterestTopicConfirmationRevocation_confirmationId_key" ON "InterestTopicConfirmationRevocation"("confirmationId");

-- CreateIndex
CREATE INDEX "InterestTopicConfirmationRevocation_householdId_childId_idx" ON "InterestTopicConfirmationRevocation"("householdId", "childId");

-- CreateIndex
CREATE UNIQUE INDEX "InterestTopicConfirmationRevocation_id_householdId_key" ON "InterestTopicConfirmationRevocation"("id", "householdId");

-- CreateIndex
CREATE UNIQUE INDEX "InterestTopicConfirmationRevocation_confirmationId_househol_key" ON "InterestTopicConfirmationRevocation"("confirmationId", "householdId");

-- CreateIndex
CREATE UNIQUE INDEX "InterestTopicConfirmationRevocation_householdId_clientMutat_key" ON "InterestTopicConfirmationRevocation"("householdId", "clientMutationId");

-- CreateIndex
CREATE INDEX "CandidatePoolAttempt_householdId_childId_requestId_idx" ON "CandidatePoolAttempt"("householdId", "childId", "requestId");

-- CreateIndex
CREATE UNIQUE INDEX "CandidatePoolAttempt_id_householdId_key" ON "CandidatePoolAttempt"("id", "householdId");

-- CreateIndex
CREATE UNIQUE INDEX "CandidatePoolAttempt_id_householdId_childId_key" ON "CandidatePoolAttempt"("id", "householdId", "childId");

-- CreateIndex
CREATE UNIQUE INDEX "CandidatePoolAttempt_requestId_householdId_childId_attemptN_key" ON "CandidatePoolAttempt"("requestId", "householdId", "childId", "attemptNumber");

-- CreateIndex
CREATE INDEX "CandidateSourceRecord_householdId_childId_attemptId_idx" ON "CandidateSourceRecord"("householdId", "childId", "attemptId");

-- CreateIndex
CREATE UNIQUE INDEX "CandidateSourceRecord_id_householdId_key" ON "CandidateSourceRecord"("id", "householdId");

-- CreateIndex
CREATE UNIQUE INDEX "CandidateSourceRecord_id_householdId_childId_attemptId_key" ON "CandidateSourceRecord"("id", "householdId", "childId", "attemptId");

-- CreateIndex
CREATE UNIQUE INDEX "CandidateSourceRecord_attemptId_householdId_childId_provide_key" ON "CandidateSourceRecord"("attemptId", "householdId", "childId", "provider", "providerRecordId", "sourceCode");

-- CreateIndex
CREATE INDEX "CandidateEvaluation_householdId_childId_attemptId_idx" ON "CandidateEvaluation"("householdId", "childId", "attemptId");

-- CreateIndex
CREATE UNIQUE INDEX "CandidateEvaluation_id_householdId_key" ON "CandidateEvaluation"("id", "householdId");

-- CreateIndex
CREATE UNIQUE INDEX "CandidateEvaluation_id_householdId_childId_attemptId_key" ON "CandidateEvaluation"("id", "householdId", "childId", "attemptId");

-- CreateIndex
CREATE UNIQUE INDEX "CandidateEvaluation_attemptId_householdId_childId_workId_key" ON "CandidateEvaluation"("attemptId", "householdId", "childId", "workId");

-- CreateIndex
CREATE INDEX "CandidateEvaluationSource_householdId_childId_attemptId_idx" ON "CandidateEvaluationSource"("householdId", "childId", "attemptId");

-- CreateIndex
CREATE UNIQUE INDEX "InterestPhase_id_householdId_childId_key" ON "InterestPhase"("id", "householdId", "childId");

-- CreateIndex
CREATE UNIQUE INDEX "RecommendationRequest_id_householdId_childId_key" ON "RecommendationRequest"("id", "householdId", "childId");

-- AddForeignKey
ALTER TABLE "ReadingRelationshipPhase" ADD CONSTRAINT "ReadingRelationshipPhase_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadingRelationshipPhase" ADD CONSTRAINT "ReadingRelationshipPhase_childId_householdId_fkey" FOREIGN KEY ("childId", "householdId") REFERENCES "ChildProfile"("id", "householdId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadingRelationshipPhaseEnd" ADD CONSTRAINT "ReadingRelationshipPhaseEnd_relationshipPhaseId_householdI_fkey" FOREIGN KEY ("relationshipPhaseId", "householdId") REFERENCES "ReadingRelationshipPhase"("id", "householdId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadingRelationshipPhaseAmendment" ADD CONSTRAINT "ReadingRelationshipPhaseAmendment_targetId_householdId_fkey" FOREIGN KEY ("targetId", "householdId") REFERENCES "ReadingRelationshipPhase"("id", "householdId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadingRelationshipPhaseAmendment" ADD CONSTRAINT "ReadingRelationshipPhaseAmendment_replacementId_householdI_fkey" FOREIGN KEY ("replacementId", "householdId") REFERENCES "ReadingRelationshipPhase"("id", "householdId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookKindPhase" ADD CONSTRAINT "BookKindPhase_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookKindPhase" ADD CONSTRAINT "BookKindPhase_childId_householdId_fkey" FOREIGN KEY ("childId", "householdId") REFERENCES "ChildProfile"("id", "householdId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookKindPhaseEnd" ADD CONSTRAINT "BookKindPhaseEnd_bookKindPhaseId_householdId_fkey" FOREIGN KEY ("bookKindPhaseId", "householdId") REFERENCES "BookKindPhase"("id", "householdId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookKindPhaseAmendment" ADD CONSTRAINT "BookKindPhaseAmendment_targetId_householdId_fkey" FOREIGN KEY ("targetId", "householdId") REFERENCES "BookKindPhase"("id", "householdId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookKindPhaseAmendment" ADD CONSTRAINT "BookKindPhaseAmendment_replacementId_householdId_fkey" FOREIGN KEY ("replacementId", "householdId") REFERENCES "BookKindPhase"("id", "householdId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterestTopicConfirmation" ADD CONSTRAINT "InterestTopicConfirmation_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterestTopicConfirmation" ADD CONSTRAINT "InterestTopicConfirmation_childId_householdId_fkey" FOREIGN KEY ("childId", "householdId") REFERENCES "ChildProfile"("id", "householdId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterestTopicConfirmation" ADD CONSTRAINT "InterestTopicConfirmation_interestPhaseId_householdId_chil_fkey" FOREIGN KEY ("interestPhaseId", "householdId", "childId") REFERENCES "InterestPhase"("id", "householdId", "childId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterestTopicConfirmationRevocation" ADD CONSTRAINT "InterestTopicConfirmationRevocation_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterestTopicConfirmationRevocation" ADD CONSTRAINT "InterestTopicConfirmationRevocation_confirmationId_househo_fkey" FOREIGN KEY ("confirmationId", "householdId") REFERENCES "InterestTopicConfirmation"("id", "householdId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidatePoolAttempt" ADD CONSTRAINT "CandidatePoolAttempt_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidatePoolAttempt" ADD CONSTRAINT "CandidatePoolAttempt_childId_householdId_fkey" FOREIGN KEY ("childId", "householdId") REFERENCES "ChildProfile"("id", "householdId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidatePoolAttempt" ADD CONSTRAINT "CandidatePoolAttempt_requestId_householdId_childId_fkey" FOREIGN KEY ("requestId", "householdId", "childId") REFERENCES "RecommendationRequest"("id", "householdId", "childId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateSourceRecord" ADD CONSTRAINT "CandidateSourceRecord_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateSourceRecord" ADD CONSTRAINT "CandidateSourceRecord_attemptId_householdId_childId_fkey" FOREIGN KEY ("attemptId", "householdId", "childId") REFERENCES "CandidatePoolAttempt"("id", "householdId", "childId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateSourceRecord" ADD CONSTRAINT "CandidateSourceRecord_resolvedWorkId_fkey" FOREIGN KEY ("resolvedWorkId") REFERENCES "BookWork"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateEvaluation" ADD CONSTRAINT "CandidateEvaluation_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateEvaluation" ADD CONSTRAINT "CandidateEvaluation_attemptId_householdId_childId_fkey" FOREIGN KEY ("attemptId", "householdId", "childId") REFERENCES "CandidatePoolAttempt"("id", "householdId", "childId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateEvaluation" ADD CONSTRAINT "CandidateEvaluation_workId_fkey" FOREIGN KEY ("workId") REFERENCES "BookWork"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateEvaluationSource" ADD CONSTRAINT "CandidateEvaluationSource_evaluationId_householdId_childId_fkey" FOREIGN KEY ("evaluationId", "householdId", "childId", "attemptId") REFERENCES "CandidateEvaluation"("id", "householdId", "childId", "attemptId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateEvaluationSource" ADD CONSTRAINT "CandidateEvaluationSource_sourceRecordId_householdId_child_fkey" FOREIGN KEY ("sourceRecordId", "householdId", "childId", "attemptId") REFERENCES "CandidateSourceRecord"("id", "householdId", "childId", "attemptId") ON DELETE CASCADE ON UPDATE CASCADE;
