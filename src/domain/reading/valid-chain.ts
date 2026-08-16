import { DomainInvariantError } from "@/domain/shared/errors";

export type ChainRecord = {
  id: string;
  householdId: string;
};

export type ChainAmendment = {
  id?: string;
  householdId: string;
  kind: "retract" | "replace";
  targetId: string;
  replacementId: string | null;
};

export type ValidChainResult<T extends ChainRecord> = {
  leaves: T[];
  invalidRecordIds: Set<string>;
  leafByRecordId: Map<string, T | null>;
  rootIdByRecordId: Map<string, string>;
  successorIdByRecordId: Map<string, string>;
};

type ResolverOptions<T extends ChainRecord> = {
  expectedHouseholdId: string;
  isCompatibleReplacement: (target: T, replacement: T) => boolean;
};

/**
 * Resolves immutable source/amendment graphs without guessing through damaged data.
 * Every connected chain must have exactly one valid leaf or end in an explicit retract.
 */
export function resolveValidChains<T extends ChainRecord>(
  records: readonly T[],
  amendments: readonly ChainAmendment[],
  options: ResolverOptions<T>,
): ValidChainResult<T> {
  const recordsById = new Map<string, T>();
  for (const record of records) {
    if (recordsById.has(record.id)) {
      throw new DomainInvariantError(`Duplicate chain record: ${record.id}.`);
    }
    if (record.householdId !== options.expectedHouseholdId) {
      throw new DomainInvariantError("A correction chain crosses household boundaries.");
    }
    recordsById.set(record.id, record);
  }

  const outgoing = new Map<string, ChainAmendment>();
  const incoming = new Map<string, ChainAmendment>();
  const successorIdByRecordId = new Map<string, string>();

  for (const amendment of amendments) {
    if (amendment.householdId !== options.expectedHouseholdId) {
      throw new DomainInvariantError("A correction amendment crosses household boundaries.");
    }

    const target = recordsById.get(amendment.targetId);
    if (target === undefined) {
      throw new DomainInvariantError(`Correction target is missing: ${amendment.targetId}.`);
    }
    if (outgoing.has(amendment.targetId)) {
      throw new DomainInvariantError(`A correction chain has multiple leaves from ${amendment.targetId}.`);
    }
    outgoing.set(amendment.targetId, amendment);

    if (amendment.kind === "retract") {
      if (amendment.replacementId !== null) {
        throw new DomainInvariantError("A retract amendment cannot name a replacement.");
      }
      continue;
    }

    if (amendment.replacementId === null) {
      throw new DomainInvariantError("A replace amendment requires a replacement.");
    }
    if (amendment.replacementId === amendment.targetId) {
      throw new DomainInvariantError("A record cannot replace itself.");
    }

    const replacement = recordsById.get(amendment.replacementId);
    if (replacement === undefined) {
      throw new DomainInvariantError(`Correction replacement is missing: ${amendment.replacementId}.`);
    }
    if (replacement.householdId !== amendment.householdId) {
      throw new DomainInvariantError("A correction replacement crosses household boundaries.");
    }
    if (!options.isCompatibleReplacement(target, replacement)) {
      throw new DomainInvariantError("A correction replacement is incompatible with its target.");
    }
    if (incoming.has(replacement.id)) {
      throw new DomainInvariantError(`A correction replacement has multiple sources: ${replacement.id}.`);
    }
    incoming.set(replacement.id, amendment);
    successorIdByRecordId.set(target.id, replacement.id);
  }

  const roots = records.filter((record) => !incoming.has(record.id));
  const visited = new Set<string>();
  const leaves: T[] = [];
  const invalidRecordIds = new Set<string>();
  const leafByRecordId = new Map<string, T | null>();
  const rootIdByRecordId = new Map<string, string>();

  const resolveRoot = (root: T): void => {
    const path: T[] = [];
    const pathIds = new Set<string>();
    let current = root;

    while (true) {
      if (pathIds.has(current.id)) {
        throw new DomainInvariantError(`A correction chain contains a cycle at ${current.id}.`);
      }
      pathIds.add(current.id);
      path.push(current);
      visited.add(current.id);
      rootIdByRecordId.set(current.id, root.id);

      const amendment = outgoing.get(current.id);
      if (amendment === undefined) {
        leaves.push(current);
        for (const record of path) {
          leafByRecordId.set(record.id, current);
          if (record.id !== current.id) invalidRecordIds.add(record.id);
        }
        return;
      }

      invalidRecordIds.add(current.id);
      if (amendment.kind === "retract") {
        for (const record of path) leafByRecordId.set(record.id, null);
        return;
      }

      const replacement = recordsById.get(amendment.replacementId as string);
      if (replacement === undefined) {
        throw new DomainInvariantError("A correction replacement disappeared during resolution.");
      }
      current = replacement;
    }
  };

  for (const root of roots) resolveRoot(root);

  if (visited.size !== records.length) {
    const unvisited = records.find((record) => !visited.has(record.id));
    throw new DomainInvariantError(`A correction chain contains a cycle at ${unvisited?.id ?? "an unknown record"}.`);
  }

  return { leaves, invalidRecordIds, leafByRecordId, rootIdByRecordId, successorIdByRecordId };
}
