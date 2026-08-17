import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { proxy } from "@/proxy";

/**
 * The preview gate is the only thing between the protected preview and the open internet, and
 * an independent security review flagged that no automated test covered it — so a well-meaning
 * "simplification" of the matcher or the fail-closed branch would not fail CI. These tests
 * exist to make that regression loud.
 */

const PASSPHRASE = "correct horse battery staple";
// SHA-256 of PASSPHRASE, the value the gate stores in the cookie.
async function digestOf(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function request(path: string, init?: { cookie?: string; method?: string; body?: BodyInit }) {
  const headers = new Headers();
  if (init?.cookie !== undefined) headers.set("cookie", init.cookie);
  return new NextRequest(`https://preview.example.com${path}`, {
    method: init?.method ?? "GET",
    headers,
    body: init?.body,
  });
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("protected preview gate", () => {
  it("denies an unauthenticated page request without serving application content", async () => {
    vi.stubEnv("BOOKKIN_PREVIEW_PASSPHRASE", PASSPHRASE);
    const response = await proxy(request("/"));
    expect(response.status).toBe(401);
    expect(response.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
    await expect(response.text()).resolves.toContain("Bookkin preview");
  });

  it("denies an unauthenticated API request", async () => {
    vi.stubEnv("BOOKKIN_PREVIEW_PASSPHRASE", PASSPHRASE);
    await expect(proxy(request("/api/children")).then((r) => r.status)).resolves.toBe(401);
  });

  it("rejects a wrong passphrase", async () => {
    vi.stubEnv("BOOKKIN_PREVIEW_PASSPHRASE", PASSPHRASE);
    const body = new URLSearchParams({ passphrase: "not the passphrase" });
    const response = await proxy(request("/preview-unlock", { method: "POST", body }));
    expect(response.status).toBe(401);
  });

  it("accepts the correct passphrase and issues a hardened cookie holding only a digest", async () => {
    vi.stubEnv("BOOKKIN_PREVIEW_PASSPHRASE", PASSPHRASE);
    const body = new URLSearchParams({ passphrase: PASSPHRASE });
    const response = await proxy(request("/preview-unlock", { method: "POST", body }));

    expect(response.status).toBe(303);
    const setCookie = response.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("Secure");
    expect(setCookie).toContain("SameSite=lax");
    // The passphrase itself must never appear in the cookie.
    expect(setCookie).not.toContain(PASSPHRASE);
    expect(setCookie).toContain(await digestOf(PASSPHRASE));
  });

  it("admits a request carrying the valid cookie", async () => {
    vi.stubEnv("BOOKKIN_PREVIEW_PASSPHRASE", PASSPHRASE);
    const cookie = `bookkin_preview=${await digestOf(PASSPHRASE)}`;
    const response = await proxy(request("/", { cookie }));
    expect(response.status).toBe(200);
  });

  it("rejects a forged cookie", async () => {
    vi.stubEnv("BOOKKIN_PREVIEW_PASSPHRASE", PASSPHRASE);
    const response = await proxy(request("/", { cookie: "bookkin_preview=deadbeef" }));
    expect(response.status).toBe(401);
  });

  it("invalidates existing cookies when the passphrase is rotated", async () => {
    const oldCookie = `bookkin_preview=${await digestOf(PASSPHRASE)}`;
    vi.stubEnv("BOOKKIN_PREVIEW_PASSPHRASE", "a different passphrase entirely");
    const response = await proxy(request("/", { cookie: oldCookie }));
    expect(response.status).toBe(401);
  });

  it("fails CLOSED when no passphrase is configured outside local development", async () => {
    // Regression guard: this previously only failed closed when it recognized Vercel, so the
    // same code on any other host would have served the whole application publicly.
    vi.stubEnv("BOOKKIN_PREVIEW_PASSPHRASE", "");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL", "");
    const response = await proxy(request("/"));
    expect(response.status).toBe(503);
  });

  it("stays open in local development so unconfigured local work is unaffected", async () => {
    vi.stubEnv("BOOKKIN_PREVIEW_PASSPHRASE", "");
    vi.stubEnv("NODE_ENV", "development");
    const response = await proxy(request("/"));
    expect(response.status).toBe(200);
  });
});
