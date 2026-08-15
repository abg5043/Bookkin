-- CreateTable
CREATE TABLE "Household" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ChildProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "householdId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "ageBand" TEXT,
    "birthMonthYear" TEXT,
    "currentInterests" TEXT,
    "contentPreferences" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ChildProfile_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BookWork" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "BookEdition" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BookEdition_workId_fkey" FOREIGN KEY ("workId") REFERENCES "BookWork" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FamilyBook" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "householdId" TEXT NOT NULL,
    "workId" TEXT NOT NULL,
    "firstSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "addedVia" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FamilyBook_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FamilyBook_workId_fkey" FOREIGN KEY ("workId") REFERENCES "BookWork" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FamilyBookClassification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "familyBookId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FamilyBookClassification_familyBookId_fkey" FOREIGN KEY ("familyBookId") REFERENCES "FamilyBook" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FamilyBookEdition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "familyBookId" TEXT NOT NULL,
    "editionId" TEXT NOT NULL,
    "firstSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "addedVia" TEXT NOT NULL,
    CONSTRAINT "FamilyBookEdition_familyBookId_fkey" FOREIGN KEY ("familyBookId") REFERENCES "FamilyBook" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FamilyBookEdition_editionId_fkey" FOREIGN KEY ("editionId") REFERENCES "BookEdition" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReadingEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "householdId" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "workId" TEXT NOT NULL,
    "editionId" TEXT,
    "eventType" TEXT NOT NULL,
    "occurredAt" DATETIME NOT NULL,
    "context" TEXT,
    "stopReason" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReadingEvent_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReadingEvent_childId_fkey" FOREIGN KEY ("childId") REFERENCES "ChildProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReadingEvent_workId_fkey" FOREIGN KEY ("workId") REFERENCES "BookWork" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ReadingEvent_editionId_fkey" FOREIGN KEY ("editionId") REFERENCES "BookEdition" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Reaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "readingEventId" TEXT NOT NULL,
    "subjectType" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "tags" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Reaction_readingEventId_fkey" FOREIGN KEY ("readingEventId") REFERENCES "ReadingEvent" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RecommendationBatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "householdId" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "requestedContext" TEXT,
    "filters" TEXT,
    "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scoringVersion" TEXT NOT NULL,
    "explanationProvider" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RecommendationBatch_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RecommendationBatch_childId_fkey" FOREIGN KEY ("childId") REFERENCES "ChildProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Recommendation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "batchId" TEXT NOT NULL,
    "workId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "sourceSignals" TEXT NOT NULL,
    "explanation" TEXT,
    "rank" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Recommendation_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "RecommendationBatch" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Recommendation_workId_fkey" FOREIGN KEY ("workId") REFERENCES "BookWork" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RecommendationAction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recommendationId" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "occurredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readingEventId" TEXT,
    "familyBookEditionId" TEXT,
    CONSTRAINT "RecommendationAction_recommendationId_fkey" FOREIGN KEY ("recommendationId") REFERENCES "Recommendation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RecommendationAction_readingEventId_fkey" FOREIGN KEY ("readingEventId") REFERENCES "ReadingEvent" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "RecommendationAction_familyBookEditionId_fkey" FOREIGN KEY ("familyBookEditionId") REFERENCES "FamilyBookEdition" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LibrarySystem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "adapterId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "catalogBaseUrl" TEXT,
    "capabilities" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "HouseholdLibrarySetting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "householdId" TEXT NOT NULL,
    "librarySystemId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "HouseholdLibrarySetting_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "HouseholdLibrarySetting_librarySystemId_fkey" FOREIGN KEY ("librarySystemId") REFERENCES "LibrarySystem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HouseholdLibraryBranch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "settingId" TEXT NOT NULL,
    "branchCode" TEXT NOT NULL,
    "displayName" TEXT,
    CONSTRAINT "HouseholdLibraryBranch_settingId_fkey" FOREIGN KEY ("settingId") REFERENCES "HouseholdLibrarySetting" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ChildProfile_householdId_idx" ON "ChildProfile"("householdId");

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
CREATE UNIQUE INDEX "FamilyBook_householdId_workId_key" ON "FamilyBook"("householdId", "workId");

-- CreateIndex
CREATE INDEX "FamilyBookClassification_value_idx" ON "FamilyBookClassification"("value");

-- CreateIndex
CREATE UNIQUE INDEX "FamilyBookClassification_familyBookId_value_key" ON "FamilyBookClassification"("familyBookId", "value");

-- CreateIndex
CREATE INDEX "FamilyBookEdition_editionId_idx" ON "FamilyBookEdition"("editionId");

-- CreateIndex
CREATE UNIQUE INDEX "FamilyBookEdition_familyBookId_editionId_key" ON "FamilyBookEdition"("familyBookId", "editionId");

-- CreateIndex
CREATE INDEX "ReadingEvent_householdId_occurredAt_idx" ON "ReadingEvent"("householdId", "occurredAt");

-- CreateIndex
CREATE INDEX "ReadingEvent_childId_occurredAt_idx" ON "ReadingEvent"("childId", "occurredAt");

-- CreateIndex
CREATE INDEX "ReadingEvent_workId_occurredAt_idx" ON "ReadingEvent"("workId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "Reaction_readingEventId_subjectType_key" ON "Reaction"("readingEventId", "subjectType");

-- CreateIndex
CREATE INDEX "RecommendationBatch_householdId_generatedAt_idx" ON "RecommendationBatch"("householdId", "generatedAt");

-- CreateIndex
CREATE INDEX "Recommendation_workId_idx" ON "Recommendation"("workId");

-- CreateIndex
CREATE UNIQUE INDEX "Recommendation_batchId_workId_key" ON "Recommendation"("batchId", "workId");

-- CreateIndex
CREATE UNIQUE INDEX "Recommendation_batchId_rank_key" ON "Recommendation"("batchId", "rank");

-- CreateIndex
CREATE INDEX "RecommendationAction_recommendationId_occurredAt_idx" ON "RecommendationAction"("recommendationId", "occurredAt");

-- CreateIndex
CREATE INDEX "RecommendationAction_readingEventId_idx" ON "RecommendationAction"("readingEventId");

-- CreateIndex
CREATE INDEX "RecommendationAction_familyBookEditionId_idx" ON "RecommendationAction"("familyBookEditionId");

-- CreateIndex
CREATE UNIQUE INDEX "LibrarySystem_adapterId_key" ON "LibrarySystem"("adapterId");

-- CreateIndex
CREATE UNIQUE INDEX "HouseholdLibrarySetting_householdId_key" ON "HouseholdLibrarySetting"("householdId");

-- CreateIndex
CREATE UNIQUE INDEX "HouseholdLibraryBranch_settingId_branchCode_key" ON "HouseholdLibraryBranch"("settingId", "branchCode");
