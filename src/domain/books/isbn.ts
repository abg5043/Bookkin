import { z } from "zod";

export class InvalidIsbnError extends Error {
  constructor(input: string) {
    super(`Invalid ISBN: ${input}`);
    this.name = "InvalidIsbnError";
  }
}

function compactIsbn(input: string): string {
  return input.replace(/[\s-]/g, "").toUpperCase();
}

function isValidIsbn10(value: string): boolean {
  if (!/^\d{9}[\dX]$/.test(value)) {
    return false;
  }

  const total = [...value].reduce((sum, character, index) => {
    const digit = character === "X" ? 10 : Number(character);
    return sum + (10 - index) * digit;
  }, 0);

  return total % 11 === 0;
}

function isValidIsbn13(value: string): boolean {
  if (!/^\d{13}$/.test(value)) {
    return false;
  }

  const total = [...value.slice(0, 12)].reduce((sum, character, index) => {
    const weight = index % 2 === 0 ? 1 : 3;
    return sum + Number(character) * weight;
  }, 0);

  const checkDigit = (10 - (total % 10)) % 10;
  return checkDigit === Number(value[12]);
}

export function normalizeIsbn(input: string): string {
  const value = compactIsbn(input);

  if (isValidIsbn10(value) || isValidIsbn13(value)) {
    return value;
  }

  throw new InvalidIsbnError(input);
}

export function isValidIsbn(input: string): boolean {
  try {
    normalizeIsbn(input);
    return true;
  } catch {
    return false;
  }
}

export const isbnSchema = z.string().superRefine((value, context) => {
  if (!isValidIsbn(value)) {
    context.addIssue({ code: "custom", message: "Enter a valid ISBN-10 or ISBN-13." });
  }
}).transform(normalizeIsbn);
