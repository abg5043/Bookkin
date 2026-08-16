-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "AgeStageBasis" AS ENUM ('age', 'reading_stage');

-- CreateEnum
CREATE TYPE "AgeStageValue" AS ENUM ('2_3', '4_5', '6_8', 'pre_reader', 'emergent_reader', 'early_independent');

-- CreateEnum
CREATE TYPE "ShelfStatus" AS ENUM ('owned', 'borrowed', 'wishlist');

-- CreateEnum
CREATE TYPE "ReadingEventType" AS ENUM ('finished', 'reread', 'stopped', 'rejected');

-- CreateEnum
CREATE TYPE "ReactionSubjectType" AS ENUM ('child', 'caregiver');

-- CreateEnum
CREATE TYPE "ReactionValue" AS ENUM ('love', 'like', 'not_for_me', 'dislike');

-- CreateEnum
CREATE TYPE "ReporterType" AS ENUM ('caregiver', 'child_direct', 'unknown_legacy');

-- CreateEnum
CREATE TYPE "ReactionSourceType" AS ENUM ('quick_log', 'reaction_correction', 'correction_carry_forward');

-- CreateEnum
CREATE TYPE "PreferenceKind" AS ENUM ('worked_for_us');

-- CreateEnum
CREATE TYPE "ObservationSubjectType" AS ENUM ('child', 'caregiver', 'family_reference');

-- CreateEnum
CREATE TYPE "PreferenceSourceType" AS ENUM ('explicit_preference');

-- CreateEnum
CREATE TYPE "RequestReferencePurpose" AS ENUM ('more_like_this');

-- CreateEnum
CREATE TYPE "AmendmentKind" AS ENUM ('retract', 'replace');

