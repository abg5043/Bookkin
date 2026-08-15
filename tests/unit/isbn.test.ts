import { describe, expect, it } from "vitest";
import { InvalidIsbnError, isbnSchema, normalizeIsbn } from "../../src/domain/books/isbn";

describe("ISBN normalization", () => {
  it("normalizes a valid ISBN-10", () => {
    expect(normalizeIsbn("0-306-40615-2")).toBe("0306406152");
  });

  it("normalizes a valid ISBN-13", () => {
    expect(normalizeIsbn("978-0-306-40615-7")).toBe("9780306406157");
  });

  it("accepts X as the ISBN-10 check digit", () => {
    expect(normalizeIsbn("0-8044-2957-X")).toBe("080442957X");
  });

  it("rejects an invalid check digit before lookup", () => {
    expect(() => normalizeIsbn("0306406153")).toThrow(InvalidIsbnError);
    expect(isbnSchema.safeParse("9780307291679").success).toBe(false);
  });
});
