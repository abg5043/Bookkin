export type EligibilityInput = {
  title: string;
  authors: readonly string[];
  description?: string;
  subjects: readonly string[];
};

/**
 * Every eligible candidate requires a nonempty verified title, at least one verified author,
 * and at least one verified topical field (subjects or description). Cover, ISBN, publication
 * date, page count, series, language, and direct age guidance may remain missing.
 */
export function isEligibleWork(work: EligibilityInput): boolean {
  const hasTitle = work.title.trim().length > 0;
  const hasAuthor = work.authors.length > 0;
  const hasTopicalField = (work.description !== undefined && work.description.trim().length > 0)
    || work.subjects.length > 0;
  return hasTitle && hasAuthor && hasTopicalField;
}

export type CandidatePoolState = "coverage_met" | "coverage_limited" | "coverage_insufficient" | "coverage_error";

export function classifyPoolCoverage(eligibleDistinctWorkCount: number): CandidatePoolState {
  if (eligibleDistinctWorkCount >= 20) return "coverage_met";
  if (eligibleDistinctWorkCount >= 5) return "coverage_limited";
  return "coverage_insufficient";
}
