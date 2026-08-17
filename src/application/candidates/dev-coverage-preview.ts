import { z } from "zod";
import { DomainInvariantError } from "@/domain/shared/errors";
import { prisma } from "@/infrastructure/db/prisma";

export type DevCoveragePreview = {
  attemptId: string;
  attemptNumber: number;
  status: string;
  poolState?: string;
  eligibleDistinctWorkCount?: number;
  eligibleDistinctWorkCountBySource?: Record<string, number>;
  eligibleWorks: Array<{ workId: string; title: string }>;
};

const inputSchema = z.object({
  householdId: z.string().trim().min(1).max(120),
  childId: z.string().trim().min(1).max(120),
  requestId: z.string().trim().min(1).max(120),
}).strict();

type CoverageSummaryShape = {
  poolState?: string;
  eligibleDistinctWorkCount?: number;
  eligibleDistinctWorkCountBySource?: Record<string, number>;
};

/**
 * Development-only, inaccessible in production, aggregate/count oriented, neutrally ordered by
 * title. Shows no covers, top picks, five-item layout, scores, ranks, roles, explanations, or
 * bag language -- this is a coverage instrument, not a preview of a recommendation result.
 */
export async function getDevCoveragePreview(rawInput: unknown): Promise<DevCoveragePreview> {
  if (process.env.NODE_ENV === "production") {
    throw new DomainInvariantError("The candidate coverage preview is development-only.");
  }
  const input = inputSchema.parse(rawInput);

  const attempt = await prisma.candidatePoolAttempt.findFirst({
    where: { householdId: input.householdId, childId: input.childId, requestId: input.requestId },
    orderBy: { attemptNumber: "desc" },
    include: {
      evaluations: {
        where: { state: "eligible" },
        include: { work: { select: { id: true, title: true } } },
      },
    },
  });
  if (attempt === null) {
    throw new DomainInvariantError("No candidate pool attempt exists for this request.");
  }

  const coverageSummary = attempt.coverageSummary as CoverageSummaryShape | null;
  // Only a completed attempt has trustworthy coverage. A failed or still-running attempt is
  // reported as coverage_error with no work list, so a partially-written run can never be read
  // as genuine low coverage when judging the coverage matrix.
  const isTrustworthy = attempt.status === "completed";

  return {
    attemptId: attempt.id,
    attemptNumber: attempt.attemptNumber,
    status: attempt.status,
    poolState: isTrustworthy ? coverageSummary?.poolState : "coverage_error",
    eligibleDistinctWorkCount: isTrustworthy ? coverageSummary?.eligibleDistinctWorkCount : undefined,
    eligibleDistinctWorkCountBySource: isTrustworthy
      ? coverageSummary?.eligibleDistinctWorkCountBySource
      : undefined,
    eligibleWorks: isTrustworthy
      ? attempt.evaluations
        .map((evaluation) => ({ workId: evaluation.work.id, title: evaluation.work.title }))
        .sort((left, right) => left.title.localeCompare(right.title))
      : [],
  };
}
