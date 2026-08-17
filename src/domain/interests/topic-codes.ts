import { z } from "zod";

export const topicCodeSchema = z.enum([
  "children_general",
  "animals",
  "dinosaurs",
  "vehicles",
  "construction_vehicles",
  "space",
  "weather",
  "ocean",
  "feelings",
  "friendship",
  "music",
  "fairy_tales",
  "humor",
  "bedtime",
]);

export type TopicCode = z.infer<typeof topicCodeSchema>;
export type ConfirmableTopicCode = Exclude<TopicCode, "children_general">;

export const CHILDREN_GENERAL_TOPIC_CODE = "children_general" as const;
const CHILDREN_GENERAL_QUERY = 'subject:"juvenile fiction" AND language:eng';

type TopicCodeDefinition = {
  code: ConfirmableTopicCode;
  aliases: readonly string[];
  outboundQuery: string;
};

// Every alias and query below is frozen by the approved Checkpoint 7A phase-one proposal
// (docs/architecture/checkpoint-7a-phase-one-proposal.md). Matching is local, case-insensitive,
// whitespace-normalized, and exact only -- no fuzzy match, substring match, telemetry-based
// match, or AI match.
const TOPIC_DEFINITIONS: readonly TopicCodeDefinition[] = [
  { code: "animals", aliases: ["animal", "animals", "zoo animals"], outboundQuery: "subject:animals AND language:eng" },
  { code: "dinosaurs", aliases: ["dinosaur", "dinosaurs"], outboundQuery: "subject:dinosaurs AND language:eng" },
  {
    code: "vehicles",
    aliases: ["trucks", "trains", "vehicles", "things that go"],
    outboundQuery: "subject:vehicles AND language:eng",
  },
  {
    code: "construction_vehicles",
    aliases: ["construction vehicles", "diggers", "excavators"],
    outboundQuery: 'subject:"construction equipment" AND language:eng',
  },
  { code: "space", aliases: ["space", "planets", "astronauts"], outboundQuery: "subject:space AND language:eng" },
  { code: "weather", aliases: ["weather", "storms", "snow"], outboundQuery: "subject:weather AND language:eng" },
  { code: "ocean", aliases: ["ocean", "sea life", "underwater"], outboundQuery: "subject:ocean AND language:eng" },
  { code: "feelings", aliases: ["feelings", "emotions"], outboundQuery: "subject:emotions AND language:eng" },
  { code: "friendship", aliases: ["friendship", "friends"], outboundQuery: "subject:friendship AND language:eng" },
  { code: "music", aliases: ["music", "instruments"], outboundQuery: "subject:music AND language:eng" },
  {
    code: "fairy_tales",
    aliases: ["fairy tales", "folktales"],
    outboundQuery: 'subject:"fairy tales" AND language:eng',
  },
  {
    code: "humor",
    aliases: ["funny books", "humor", "silly stories"],
    outboundQuery: "subject:humor AND language:eng",
  },
  { code: "bedtime", aliases: ["bedtime", "going to sleep"], outboundQuery: "subject:bedtime AND language:eng" },
];

// Caregiver-facing display names. The TopicCodeV1 enum value is an internal contract identifier
// and must never be shown to a caregiver, including via a string transform on the code.
const TOPIC_DISPLAY_NAMES: Record<TopicCode, string> = {
  children_general: "Children's books",
  animals: "Animals",
  dinosaurs: "Dinosaurs",
  vehicles: "Things that go",
  construction_vehicles: "Diggers and trucks",
  space: "Space",
  weather: "Weather",
  ocean: "The ocean",
  feelings: "Feelings",
  friendship: "Friendship",
  music: "Music",
  fairy_tales: "Fairy tales",
  humor: "Funny stories",
  bedtime: "Bedtime",
};

export function topicDisplayName(code: TopicCode): string {
  return TOPIC_DISPLAY_NAMES[code];
}

function normalizeLabel(label: string): string {
  return label.trim().toLowerCase().replace(/\s+/gu, " ");
}

const aliasIndex = new Map<string, ConfirmableTopicCode>();
const queryByCode = new Map<TopicCode, string>([[CHILDREN_GENERAL_TOPIC_CODE, CHILDREN_GENERAL_QUERY]]);
for (const definition of TOPIC_DEFINITIONS) {
  queryByCode.set(definition.code, definition.outboundQuery);
  for (const alias of definition.aliases) {
    const key = normalizeLabel(alias);
    if (aliasIndex.has(key)) {
      throw new Error(`Duplicate topic alias in the frozen dictionary: "${alias}".`);
    }
    aliasIndex.set(key, definition.code);
  }
}

/** Local, case-insensitive, whitespace-normalized exact match only. Returns null for any unmatched label. */
export function matchTopicCode(label: string): ConfirmableTopicCode | null {
  return aliasIndex.get(normalizeLabel(label)) ?? null;
}

export function outboundQueryForTopicCode(code: TopicCode): string {
  const query = queryByCode.get(code);
  if (query === undefined) throw new Error(`Unknown topic code: ${code}.`);
  return query;
}

export const allTopicCodes: readonly TopicCode[] = [...queryByCode.keys()];
