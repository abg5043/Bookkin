import { NextResponse, type NextRequest } from "next/server";

/**
 * Preview access gate for the Checkpoint 7P protected preview.
 *
 * This is NOT application authentication and must never be described as such. It is a single
 * shared passphrase that keeps a synthetic-data preview off the open internet. Real household
 * authentication remains Checkpoint 12A.
 *
 * The gate is active only when BOOKKIN_PREVIEW_PASSPHRASE is set, so local development and CI
 * are unaffected. If the variable is absent in a hosted environment the deployment is treated
 * as misconfigured and every request is refused, because failing closed is the only safe
 * default for a surface whose entire job is denying access.
 */

const COOKIE_NAME = "bookkin_preview";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;

/**
 * Deliberately an inverse check. An earlier version asked "is this Vercel?" and only failed
 * closed there, which meant deploying this same code to any other host without updating the
 * function would silently serve the entire application publicly. Safety must not depend on
 * recognizing the platform, so anything that is not an explicitly local development server is
 * treated as hosted and must be configured.
 */
function isLocalDevelopment(): boolean {
  if (process.env.BOOKKIN_FORCE_PREVIEW_GATE === "true") return false;
  return process.env.NODE_ENV === "development";
}

/** Constant-time comparison so a wrong passphrase cannot be recovered by timing the response. */
function secureEquals(left: string, right: string): boolean {
  const leftBytes = new TextEncoder().encode(left);
  const rightBytes = new TextEncoder().encode(right);
  if (leftBytes.length !== rightBytes.length) return false;
  let difference = 0;
  for (let index = 0; index < leftBytes.length; index += 1) {
    difference |= leftBytes[index] ^ rightBytes[index];
  }
  return difference === 0;
}

/**
 * The cookie stores a SHA-256 of the passphrase rather than the passphrase itself, so a stolen
 * cookie does not hand over the shared secret in readable form. Rotating the passphrase
 * invalidates every existing cookie automatically, which is the required rotation behavior.
 */
async function expectedCookieValue(passphrase: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(passphrase));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function unlockPage(message?: string): string {
  const notice = message === undefined
    ? ""
    : `<p role="alert" style="margin:0 0 1rem;padding:.7rem;border-left:5px solid #c5264c;background:#fff0f3">${message}</p>`;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>Bookkin preview</title></head>
<body style="margin:0;display:grid;place-items:center;min-height:100dvh;background:#f4f7f8;color:#111316;font-family:system-ui,sans-serif">
<main style="width:min(100%,26rem);padding:1.5rem">
<h1 style="margin:0 0 .35rem;font-size:1.5rem">Bookkin preview</h1>
<p style="margin:0 0 1.25rem;color:#555d65">This is a private preview with sample data. Enter the passphrase to continue.</p>
${notice}
<form method="POST" action="/preview-unlock">
<label for="passphrase" style="display:block;margin-bottom:.35rem;font-weight:600">Passphrase</label>
<input id="passphrase" name="passphrase" type="password" autocomplete="current-password" required
 style="width:100%;min-height:2.9rem;padding:.6rem .85rem;border:1.5px solid #88939c;border-radius:.9rem;box-sizing:border-box">
<button type="submit"
 style="width:100%;min-height:2.9rem;margin-top:.85rem;border:2px solid #111316;border-radius:.75rem;background:#ffe500;font-weight:700;cursor:pointer">
Enter preview</button>
</form>
</main></body></html>`;
}

function lockedResponse(message?: string, status = 401): NextResponse {
  return new NextResponse(unlockPage(message), {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

export async function proxy(request: NextRequest) {
  const passphrase = process.env.BOOKKIN_PREVIEW_PASSPHRASE;

  if (passphrase === undefined || passphrase.length === 0) {
    if (isLocalDevelopment()) return NextResponse.next();
    // Fail closed: any non-local deployment without a configured passphrase is misconfigured,
    // and must never silently serve the preview to the open internet.
    return new NextResponse("This preview is not configured.", {
      status: 503,
      headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" },
    });
  }

  const expected = await expectedCookieValue(passphrase);

  if (request.nextUrl.pathname === "/preview-unlock") {
    if (request.method !== "POST") return lockedResponse(undefined, 405);
    const submitted = (await request.formData()).get("passphrase");
    if (typeof submitted !== "string" || !secureEquals(submitted, passphrase)) {
      return lockedResponse("That passphrase did not match. Try again.");
    }
    const response = NextResponse.redirect(new URL("/", request.url), 303);
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
    response.cookies.set(COOKIE_NAME, expected, {
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });
    return response;
  }

  const cookie = request.cookies.get(COOKIE_NAME)?.value;
  if (cookie !== undefined && secureEquals(cookie, expected)) {
    const response = NextResponse.next();
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
    return response;
  }

  return lockedResponse();
}

export const config = {
  // Static assets are excluded so the unlock page can style itself; no application data is
  // served from these paths. robots.txt is excluded so a crawler can actually read the
  // disallow directive instead of receiving a 401 — the gate still denies it every real page.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt).*)"],
};
