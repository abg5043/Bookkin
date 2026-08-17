import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { BookMetadataProvider, VerifiedBookWork } from "@/application/books/book-metadata";
import { MetadataProviderError } from "@/application/books/book-metadata";
import type { CandidateDiscoveryProvider, DiscoveredCandidateRecord } from "@/application/candidates/candidate-discovery";
import { CandidateDiscoveryProviderError } from "@/application/candidates/candidate-discovery";
import { getDevCoveragePreview } from "@/application/candidates/dev-coverage-preview";
import { runCandidateDiscovery } from "@/application/candidates/run-candidate-discovery";
import { classifyPoolCoverage } from "@/domain/candidates/eligibility";
import { createReadingRelationshipPhase } from "@/application/reading-relationships/reading-relationship-phases";
import { createBookKindPhase } from "@/application/book-kinds/book-kind-phases";
import { createChildProfile, setChildAgeRange } from "@/application/households/child-profiles";
import { createRecommendationRequestV2 } from "@/application/recommendations/recommendation-requests-v2";
import { prisma } from "@/infrastructure/db/prisma";

function isDisposablePostgresUrl(rawUrl: string | undefined): boolean {
  if (rawUrl === undefined) return false;
  try {
    const url = new URL(rawUrl);
    const databaseName = url.pathname.slice(1);
    return ["postgres:", "postgresql:"].includes(url.protocol) && /(?:_test|_ci)$/.test(databaseName);
  } catch {
    return false;
  }
}

const databaseTestsRequired = process.env.BOOKKIN_REQUIRE_DB_TESTS === "true";
if (databaseTestsRequired && !isDisposablePostgresUrl(process.env.DATABASE_URL)) {
  throw new Error("BOOKKIN_REQUIRE_DB_TESTS requires an explicit PostgreSQL database ending in _test or _ci.");
}

const databaseDescribe = databaseTestsRequired ? describe.sequential : describe.skip;

const householdIds: string[] = [];

async function requestFixture() {
  const suffix = randomUUID();
  const household = await prisma.household.create({ data: {} });
  householdIds.push(household.id);
  const child = await createChildProfile({ householdId: household.id, nickname: "Test reader" });
  await setChildAgeRange({ householdId: household.id, childId: child.id, ageRange: "4_5" });
  await createReadingRelationshipPhase({
    householdId: household.id,
    childId: child.id,
    code: "read_aloud",
    startedAt: "2026-08-16T12:00:00.000Z",
    declaredAt: "2026-08-16T12:00:00.000Z",
    reporterType: "caregiver",
    sourceVersion: "relationship-v1",
    clientMutationId: `relationship-${suffix}`,
  });
  // Cold-start also requires a useful signal beyond age/relationship; a book-kind preference
  // is the simplest one for tests that are exercising candidate discovery, not cold-start.
  await createBookKindPhase({
    householdId: household.id,
    childId: child.id,
    code: "funny",
    startedAt: "2026-08-16T12:00:00.000Z",
    declaredAt: "2026-08-16T12:00:00.000Z",
    reporterType: "caregiver",
    sourceVersion: "book-kind-v1",
    clientMutationId: `book-kind-${suffix}`,
  });
  return { suffix, household, child };
}

function work(overrides: Partial<VerifiedBookWork> & { workRecordId: string }): VerifiedBookWork {
  return {
    title: "Untitled",
    authors: ["An Author"],
    subjects: ["animals"],
    fieldCoverage: { title: "test", authors: "test", subjects: "test" },
    ...overrides,
  };
}

function fakeDiscovery(recordsBySourceCode: Record<string, DiscoveredCandidateRecord[]>): CandidateDiscoveryProvider {
  return {
    id: "fake-discovery",
    async discover(sourceCode) {
      return recordsBySourceCode[sourceCode] ?? [];
    },
  };
}

function fakeMetadata(worksByRecordId: Record<string, VerifiedBookWork | null | "unverified" | "error">): BookMetadataProvider {
  return {
    id: "fake-metadata",
    async lookupByIsbn() {
      return null;
    },
    async lookupEditionByRecordId() {
      return null;
    },
    async search() {
      return [];
    },
    async lookupWorkByRecordId(workRecordId: string) {
      const entry = worksByRecordId[workRecordId];
      if (entry === "error") throw new MetadataProviderError("fake-metadata");
      if (entry === "unverified") return work({ workRecordId: `${workRecordId}-mismatched` });
      return entry ?? null;
    },
  };
}

