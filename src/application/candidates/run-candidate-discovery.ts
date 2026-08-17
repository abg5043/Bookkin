import type { CandidatePoolAttempt } from "@prisma/client";
import { z } from "zod";
import type { BookMetadataProvider } from "@/application/books/book-metadata";
import { MetadataProviderError } from "@/application/books/book-metadata";
import { persistVerifiedMetadata } from "@/application/books/persist-metadata";
import {
  CandidateDiscoveryProviderError,
  type CandidateDiscoveryProvider,
} from "@/application/candidates/candidate-discovery";
import { classifyPoolCoverage, isEligibleWork } from "@/domain/candidates/eligibility";
import { isValidIsbn, normalizeIsbn } from "@/domain/books/isbn";
import { requestEvidenceV2Schema, requestEvidenceV2Version } from "@/domain/recommendations/request-evidence-v2";
import { DomainInvariantError } from "@/domain/shared/errors";
import { decodeSerialized, stringListSchema } from "@/domain/shared/serialized";
import { prisma } from "@/infrastructure/db/prisma";

export const CANDIDATE_STRATEGY_VERSION = "candidate-strategy-v1";
export const CANDIDATE_NORMALIZATION_VERSION = "candidate-normalization-v1";
export const CANDIDATE_ELIGIBILITY_VERSION = "candidate-eligibility-v1";

export type CandidateDiscoveryDependencies = {
  discoveryProvider: CandidateDiscoveryProvider;
  metadataProvider: BookMetadataProvider;
};

const runCandidateDiscoveryInputSchema = z.object({
  householdId: z.string().trim().min(1).max(120),
  childId: z.string().trim().min(1).max(120),
  requestId: z.string().trim().min(1).max(120),
}).strict();

type Disposition = "resolved" | "unverified_identity" | "source_record_unavailable" | "hydration_failed";

/**
 * Sources every entry in the request's frozen candidateSourcePlan, hydrates each discovered
 * provider record through the existing verified-metadata boundary, evaluates eligibility, and
 * writes an immutable CandidatePoolAttempt. Never creates a FamilyBook, shelf status, reading
 * event, reaction, observation, or borrowing fact. A provider failure marks the attempt Failed
 * with a sanitized failure code -- it never produces empty coverage or a future
 * no_eligible_candidates result.
 */
