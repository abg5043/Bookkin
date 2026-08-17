import {
  CandidateDiscoveryProviderError,
  type CandidateDiscoveryProvider,
  type DiscoveredCandidateRecord,
} from "@/application/candidates/candidate-discovery";
import { outboundQueryForTopicCode, type TopicCode } from "@/domain/interests/topic-codes";

type Fetcher = typeof fetch;

type OpenLibrarySearchDoc = {
  key?: string;
  isbn?: string[];
  language?: string[];
};

function asObject(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

function asRecord<T>(value: unknown): T | null {
  return asObject(value) === null ? null : value as T;
}

function recordId(key: string | undefined): string | undefined {
  return key?.split("/").filter(Boolean).at(-1);
}

/**
 * Every request is an HTTPS GET /search.json with exactly the four fixed parameters frozen by
 * the approved Checkpoint 7A phase-one proposal: q, fields, limit, page. No sort, user
 * identifier, request ID, referrer data, custom header, age/relationship value, or raw
 * household evidence is ever added. `outboundQueryForTopicCode` rejects any code not present in
 * the frozen dictionary, so an unknown source code cannot reach this adapter at all.
 */
export class OpenLibraryCandidateDiscoveryProvider implements CandidateDiscoveryProvider {
  readonly id = "open-library";

  constructor(private readonly fetcher: Fetcher = fetch) {}

  async discover(sourceCode: TopicCode): Promise<DiscoveredCandidateRecord[]> {
    const parameters = new URLSearchParams({
      q: outboundQueryForTopicCode(sourceCode),
      fields: "key,title,author_name,edition_key,isbn,language,subject",
      limit: "100",
      page: "1",
    });

    const response = await this.fetcher(`https://openlibrary.org/search.json?${parameters.toString()}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    }).catch(() => {
      throw new CandidateDiscoveryProviderError(this.id);
    });
    if (!response.ok) {
      throw new CandidateDiscoveryProviderError(this.id);
    }

    const payload = asRecord<{ docs?: OpenLibrarySearchDoc[] }>(await response.json());
    if (payload === null) {
      throw new CandidateDiscoveryProviderError(this.id);
    }

    return (payload.docs ?? []).flatMap((doc, index) => {
      const providerRecordId = recordId(doc.key);
      if (providerRecordId === undefined) return [];
      return [{
        providerRecordId,
        position: index,
        isbn: doc.isbn?.[0],
        language: doc.language?.[0],
      }];
    });
  }
}