afterEach(async () => {
  if (householdIds.length > 0) {
    await prisma.household.deleteMany({ where: { id: { in: householdIds.splice(0) } } });
  }
});

describe("candidate pool coverage classification", () => {
  it("classifies pool states at the frozen thresholds", () => {
    expect(classifyPoolCoverage(0)).toBe("coverage_insufficient");
    expect(classifyPoolCoverage(4)).toBe("coverage_insufficient");
    expect(classifyPoolCoverage(5)).toBe("coverage_limited");
    expect(classifyPoolCoverage(19)).toBe("coverage_limited");
    expect(classifyPoolCoverage(20)).toBe("coverage_met");
    expect(classifyPoolCoverage(100)).toBe("coverage_met");
  });
});

databaseDescribe("Checkpoint 7A candidate pool", () => {
  it("resolves eligible works, records per-source coverage, and rejects a non-V2 request", async () => {
    const { household, child } = await requestFixture();
    const request = await createRecommendationRequestV2({
      householdId: household.id,
      childId: child.id,
      requestedAt: "2026-08-16T12:05:00.000Z",
      clientMutationId: `request-${household.id}`,
    });

    const discovery = fakeDiscovery({
      children_general: [{ providerRecordId: "OL-GEN-1", position: 0 }],
    });
    const metadata = fakeMetadata({
      "OL-GEN-1": work({ workRecordId: "OL-GEN-1", title: "A Broad Pick" }),
    });

    const attempt = await runCandidateDiscovery(
      { householdId: household.id, childId: child.id, requestId: request.id },
      { discoveryProvider: discovery, metadataProvider: metadata },
    );

    expect(attempt.status).toBe("completed");
    expect(attempt.attemptNumber).toBe(1);
    const summary = attempt.coverageSummary as { poolState: string; eligibleDistinctWorkCount: number };
    expect(summary.poolState).toBe("coverage_insufficient");
    expect(summary.eligibleDistinctWorkCount).toBe(1);

    const evaluations = await prisma.candidateEvaluation.findMany({ where: { attemptId: attempt.id } });
    expect(evaluations).toHaveLength(1);
    expect(evaluations[0].state).toBe("eligible");

    const preview = await getDevCoveragePreview({
      householdId: household.id,
      childId: child.id,
      requestId: request.id,
    });
    expect(preview.eligibleWorks).toEqual([{ workId: evaluations[0].workId, title: "A Broad Pick" }]);
  });

  it("excludes a resolved work missing a required field", async () => {
    const { household, child } = await requestFixture();
    const request = await createRecommendationRequestV2({
      householdId: household.id,
      childId: child.id,
      requestedAt: "2026-08-16T12:05:00.000Z",
      clientMutationId: `request-${household.id}`,
    });

    const attempt = await runCandidateDiscovery(
      { householdId: household.id, childId: child.id, requestId: request.id },
      {
        discoveryProvider: fakeDiscovery({ children_general: [{ providerRecordId: "OL-NOAUTHOR", position: 0 }] }),
        metadataProvider: fakeMetadata({
          "OL-NOAUTHOR": work({ workRecordId: "OL-NOAUTHOR", title: "No Author Here", authors: [] }),
        }),
      },
    );

    const evaluations = await prisma.candidateEvaluation.findMany({ where: { attemptId: attempt.id } });
    expect(evaluations).toHaveLength(1);
    expect(evaluations[0].state).toBe("excluded");
    expect(evaluations[0].exclusionReason).toBe("missing_required_metadata");
  });

  it("excludes a work already used as this request's verified reference", async () => {
    const { suffix, household, child } = await requestFixture();
    const referenceWork = await prisma.bookWork.create({
      data: {
        title: "Reference Work",
        authors: JSON.stringify(["Ref Author"]),
        metadataProvider: "open-library",
        metadataRecordId: `OL-REF-${suffix}`,
        metadataProvenance: JSON.stringify({ provider: "open-library", recordId: `OL-REF-${suffix}`, fields: {} }),
      },
    });
    const request = await createRecommendationRequestV2({
      householdId: household.id,
      childId: child.id,
      requestedAt: "2026-08-16T12:05:00.000Z",
      clientMutationId: `request-${suffix}`,
      references: [{
        workId: referenceWork.id,
        purpose: "more_like_this",
        selectedAt: "2026-08-16T12:04:00.000Z",
        sourceVersion: "request-reference-v1",
        clientMutationId: `reference-${suffix}`,
      }],
    });

    const attempt = await runCandidateDiscovery(
      { householdId: household.id, childId: child.id, requestId: request.id },
      {
        discoveryProvider: fakeDiscovery({
          children_general: [{ providerRecordId: `OL-REF-${suffix}`, position: 0 }],
        }),
        metadataProvider: fakeMetadata({
          [`OL-REF-${suffix}`]: work({ workRecordId: `OL-REF-${suffix}`, title: "Reference Work" }),
        }),
      },
    );

    const evaluations = await prisma.candidateEvaluation.findMany({ where: { attemptId: attempt.id } });
    expect(evaluations).toHaveLength(1);
    expect(evaluations[0].workId).toBe(referenceWork.id);
    expect(evaluations[0].state).toBe("excluded");
    expect(evaluations[0].exclusionReason).toBe("request_reference_work");
  });

  it("excludes a second provider record that resolves to a canonical duplicate via shared ISBN", async () => {
    const { household, child } = await requestFixture();
    const request = await createRecommendationRequestV2({
      householdId: household.id,
      childId: child.id,
      requestedAt: "2026-08-16T12:05:00.000Z",
      clientMutationId: `request-${household.id}`,
    });

    // Open Library can return two different work records for the same real book. Both search
    // hits carry the same ISBN, which is the only ISBN signal available at candidate-discovery
    // time (lookupWorkByRecordId returns VerifiedBookWork, with no edition/ISBN data at all).
    // Same real ISBN-13, one hyphenated and one not: dedupe must normalize before comparing.
    // An invalid ISBN is deliberately NOT usable as a dedupe key, so this uses a real checksum.
    const discovery = fakeDiscovery({
      children_general: [
        { providerRecordId: "OL-EDITION-A", position: 0, isbn: "978-0-306-40615-7" },
        { providerRecordId: "OL-EDITION-B", position: 1, isbn: "9780306406157" },
      ],
    });
    const metadata: BookMetadataProvider = {
      id: "fake-metadata",
      async lookupByIsbn() { return null; },
      async lookupEditionByRecordId() { return null; },
      async search() { return []; },
      async lookupWorkByRecordId(workRecordId: string) {
        if (workRecordId === "OL-EDITION-A") return work({ workRecordId: "OL-EDITION-A", title: "Same Book, Edition A" });
        if (workRecordId === "OL-EDITION-B") return work({ workRecordId: "OL-EDITION-B", title: "Same Book, Edition B" });
        return null;
      },
    };

    const attempt = await runCandidateDiscovery(
      { householdId: household.id, childId: child.id, requestId: request.id },
      { discoveryProvider: discovery, metadataProvider: metadata },
    );

    const evaluations = await prisma.candidateEvaluation.findMany({
      where: { attemptId: attempt.id },
      orderBy: { createdAt: "asc" },
    });
    expect(evaluations).toHaveLength(2);
    expect(evaluations[0].state).toBe("eligible");
    expect(evaluations[1].state).toBe("excluded");
    expect(evaluations[1].exclusionReason).toBe("duplicate_canonical_work");
    expect(evaluations[1].dedupeEvidence).toEqual({ duplicateOfWorkId: evaluations[0].workId });
  });

  it("records source_record_unavailable, hydration_failed, and unverified_identity dispositions", async () => {
    const { household, child } = await requestFixture();
    const request = await createRecommendationRequestV2({
      householdId: household.id,
      childId: child.id,
      requestedAt: "2026-08-16T12:05:00.000Z",
      clientMutationId: `request-${household.id}`,
    });

    const attempt = await runCandidateDiscovery(
      { householdId: household.id, childId: child.id, requestId: request.id },
      {
        discoveryProvider: fakeDiscovery({
          children_general: [
            { providerRecordId: "OL-MISSING", position: 0 },
            { providerRecordId: "OL-ERROR", position: 1 },
            { providerRecordId: "OL-MISMATCH", position: 2 },
          ],
        }),
        metadataProvider: fakeMetadata({
          "OL-MISSING": null,
          "OL-ERROR": "error",
          "OL-MISMATCH": "unverified",
        }),
      },
    );

    const sourceRecords = await prisma.candidateSourceRecord.findMany({
      where: { attemptId: attempt.id },
      orderBy: { providerResultPosition: "asc" },
    });
    expect(sourceRecords.map((record) => record.disposition)).toEqual([
      "source_record_unavailable",
      "hydration_failed",
      "unverified_identity",
    ]);
    expect(sourceRecords.every((record) => record.resolvedWorkId === null)).toBe(true);
    expect(await prisma.candidateEvaluation.count({ where: { attemptId: attempt.id } })).toBe(0);
  });

  it("marks the attempt Failed with a sanitized code on a discovery provider outage, never empty coverage", async () => {
    const { household, child } = await requestFixture();
    const request = await createRecommendationRequestV2({
      householdId: household.id,
      childId: child.id,
      requestedAt: "2026-08-16T12:05:00.000Z",
      clientMutationId: `request-${household.id}`,
    });

    const failingDiscovery: CandidateDiscoveryProvider = {
      id: "fake-discovery",
      async discover() {
        throw new CandidateDiscoveryProviderError("fake-discovery");
      },
    };

    await expect(runCandidateDiscovery(
      { householdId: household.id, childId: child.id, requestId: request.id },
      { discoveryProvider: failingDiscovery, metadataProvider: fakeMetadata({}) },
    )).rejects.toThrow(/could not complete the request/);

    const attempt = await prisma.candidatePoolAttempt.findFirstOrThrow({ where: { requestId: request.id } });
    expect(attempt.status).toBe("failed");
    expect(attempt.failureCode).toBe("provider_unavailable");
    // A provider outage must read as coverage_error, never as an empty or low-coverage pool,
    // so an outage can never be miscounted as a genuine coverage result.
    expect(attempt.coverageSummary).toMatchObject({
      poolState: "coverage_error",
      eligibleDistinctWorkCount: null,
    });

    const preview = await getDevCoveragePreview({
      householdId: household.id,
      childId: child.id,
      requestId: request.id,
    });
    expect(preview.poolState).toBe("coverage_error");
    expect(preview.eligibleWorks).toEqual([]);
    expect(preview.eligibleDistinctWorkCount).toBeUndefined();
  });

  it("increments attemptNumber on retry and never mutates a completed attempt", async () => {
    const { household, child } = await requestFixture();
    const request = await createRecommendationRequestV2({
      householdId: household.id,
      childId: child.id,
      requestedAt: "2026-08-16T12:05:00.000Z",
      clientMutationId: `request-${household.id}`,
    });
    const deps = {
      discoveryProvider: fakeDiscovery({ children_general: [{ providerRecordId: "OL-RETRY", position: 0 }] }),
      metadataProvider: fakeMetadata({ "OL-RETRY": work({ workRecordId: "OL-RETRY", title: "Retry Pick" }) }),
    };

    const first = await runCandidateDiscovery(
      { householdId: household.id, childId: child.id, requestId: request.id },
      deps,
    );
    const second = await runCandidateDiscovery(
      { householdId: household.id, childId: child.id, requestId: request.id },
      deps,
    );

    expect(first.attemptNumber).toBe(1);
    expect(second.attemptNumber).toBe(2);
    expect(first.id).not.toBe(second.id);
    const stillFirst = await prisma.candidatePoolAttempt.findUniqueOrThrow({ where: { id: first.id } });
    expect(stillFirst.status).toBe("completed");
  });

  it("rejects a coverage-preview lookup when NODE_ENV is production", async () => {
    const { household, child } = await requestFixture();
    const request = await createRecommendationRequestV2({
      householdId: household.id,
      childId: child.id,
      requestedAt: "2026-08-16T12:05:00.000Z",
      clientMutationId: `request-${household.id}`,
    });
    await runCandidateDiscovery(
      { householdId: household.id, childId: child.id, requestId: request.id },
      {
        discoveryProvider: fakeDiscovery({ children_general: [{ providerRecordId: "OL-X", position: 0 }] }),
        metadataProvider: fakeMetadata({ "OL-X": work({ workRecordId: "OL-X", title: "X" }) }),
      },
    );

    vi.stubEnv("NODE_ENV", "production");
    try {
      await expect(getDevCoveragePreview({
        householdId: household.id,
        childId: child.id,
        requestId: request.id,
      })).rejects.toThrow(/development-only/);
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