-- CreateTable
CREATE TABLE "Household" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Household_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChildProfile" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "nickname" VARCHAR(80),
    "ageStageBasis" "AgeStageBasis",
    "ageStageValue" "AgeStageValue",
    "contentPreferences" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ChildProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookWork" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "authors" TEXT NOT NULL,
    "description" TEXT,
    "subjects" TEXT,
    "series" TEXT,
    "language" TEXT,
    "metadataProvider" TEXT,
    "metadataRecordId" TEXT,
    "metadataProvenance" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "BookWork_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookEdition" (
    "id" TEXT NOT NULL,
    "workId" TEXT NOT NULL,
    "isbn10" TEXT,
    "isbn13" TEXT,
    "publisher" TEXT,
    "publicationDate" TEXT,
    "format" TEXT,
    "pageCount" INTEGER,
    "coverSmallUrl" TEXT,
    "coverLargeUrl" TEXT,
    "metadataProvider" TEXT,
    "metadataRecordId" TEXT,
    "metadataProvenance" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "BookEdition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamilyBook" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "workId" TEXT NOT NULL,
    "firstSeenAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "addedVia" TEXT NOT NULL,
    "shelfStatus" "ShelfStatus",
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "FamilyBook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamilyBookEdition" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "familyBookId" TEXT NOT NULL,
    "editionId" TEXT NOT NULL,
    "firstSeenAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "addedVia" TEXT NOT NULL,

    CONSTRAINT "FamilyBookEdition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReadingEvent" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "workId" TEXT NOT NULL,
    "editionId" TEXT,
    "eventType" "ReadingEventType" NOT NULL,
    "occurredAt" TIMESTAMPTZ(3) NOT NULL,
    "context" TEXT,
    "stopReason" TEXT,
    "notes" TEXT,
    "clientMutationId" VARCHAR(120) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReadingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reaction" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "readingEventId" TEXT NOT NULL,
    "subjectType" "ReactionSubjectType" NOT NULL,
    "value" "ReactionValue" NOT NULL,
    "declaredAt" TIMESTAMPTZ(3) NOT NULL,
    "reporterType" "ReporterType" NOT NULL,
    "sourceType" "ReactionSourceType" NOT NULL,
    "sourceVersion" VARCHAR(80) NOT NULL,
    "clientMutationId" VARCHAR(120) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreferenceObservation" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "workId" TEXT NOT NULL,
    "kind" "PreferenceKind" NOT NULL,
    "subjectType" "ObservationSubjectType" NOT NULL,
    "reporterType" "ReporterType" NOT NULL,
    "declaredAt" TIMESTAMPTZ(3) NOT NULL,
    "sourceType" "PreferenceSourceType" NOT NULL,
    "sourceVersion" VARCHAR(80) NOT NULL,
    "clientMutationId" VARCHAR(120) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PreferenceObservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterestPhase" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "label" VARCHAR(120) NOT NULL,
    "startedAt" TIMESTAMPTZ(3) NOT NULL,
    "declaredAt" TIMESTAMPTZ(3) NOT NULL,
    "reporterType" "ReporterType" NOT NULL,
    "sourceVersion" VARCHAR(80) NOT NULL,
    "clientMutationId" VARCHAR(120) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InterestPhase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterestPhaseEnd" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "interestPhaseId" TEXT NOT NULL,
    "endedAt" TIMESTAMPTZ(3) NOT NULL,
    "declaredAt" TIMESTAMPTZ(3) NOT NULL,
    "reporterType" "ReporterType" NOT NULL,
    "sourceVersion" VARCHAR(80) NOT NULL,
    "clientMutationId" VARCHAR(120) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InterestPhaseEnd_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecommendationRequest" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "requestedAt" TIMESTAMPTZ(3) NOT NULL,
    "ageStageBasis" "AgeStageBasis" NOT NULL,
    "ageStageValue" "AgeStageValue" NOT NULL,
    "evidenceSnapshotVersion" VARCHAR(80) NOT NULL DEFAULT 'request-evidence-v1',
    "evidenceSnapshot" JSONB NOT NULL,
    "clientMutationId" VARCHAR(120) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecommendationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecommendationRequestReference" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "workId" TEXT NOT NULL,
    "purpose" "RequestReferencePurpose" NOT NULL,
    "selectedAt" TIMESTAMPTZ(3) NOT NULL,
    "sourceVersion" VARCHAR(80) NOT NULL,
    "clientMutationId" VARCHAR(120) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecommendationRequestReference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReadingEventAmendment" (
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

    CONSTRAINT "ReadingEventAmendment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReactionAmendment" (
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

    CONSTRAINT "ReactionAmendment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreferenceObservationAmendment" (
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

    CONSTRAINT "PreferenceObservationAmendment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterestPhaseAmendment" (
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

    CONSTRAINT "InterestPhaseAmendment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LibrarySystem" (
    "id" TEXT NOT NULL,
    "adapterId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "catalogBaseUrl" TEXT,
    "capabilities" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "LibrarySystem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HouseholdLibrarySetting" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "librarySystemId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "HouseholdLibrarySetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HouseholdLibraryBranch" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "settingId" TEXT NOT NULL,
    "branchCode" TEXT NOT NULL,
    "displayName" TEXT,

    CONSTRAINT "HouseholdLibraryBranch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChildProfile_householdId_idx" ON "ChildProfile"("householdId");

-- CreateIndex
CREATE UNIQUE INDEX "ChildProfile_id_householdId_key" ON "ChildProfile"("id", "householdId");

-- CreateIndex
CREATE INDEX "BookWork_title_idx" ON "BookWork"("title");

-- CreateIndex
CREATE UNIQUE INDEX "BookWork_metadataProvider_metadataRecordId_key" ON "BookWork"("metadataProvider", "metadataRecordId");

-- CreateIndex
CREATE UNIQUE INDEX "BookEdition_isbn10_key" ON "BookEdition"("isbn10");

-- CreateIndex
CREATE UNIQUE INDEX "BookEdition_isbn13_key" ON "BookEdition"("isbn13");

-- CreateIndex
CREATE INDEX "BookEdition_workId_idx" ON "BookEdition"("workId");

-- CreateIndex
CREATE UNIQUE INDEX "BookEdition_metadataProvider_metadataRecordId_key" ON "BookEdition"("metadataProvider", "metadataRecordId");

-- CreateIndex
CREATE INDEX "FamilyBook_householdId_lastSeenAt_idx" ON "FamilyBook"("householdId", "lastSeenAt");

-- CreateIndex
CREATE UNIQUE INDEX "FamilyBook_id_householdId_key" ON "FamilyBook"("id", "householdId");

-- CreateIndex
CREATE UNIQUE INDEX "FamilyBook_householdId_workId_key" ON "FamilyBook"("householdId", "workId");

-- CreateIndex
CREATE INDEX "FamilyBookEdition_householdId_familyBookId_idx" ON "FamilyBookEdition"("householdId", "familyBookId");

-- CreateIndex
CREATE INDEX "FamilyBookEdition_editionId_idx" ON "FamilyBookEdition"("editionId");

-- CreateIndex
CREATE UNIQUE INDEX "FamilyBookEdition_id_householdId_key" ON "FamilyBookEdition"("id", "householdId");

-- CreateIndex
CREATE UNIQUE INDEX "FamilyBookEdition_familyBookId_editionId_key" ON "FamilyBookEdition"("familyBookId", "editionId");

-- CreateIndex
CREATE INDEX "ReadingEvent_householdId_occurredAt_idx" ON "ReadingEvent"("householdId", "occurredAt");

-- CreateIndex
CREATE INDEX "ReadingEvent_householdId_childId_occurredAt_idx" ON "ReadingEvent"("householdId", "childId", "occurredAt");

-- CreateIndex
CREATE INDEX "ReadingEvent_workId_occurredAt_idx" ON "ReadingEvent"("workId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReadingEvent_id_householdId_key" ON "ReadingEvent"("id", "householdId");

-- CreateIndex
CREATE UNIQUE INDEX "ReadingEvent_householdId_clientMutationId_key" ON "ReadingEvent"("householdId", "clientMutationId");

-- CreateIndex
CREATE INDEX "Reaction_householdId_readingEventId_subjectType_idx" ON "Reaction"("householdId", "readingEventId", "subjectType");

-- CreateIndex
CREATE UNIQUE INDEX "Reaction_id_householdId_key" ON "Reaction"("id", "householdId");

-- CreateIndex
CREATE UNIQUE INDEX "Reaction_householdId_clientMutationId_key" ON "Reaction"("householdId", "clientMutationId");

-- CreateIndex
CREATE INDEX "PreferenceObservation_householdId_declaredAt_idx" ON "PreferenceObservation"("householdId", "declaredAt");

-- CreateIndex
CREATE INDEX "PreferenceObservation_householdId_workId_idx" ON "PreferenceObservation"("householdId", "workId");

-- CreateIndex
CREATE INDEX "PreferenceObservation_householdId_childId_declaredAt_idx" ON "PreferenceObservation"("householdId", "childId", "declaredAt");

-- CreateIndex
CREATE UNIQUE INDEX "PreferenceObservation_id_householdId_key" ON "PreferenceObservation"("id", "householdId");

-- CreateIndex
CREATE UNIQUE INDEX "PreferenceObservation_householdId_clientMutationId_key" ON "PreferenceObservation"("householdId", "clientMutationId");

-- CreateIndex
CREATE INDEX "InterestPhase_householdId_childId_startedAt_idx" ON "InterestPhase"("householdId", "childId", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "InterestPhase_id_householdId_key" ON "InterestPhase"("id", "householdId");

-- CreateIndex
CREATE UNIQUE INDEX "InterestPhase_householdId_clientMutationId_key" ON "InterestPhase"("householdId", "clientMutationId");

-- CreateIndex
CREATE UNIQUE INDEX "InterestPhaseEnd_interestPhaseId_key" ON "InterestPhaseEnd"("interestPhaseId");

-- CreateIndex
CREATE INDEX "InterestPhaseEnd_householdId_endedAt_idx" ON "InterestPhaseEnd"("householdId", "endedAt");

-- CreateIndex
CREATE UNIQUE INDEX "InterestPhaseEnd_id_householdId_key" ON "InterestPhaseEnd"("id", "householdId");

-- CreateIndex
CREATE UNIQUE INDEX "InterestPhaseEnd_interestPhaseId_householdId_key" ON "InterestPhaseEnd"("interestPhaseId", "householdId");

-- CreateIndex
CREATE UNIQUE INDEX "InterestPhaseEnd_householdId_clientMutationId_key" ON "InterestPhaseEnd"("householdId", "clientMutationId");

-- CreateIndex
CREATE INDEX "RecommendationRequest_householdId_requestedAt_idx" ON "RecommendationRequest"("householdId", "requestedAt");

-- CreateIndex
CREATE INDEX "RecommendationRequest_householdId_childId_requestedAt_idx" ON "RecommendationRequest"("householdId", "childId", "requestedAt");

-- CreateIndex
CREATE UNIQUE INDEX "RecommendationRequest_id_householdId_key" ON "RecommendationRequest"("id", "householdId");

-- CreateIndex
CREATE UNIQUE INDEX "RecommendationRequest_householdId_clientMutationId_key" ON "RecommendationRequest"("householdId", "clientMutationId");

-- CreateIndex
CREATE INDEX "RecommendationRequestReference_householdId_requestId_idx" ON "RecommendationRequestReference"("householdId", "requestId");

-- CreateIndex
CREATE INDEX "RecommendationRequestReference_workId_idx" ON "RecommendationRequestReference"("workId");

-- CreateIndex
CREATE UNIQUE INDEX "RecommendationRequestReference_id_householdId_key" ON "RecommendationRequestReference"("id", "householdId");

-- CreateIndex
CREATE UNIQUE INDEX "RecommendationRequestReference_householdId_clientMutationId_key" ON "RecommendationRequestReference"("householdId", "clientMutationId");

-- CreateIndex
CREATE UNIQUE INDEX "RecommendationRequestReference_requestId_workId_purpose_key" ON "RecommendationRequestReference"("requestId", "workId", "purpose");

-- CreateIndex
CREATE UNIQUE INDEX "ReadingEventAmendment_targetId_key" ON "ReadingEventAmendment"("targetId");

-- CreateIndex
CREATE UNIQUE INDEX "ReadingEventAmendment_replacementId_key" ON "ReadingEventAmendment"("replacementId");

-- CreateIndex
CREATE INDEX "ReadingEventAmendment_householdId_declaredAt_idx" ON "ReadingEventAmendment"("householdId", "declaredAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReadingEventAmendment_householdId_clientMutationId_key" ON "ReadingEventAmendment"("householdId", "clientMutationId");

-- CreateIndex
CREATE UNIQUE INDEX "ReadingEventAmendment_targetId_householdId_key" ON "ReadingEventAmendment"("targetId", "householdId");

-- CreateIndex
CREATE UNIQUE INDEX "ReadingEventAmendment_replacementId_householdId_key" ON "ReadingEventAmendment"("replacementId", "householdId");

-- CreateIndex
CREATE UNIQUE INDEX "ReactionAmendment_targetId_key" ON "ReactionAmendment"("targetId");

-- CreateIndex
CREATE UNIQUE INDEX "ReactionAmendment_replacementId_key" ON "ReactionAmendment"("replacementId");

-- CreateIndex
CREATE INDEX "ReactionAmendment_householdId_declaredAt_idx" ON "ReactionAmendment"("householdId", "declaredAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReactionAmendment_householdId_clientMutationId_key" ON "ReactionAmendment"("householdId", "clientMutationId");

-- CreateIndex
CREATE UNIQUE INDEX "ReactionAmendment_targetId_householdId_key" ON "ReactionAmendment"("targetId", "householdId");

-- CreateIndex
CREATE UNIQUE INDEX "ReactionAmendment_replacementId_householdId_key" ON "ReactionAmendment"("replacementId", "householdId");

-- CreateIndex
CREATE UNIQUE INDEX "PreferenceObservationAmendment_targetId_key" ON "PreferenceObservationAmendment"("targetId");

-- CreateIndex
CREATE UNIQUE INDEX "PreferenceObservationAmendment_replacementId_key" ON "PreferenceObservationAmendment"("replacementId");

-- CreateIndex
CREATE INDEX "PreferenceObservationAmendment_householdId_declaredAt_idx" ON "PreferenceObservationAmendment"("householdId", "declaredAt");

-- CreateIndex
CREATE UNIQUE INDEX "PreferenceObservationAmendment_householdId_clientMutationId_key" ON "PreferenceObservationAmendment"("householdId", "clientMutationId");

-- CreateIndex
CREATE UNIQUE INDEX "PreferenceObservationAmendment_targetId_householdId_key" ON "PreferenceObservationAmendment"("targetId", "householdId");

-- CreateIndex
CREATE UNIQUE INDEX "PreferenceObservationAmendment_replacementId_householdId_key" ON "PreferenceObservationAmendment"("replacementId", "householdId");

-- CreateIndex
CREATE UNIQUE INDEX "InterestPhaseAmendment_targetId_key" ON "InterestPhaseAmendment"("targetId");

-- CreateIndex
CREATE UNIQUE INDEX "InterestPhaseAmendment_replacementId_key" ON "InterestPhaseAmendment"("replacementId");

-- CreateIndex
CREATE INDEX "InterestPhaseAmendment_householdId_declaredAt_idx" ON "InterestPhaseAmendment"("householdId", "declaredAt");

-- CreateIndex
CREATE UNIQUE INDEX "InterestPhaseAmendment_householdId_clientMutationId_key" ON "InterestPhaseAmendment"("householdId", "clientMutationId");

-- CreateIndex
CREATE UNIQUE INDEX "InterestPhaseAmendment_targetId_householdId_key" ON "InterestPhaseAmendment"("targetId", "householdId");

-- CreateIndex
CREATE UNIQUE INDEX "InterestPhaseAmendment_replacementId_householdId_key" ON "InterestPhaseAmendment"("replacementId", "householdId");

-- CreateIndex
CREATE UNIQUE INDEX "LibrarySystem_adapterId_key" ON "LibrarySystem"("adapterId");

-- CreateIndex
CREATE UNIQUE INDEX "HouseholdLibrarySetting_householdId_key" ON "HouseholdLibrarySetting"("householdId");

-- CreateIndex
CREATE UNIQUE INDEX "HouseholdLibrarySetting_id_householdId_key" ON "HouseholdLibrarySetting"("id", "householdId");

-- CreateIndex
CREATE INDEX "HouseholdLibraryBranch_householdId_settingId_idx" ON "HouseholdLibraryBranch"("householdId", "settingId");

-- CreateIndex
CREATE UNIQUE INDEX "HouseholdLibraryBranch_settingId_branchCode_key" ON "HouseholdLibraryBranch"("settingId", "branchCode");

-- AddForeignKey
ALTER TABLE "ChildProfile" ADD CONSTRAINT "ChildProfile_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookEdition" ADD CONSTRAINT "BookEdition_workId_fkey" FOREIGN KEY ("workId") REFERENCES "BookWork"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyBook" ADD CONSTRAINT "FamilyBook_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyBook" ADD CONSTRAINT "FamilyBook_workId_fkey" FOREIGN KEY ("workId") REFERENCES "BookWork"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyBookEdition" ADD CONSTRAINT "FamilyBookEdition_familyBookId_householdId_fkey" FOREIGN KEY ("familyBookId", "householdId") REFERENCES "FamilyBook"("id", "householdId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyBookEdition" ADD CONSTRAINT "FamilyBookEdition_editionId_fkey" FOREIGN KEY ("editionId") REFERENCES "BookEdition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadingEvent" ADD CONSTRAINT "ReadingEvent_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadingEvent" ADD CONSTRAINT "ReadingEvent_childId_householdId_fkey" FOREIGN KEY ("childId", "householdId") REFERENCES "ChildProfile"("id", "householdId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadingEvent" ADD CONSTRAINT "ReadingEvent_workId_fkey" FOREIGN KEY ("workId") REFERENCES "BookWork"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadingEvent" ADD CONSTRAINT "ReadingEvent_editionId_fkey" FOREIGN KEY ("editionId") REFERENCES "BookEdition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_readingEventId_householdId_fkey" FOREIGN KEY ("readingEventId", "householdId") REFERENCES "ReadingEvent"("id", "householdId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreferenceObservation" ADD CONSTRAINT "PreferenceObservation_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreferenceObservation" ADD CONSTRAINT "PreferenceObservation_childId_householdId_fkey" FOREIGN KEY ("childId", "householdId") REFERENCES "ChildProfile"("id", "householdId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreferenceObservation" ADD CONSTRAINT "PreferenceObservation_workId_fkey" FOREIGN KEY ("workId") REFERENCES "BookWork"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterestPhase" ADD CONSTRAINT "InterestPhase_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterestPhase" ADD CONSTRAINT "InterestPhase_childId_householdId_fkey" FOREIGN KEY ("childId", "householdId") REFERENCES "ChildProfile"("id", "householdId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterestPhaseEnd" ADD CONSTRAINT "InterestPhaseEnd_interestPhaseId_householdId_fkey" FOREIGN KEY ("interestPhaseId", "householdId") REFERENCES "InterestPhase"("id", "householdId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecommendationRequest" ADD CONSTRAINT "RecommendationRequest_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecommendationRequest" ADD CONSTRAINT "RecommendationRequest_childId_householdId_fkey" FOREIGN KEY ("childId", "householdId") REFERENCES "ChildProfile"("id", "householdId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecommendationRequestReference" ADD CONSTRAINT "RecommendationRequestReference_requestId_householdId_fkey" FOREIGN KEY ("requestId", "householdId") REFERENCES "RecommendationRequest"("id", "householdId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecommendationRequestReference" ADD CONSTRAINT "RecommendationRequestReference_workId_fkey" FOREIGN KEY ("workId") REFERENCES "BookWork"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadingEventAmendment" ADD CONSTRAINT "ReadingEventAmendment_targetId_householdId_fkey" FOREIGN KEY ("targetId", "householdId") REFERENCES "ReadingEvent"("id", "householdId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadingEventAmendment" ADD CONSTRAINT "ReadingEventAmendment_replacementId_householdId_fkey" FOREIGN KEY ("replacementId", "householdId") REFERENCES "ReadingEvent"("id", "householdId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReactionAmendment" ADD CONSTRAINT "ReactionAmendment_targetId_householdId_fkey" FOREIGN KEY ("targetId", "householdId") REFERENCES "Reaction"("id", "householdId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReactionAmendment" ADD CONSTRAINT "ReactionAmendment_replacementId_householdId_fkey" FOREIGN KEY ("replacementId", "householdId") REFERENCES "Reaction"("id", "householdId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreferenceObservationAmendment" ADD CONSTRAINT "PreferenceObservationAmendment_targetId_householdId_fkey" FOREIGN KEY ("targetId", "householdId") REFERENCES "PreferenceObservation"("id", "householdId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreferenceObservationAmendment" ADD CONSTRAINT "PreferenceObservationAmendment_replacementId_householdId_fkey" FOREIGN KEY ("replacementId", "householdId") REFERENCES "PreferenceObservation"("id", "householdId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterestPhaseAmendment" ADD CONSTRAINT "InterestPhaseAmendment_targetId_householdId_fkey" FOREIGN KEY ("targetId", "householdId") REFERENCES "InterestPhase"("id", "householdId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterestPhaseAmendment" ADD CONSTRAINT "InterestPhaseAmendment_replacementId_householdId_fkey" FOREIGN KEY ("replacementId", "householdId") REFERENCES "InterestPhase"("id", "householdId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HouseholdLibrarySetting" ADD CONSTRAINT "HouseholdLibrarySetting_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HouseholdLibrarySetting" ADD CONSTRAINT "HouseholdLibrarySetting_librarySystemId_fkey" FOREIGN KEY ("librarySystemId") REFERENCES "LibrarySystem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HouseholdLibraryBranch" ADD CONSTRAINT "HouseholdLibraryBranch_settingId_householdId_fkey" FOREIGN KEY ("settingId", "householdId") REFERENCES "HouseholdLibrarySetting"("id", "householdId") ON DELETE CASCADE ON UPDATE CASCADE;

-- Approved domain integrity checks that Prisma's schema language cannot express.
ALTER TABLE "ChildProfile" ADD CONSTRAINT "ChildProfile_age_stage_pair_check" CHECK (
    ("ageStageBasis" IS NULL AND "ageStageValue" IS NULL)
    OR ("ageStageBasis" = 'age' AND "ageStageValue" IN ('2_3', '4_5', '6_8'))
    OR ("ageStageBasis" = 'reading_stage' AND "ageStageValue" IN ('pre_reader', 'emergent_reader', 'early_independent'))
);

ALTER TABLE "RecommendationRequest" ADD CONSTRAINT "RecommendationRequest_age_stage_pair_check" CHECK (
    ("ageStageBasis" = 'age' AND "ageStageValue" IN ('2_3', '4_5', '6_8'))
    OR ("ageStageBasis" = 'reading_stage' AND "ageStageValue" IN ('pre_reader', 'emergent_reader', 'early_independent'))
);

ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_subject_value_check" CHECK (
    ("subjectType" = 'child' AND "value" IN ('love', 'like', 'not_for_me'))
    OR ("subjectType" = 'caregiver' AND "value" IN ('love', 'like', 'dislike'))
);

ALTER TABLE "ReadingEvent" ADD CONSTRAINT "ReadingEvent_stop_reason_check" CHECK (
    "stopReason" IS NULL OR "eventType" IN ('stopped', 'rejected')
);

ALTER TABLE "RecommendationRequest" ADD CONSTRAINT "RecommendationRequest_evidence_snapshot_check" CHECK (
    "evidenceSnapshotVersion" = 'request-evidence-v1'
    AND jsonb_typeof("evidenceSnapshot") = 'object'
);

ALTER TABLE "ReadingEventAmendment" ADD CONSTRAINT "ReadingEventAmendment_kind_replacement_check" CHECK (
    ("kind" = 'retract' AND "replacementId" IS NULL)
    OR ("kind" = 'replace' AND "replacementId" IS NOT NULL AND "targetId" <> "replacementId")
);

ALTER TABLE "ReactionAmendment" ADD CONSTRAINT "ReactionAmendment_kind_replacement_check" CHECK (
    ("kind" = 'retract' AND "replacementId" IS NULL)
    OR ("kind" = 'replace' AND "replacementId" IS NOT NULL AND "targetId" <> "replacementId")
);

ALTER TABLE "PreferenceObservationAmendment" ADD CONSTRAINT "PreferenceObservationAmendment_kind_replacement_check" CHECK (
    ("kind" = 'retract' AND "replacementId" IS NULL)
    OR ("kind" = 'replace' AND "replacementId" IS NOT NULL AND "targetId" <> "replacementId")
);

ALTER TABLE "InterestPhaseAmendment" ADD CONSTRAINT "InterestPhaseAmendment_kind_replacement_check" CHECK (
    ("kind" = 'retract' AND "replacementId" IS NULL)
    OR ("kind" = 'replace' AND "replacementId" IS NOT NULL AND "targetId" <> "replacementId")
);
