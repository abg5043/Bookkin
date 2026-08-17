import { describe, expect, it } from "vitest";
import { allTopicCodes, matchTopicCode, outboundQueryForTopicCode } from "@/domain/interests/topic-codes";

describe("topic code dictionary", () => {
  it("matches known aliases case-insensitively and whitespace-normalized", () => {
    expect(matchTopicCode("dinosaur")).toBe("dinosaurs");
    expect(matchTopicCode("Dinosaurs")).toBe("dinosaurs");
    expect(matchTopicCode("  DINOSAUR  ")).toBe("dinosaurs");
    expect(matchTopicCode("things   that go")).toBe("vehicles");
    expect(matchTopicCode("construction vehicles")).toBe("construction_vehicles");
  });

  it("never fuzzy- or substring-matches an unlisted label", () => {
    expect(matchTopicCode("construction vehicles with grandpa")).toBeNull();
    expect(matchTopicCode("elevator buttons")).toBeNull();
    expect(matchTopicCode("dino")).toBeNull();
    expect(matchTopicCode("")).toBeNull();
  });

  it("never returns children_general from a label match", () => {
    expect(matchTopicCode("juvenile fiction")).toBeNull();
    expect(matchTopicCode("children general")).toBeNull();
  });

  it("has a fixed outbound query for every topic code, including the generic corpus", () => {
    for (const code of allTopicCodes) {
      expect(outboundQueryForTopicCode(code)).toMatch(/language:eng/);
    }
    expect(outboundQueryForTopicCode("children_general")).toBe('subject:"juvenile fiction" AND language:eng');
    expect(outboundQueryForTopicCode("dinosaurs")).toBe("subject:dinosaurs AND language:eng");
  });

  it("throws for an unknown code rather than silently returning nothing", () => {
    expect(() => outboundQueryForTopicCode("not_a_real_code" as never)).toThrow();
  });
});
