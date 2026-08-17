import type { TopicCode } from "@/domain/interests/topic-codes";

export type DiscoveredCandidateRecord = {
  providerRecordId: string;
  position: number;
  isbn?: string;
  language?: string;
};

/**
 * Accepts only closed query codes (never a raw label, age/relationship value, household or
 * child identifier, evidence ID, reference work, reaction, note, or history) and returns
 * provider record IDs plus minimal source evidence -- never final verified metadata. Hydration
 * passes each returned providerRecordId through the existing BookMetadataProvider boundary.
 */
export interface CandidateDiscoveryProvider {
  readonly id: string;
  discover(sourceCode: TopicCode): Promise<DiscoveredCandidateRecord[]>;
}

export class CandidateDiscoveryProviderError extends Error {
  constructor(providerId: string) {
    super(`The ${providerId} candidate discovery provider could not complete the request.`);
    this.name = "CandidateDiscoveryProviderError";
  }
}