export async function runCandidateDiscovery(
  rawInput: unknown,
  deps: CandidateDiscoveryDependencies,
): Promise<CandidatePoolAttempt> {
  const input = runCandidateDiscoveryInputSchema.parse(rawInput);

  const request = await prisma.recommendationRequest.findUnique({
    where: { id_householdId: { id: input.requestId, householdId: input.householdId } },
    include: { references: true },
  });
  if (request === null || request.childId !== input.childId) {
    throw new DomainInvariantError("The recommendation request does not belong to this household and child.");
  }
  if (request.evidenceSnapshotVersion !== requestEvidenceV2Version) {
    throw new DomainInvariantError("Candidate discovery requires a request-evidence-v2 request.");
  }
  const snapshot = requestEvidenceV2Schema.parse(request.evidenceSnapshot);
  const referenceWorkIds = new Set(request.references.map((reference) => reference.workId));

  const previousAttempts = await prisma.candidatePoolAttempt.count({
    where: { requestId: input.requestId, householdId: input.householdId, childId: input.childId },
  });

  const attempt = await prisma.candidatePoolAttempt.create({
    data: {
      householdId: input.householdId,
      childId: input.childId,
      requestId: input.requestId,
      attemptNumber: previousAttempts + 1,
      status: "started",
      strategyVersion: CANDIDATE_STRATEGY_VERSION,
      normalizationVersion: CANDIDATE_NORMALIZATION_VERSION,
      eligibilityVersion: CANDIDATE_ELIGIBILITY_VERSION,
      startedAt: new Date(),
    },
  });

  try {
    const sourceRecordIdsByWorkId = new Map<string, string[]>();
    const sourceCodesByWorkId = new Map<string, Set<string>>();
    // Automatic identity evidence step 3: exact normalized ISBN linkage. Open Library can return
    // two different work records for the same real book; the search result's own isbn field is
    // the only ISBN signal candidate hydration has, since lookupWorkByRecordId returns
    // VerifiedBookWork (no edition/ISBN data), so dedupe is tracked here at discovery time
    // rather than by querying BookEdition rows that this path never creates.
    const isbnFirstSeenWorkId = new Map<string, string>();
    const duplicateOfWorkId = new Map<string, string>();

    for (const sourceEntry of snapshot.candidateSourcePlan) {
      const discovered = await deps.discoveryProvider.discover(sourceEntry.sourceCode);

      for (const record of discovered) {
        let disposition: Disposition = "hydration_failed";
        let resolvedWorkId: string | undefined;

        try {
          const hydrated = await deps.metadataProvider.lookupWorkByRecordId(record.providerRecordId);
          if (hydrated === null) {
            disposition = "source_record_unavailable";
          } else if (hydrated.workRecordId !== record.providerRecordId) {
            disposition = "unverified_identity";
          } else {
            const persisted = await persistVerifiedMetadata(prisma, hydrated);
            disposition = "resolved";
            resolvedWorkId = persisted.work.id;
          }
        } catch (error) {
          if (!(error instanceof MetadataProviderError)) throw error;
          disposition = "hydration_failed";
        }

        const sourceRecord = await prisma.candidateSourceRecord.create({
          data: {
            householdId: input.householdId,
            childId: input.childId,
            attemptId: attempt.id,
            provider: deps.discoveryProvider.id,
            providerRecordId: record.providerRecordId,
            sourceCode: sourceEntry.sourceCode,
            providerResultPosition: record.position,
            resolvedWorkId,
            disposition,
          },
        });

        if (resolvedWorkId !== undefined) {
          const existingSourceRecordIds = sourceRecordIdsByWorkId.get(resolvedWorkId) ?? [];
          existingSourceRecordIds.push(sourceRecord.id);
          sourceRecordIdsByWorkId.set(resolvedWorkId, existingSourceRecordIds);

          const existingSourceCodes = sourceCodesByWorkId.get(resolvedWorkId) ?? new Set<string>();
          existingSourceCodes.add(sourceEntry.sourceCode);
          sourceCodesByWorkId.set(resolvedWorkId, existingSourceCodes);

          // Normalized before comparison so "978-0-306-40615-7" and "9780306406157" are treated
          // as the same identity. Invalid ISBNs are ignored rather than used as a dedupe key.
          const normalizedIsbn = record.isbn !== undefined && isValidIsbn(record.isbn)
            ? normalizeIsbn(record.isbn)
            : undefined;
          if (normalizedIsbn !== undefined && !duplicateOfWorkId.has(resolvedWorkId)) {
            const firstWorkId = isbnFirstSeenWorkId.get(normalizedIsbn);
            if (firstWorkId === undefined) {
              isbnFirstSeenWorkId.set(normalizedIsbn, resolvedWorkId);
            } else if (firstWorkId !== resolvedWorkId) {
              duplicateOfWorkId.set(resolvedWorkId, firstWorkId);
            }
          }
        }
      }
    }

    const eligibleWorkIdsBySourceCode = new Map<string, Set<string>>();
    let eligibleDistinctWorkCount = 0;

    for (const [workId, sourceRecordIds] of sourceRecordIdsByWorkId) {
      const work = await prisma.bookWork.findUniqueOrThrow({ where: { id: workId } });
      const authors = decodeSerialized(stringListSchema, work.authors);
      const subjects = work.subjects === null ? [] : decodeSerialized(stringListSchema, work.subjects);
      const isReference = referenceWorkIds.has(workId);
      const eligibleByFields = isEligibleWork({
        title: work.title,
        authors,
        description: work.description ?? undefined,
        subjects,
      });
      const duplicateOf = duplicateOfWorkId.get(workId);

      let state: "eligible" | "excluded" = "eligible";
      let exclusionReason: "missing_required_metadata" | "duplicate_canonical_work" | "request_reference_work" | undefined;
      if (duplicateOf !== undefined) {
        state = "excluded";
        exclusionReason = "duplicate_canonical_work";
      } else if (isReference) {
        state = "excluded";
        exclusionReason = "request_reference_work";
      } else if (!eligibleByFields) {
        state = "excluded";
        exclusionReason = "missing_required_metadata";
      }

      const evaluation = await prisma.candidateEvaluation.create({
        data: {
          householdId: input.householdId,
          childId: input.childId,
          attemptId: attempt.id,
          workId,
          state,
          exclusionReason,
          fieldCoverage: {
            title: work.title.trim().length > 0,
            authors: authors.length > 0,
            description: work.description !== null,
            subjects: subjects.length > 0,
          },
          dedupeEvidence: duplicateOf === undefined ? undefined : { duplicateOfWorkId: duplicateOf },
        },
      });

      for (const sourceRecordId of sourceRecordIds) {
        await prisma.candidateEvaluationSource.create({
          data: {
            householdId: input.householdId,
            childId: input.childId,
            attemptId: attempt.id,
            evaluationId: evaluation.id,
            sourceRecordId,
          },
        });
      }

      if (state === "eligible") {
        eligibleDistinctWorkCount += 1;
        for (const sourceCode of sourceCodesByWorkId.get(workId) ?? []) {
          const set = eligibleWorkIdsBySourceCode.get(sourceCode) ?? new Set<string>();
          set.add(workId);
          eligibleWorkIdsBySourceCode.set(sourceCode, set);
        }
      }
    }

    const coverageSummary = {
      poolState: classifyPoolCoverage(eligibleDistinctWorkCount),
      eligibleDistinctWorkCount,
      eligibleDistinctWorkCountBySource: Object.fromEntries(
        [...eligibleWorkIdsBySourceCode.entries()].map(([sourceCode, works]) => [sourceCode, works.size]),
      ),
    };

    return await prisma.candidatePoolAttempt.update({
      where: { id_householdId: { id: attempt.id, householdId: input.householdId } },
      data: { status: "completed", completedAt: new Date(), coverageSummary },
    });
  } catch (error) {
    const failureCode = error instanceof CandidateDiscoveryProviderError || error instanceof MetadataProviderError
      ? "provider_unavailable"
      : "unexpected_error";
    await prisma.candidatePoolAttempt.update({
      where: { id_householdId: { id: attempt.id, householdId: input.householdId } },
      data: {
        status: "failed",
        completedAt: new Date(),
        failureCode,
        // The spec requires a failed run to read as coverage_error, never as an empty or
        // low-coverage pool; otherwise a provider outage could silently pass the coverage matrix.
        coverageSummary: {
          poolState: "coverage_error",
          eligibleDistinctWorkCount: null,
          eligibleDistinctWorkCountBySource: {},
        },
      },
    });
    throw error;
  }
}
