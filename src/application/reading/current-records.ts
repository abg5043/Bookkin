import { resolveValidChains, type ChainAmendment } from "@/domain/reading/valid-chain";
import { caregiverReactionValueSchema, childReactionValueSchema } from "@/domain/reading/validation";
import { DomainInvariantError } from "@/domain/shared/errors";

export type ReadingChainRecord = {
  id: string;
  householdId: string;
  childId: string;
  workId: string;
  editionId: string | null;
  eventType: "finished" | "reread" | "stopped" | "rejected";
  occurredAt: Date;
  context: string | null;
  stopReason: string | null;
  notes: string | null;
  clientMutationId: string;
  createdAt: Date;
};

export type ReactionChainRecord = {
  id: string;
  householdId: string;
  readingEventId: string;
  subjectType: "child" | "caregiver";
  value: "love" | "like" | "not_for_me" | "dislike";
  declaredAt: Date;
  reporterType: "caregiver" | "child_direct" | "unknown_legacy";
  sourceType: "quick_log" | "reaction_correction" | "correction_carry_forward";
  sourceVersion: string;
  clientMutationId: string;
  createdAt: Date;
};

export type CurrentReadingRecord = ReadingChainRecord & {
  reactions: ReactionChainRecord[];
};

export function resolveCurrentReadingRecords(
  householdId: string,
  events: readonly ReadingChainRecord[],
  eventAmendments: readonly ChainAmendment[],
  reactions: readonly ReactionChainRecord[],
  reactionAmendments: readonly ChainAmendment[],
): CurrentReadingRecord[] {
  const eventResolution = resolveValidChains(events, eventAmendments, {
    expectedHouseholdId: householdId,
    isCompatibleReplacement: (target, replacement) => (
      target.childId === replacement.childId && target.workId === replacement.workId
    ),
  });

  const reactionResolution = resolveValidChains(reactions, reactionAmendments, {
    expectedHouseholdId: householdId,
    isCompatibleReplacement: (target, replacement) => {
      if (target.subjectType !== replacement.subjectType) return false;
      return replacement.readingEventId === target.readingEventId
        || eventResolution.successorIdByRecordId.get(target.readingEventId) === replacement.readingEventId;
    },
  });

  const validEventIds = new Set(eventResolution.leaves.map((event) => event.id));
  const reactionsByEvent = new Map<string, ReactionChainRecord[]>();
  for (const reaction of reactionResolution.leaves) {
    if (!validEventIds.has(reaction.readingEventId)) continue;
    const valueSchema = reaction.subjectType === "child"
      ? childReactionValueSchema
      : caregiverReactionValueSchema;
    if (!valueSchema.safeParse(reaction.value).success) {
      throw new DomainInvariantError(`A current ${reaction.subjectType} reaction has an incompatible value.`);
    }
    const eventReactions = reactionsByEvent.get(reaction.readingEventId) ?? [];
    if (eventReactions.some((current) => current.subjectType === reaction.subjectType)) {
      throw new DomainInvariantError(`Multiple current ${reaction.subjectType} reactions exist for one reading event.`);
    }
    eventReactions.push(reaction);
    reactionsByEvent.set(reaction.readingEventId, eventReactions);
  }

  return eventResolution.leaves.map((event) => ({
    ...event,
    reactions: reactionsByEvent.get(event.id) ?? [],
  }));
}

export type ReadingRecordGraph = {
  events: ReadingChainRecord[];
  eventAmendments: ChainAmendment[];
  reactions: ReactionChainRecord[];
  reactionAmendments: ChainAmendment[];
};

type ReadingGraphRow = ReadingChainRecord & {
  targetAmendment: ChainAmendment | null;
  reactions: Array<ReactionChainRecord & { targetAmendment: ChainAmendment | null }>;
};

export function readingGraphFromRows(rows: readonly ReadingGraphRow[]): ReadingRecordGraph {
  const reactions = rows.flatMap((event) => event.reactions.map((reaction): ReactionChainRecord => ({
    id: reaction.id,
    householdId: reaction.householdId,
    readingEventId: reaction.readingEventId,
    subjectType: reaction.subjectType,
    value: reaction.value,
    declaredAt: reaction.declaredAt,
    reporterType: reaction.reporterType,
    sourceType: reaction.sourceType,
    sourceVersion: reaction.sourceVersion,
    clientMutationId: reaction.clientMutationId,
    createdAt: reaction.createdAt,
  })));
  return {
    events: rows.map((event): ReadingChainRecord => ({
      id: event.id,
      householdId: event.householdId,
      childId: event.childId,
      workId: event.workId,
      editionId: event.editionId,
      eventType: event.eventType,
      occurredAt: event.occurredAt,
      context: event.context,
      stopReason: event.stopReason,
      notes: event.notes,
      clientMutationId: event.clientMutationId,
      createdAt: event.createdAt,
    })),
    eventAmendments: rows.flatMap((event) => event.targetAmendment === null ? [] : [event.targetAmendment]),
    reactions,
    reactionAmendments: rows.flatMap((event) => event.reactions.flatMap((reaction) => (
      reaction.targetAmendment === null ? [] : [reaction.targetAmendment]
    ))),
  };
}
