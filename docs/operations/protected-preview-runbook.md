# Protected preview runbook (Checkpoint 7P)

Audience: the product owner. This is written so you can create, recover, and tear down the preview yourself without an agent.

**Nothing in this runbook has been executed.** No account exists, no resource is provisioned, and no cost has been incurred. Every step below is yours to run.

Target: **$0/month** — Vercel Hobby, Neon free tier, a `*.vercel.app` URL, and an application-level passphrase gate. No custom domain.

## What is already built and verified

The passphrase gate (`src/proxy.ts`) and the no-index policy (`src/app/robots.ts`) are implemented and tested locally against a running server:

| Check | Result |
| --- | --- |
| Unauthenticated page request | `401`, serves the lock screen, never application content |
| Unauthenticated API request (`/api/children`) | `401` |
| Wrong passphrase | `401` |
| Correct passphrase | `303` + `Secure; HttpOnly; SameSite=lax` cookie |
| Valid cookie | `200` |
| Forged cookie | `401` |
| `X-Robots-Tag` on every response | `noindex, nofollow` |
| Hosted deployment with **no** passphrase configured | `503` — fails closed rather than exposing the app |

The cookie stores a SHA-256 of the passphrase, not the passphrase itself, so changing the passphrase invalidates every existing session automatically.

## Step 1 — Create the database (Neon)

1. Sign up at `neon.tech`. Choose the **Free** plan.
2. Create a project named `bookkin-preview`. Select PostgreSQL 18 to match local and CI.
3. Copy the **pooled** connection string. It looks like `postgresql://…@…neon.tech/neondb?sslmode=require`.

Free tier gives 0.5 GB storage and 100 CU-hours/month, and scales to zero after five minutes idle. Synthetic showcase data uses a tiny fraction of that.

## Step 2 — Create the hosting project (Vercel)

1. Sign up at `vercel.com` with your GitHub account. Choose the **Hobby** plan.
2. Import the `abg5043/Bookkin` repository.
3. Leave the production branch as **`main`**. Approved checkpoints are merged into `main` immediately (see section 11.4 of the build plan), so `main` is always the approved, deployable state. Do not point production at a feature branch — if the live site is missing approved work, the fix is to merge that work into `main`, not to redirect the deployment.
4. **Before the first deploy**, add these environment variables:

   | Name | Value |
   | --- | --- |
   | `DATABASE_URL` | the Neon connection string from step 1 |
   | `BOOKKIN_PREVIEW_PASSPHRASE` | a passphrase you choose — see below |

**Choose a real passphrase.** Four or five unrelated words is both stronger and easier to text to someone than a short complex string. Do not reuse a password you use anywhere else. Store it in your password manager.

If you deploy without `BOOKKIN_PREVIEW_PASSPHRASE`, the site returns `503` for everything. That is deliberate — it fails closed instead of publishing a preview to the open internet.

## Step 3 — First deploy and database setup

Vercel builds on push. After the first successful deploy, the database is still empty. Run the schema and seed from your local machine, pointed at the Neon database.

**PowerShell (Windows — this is what you are using).** PowerShell has no inline `VAR=value command` prefix; that syntax is bash-only and fails with "is not recognized as the name of a cmdlet". Set the variable first, run both commands, then clear it:

```powershell
$env:DATABASE_URL = "<your-neon-connection-string>"
```

```powershell
npx prisma migrate deploy
```

```powershell
npm run db:seed
```

```powershell
Remove-Item Env:\DATABASE_URL
```

Do not skip the final line. `$env:` persists for the entire terminal window and takes precedence over the local `.env` file, so leaving it set means a later `npm run db:migrate` in that same window would silently run against the hosted database instead of local Docker. Closing the window has the same effect.

**Bash / macOS / Linux**, for reference:

```bash
DATABASE_URL="<your-neon-connection-string>" npx prisma migrate deploy
```

```bash
DATABASE_URL="<your-neon-connection-string>" npm run db:seed
```

Only synthetic data. Never copy your local household database to the preview.

## Step 4 — Verify before sharing

Do all four, in this order. If any fails, stop and fix it before giving anyone the link.

1. Open the deployment URL in a **private/incognito window**. You must see the passphrase screen, not the app.
2. Enter a **deliberately wrong** passphrase. You must be refused.
3. Enter the correct passphrase. You should reach the shelf.
4. In the same private window, visit `<your-url>/api/children` **before** entering the passphrase in a fresh session. You must be refused, not shown data.

Then open it on your phone and walk through the Reading profile at real thumb size. That real-device pass is the point of this checkpoint.

## Recovering the preview

- **Bad deploy:** in Vercel, open Deployments, find the last good one, and choose Instant Rollback.
- **Corrupted or confusing data:** re-run the seed from step 3. Because the data is synthetic, resetting is always safe.
- **Passphrase leaked or shared too widely:** change `BOOKKIN_PREVIEW_PASSPHRASE` in Vercel and redeploy. Every existing session is invalidated automatically.

## Complete teardown

Run this whenever you want, and rehearse it once before relying on the preview.

1. Vercel → project → Settings → Advanced → **Delete Project**.
2. Neon → project → Settings → **Delete Project**.
3. Confirm in each account's billing page that no active resource remains.
4. Remove the passphrase and connection string from your password manager.

Nothing about this preview is required by local development. Deleting it breaks nothing on your machine.

## Cost expectations

| Item | Tier | Expected |
| --- | --- | --- |
| Vercel | Hobby | $0 |
| Neon | Free | $0 |
| URL | `*.vercel.app` | $0 |

Two things that would change that, both of which you would choose deliberately:

- **Vercel Hobby is restricted to non-commercial personal projects.** A private unmonetized preview plausibly qualifies. Charging families later does not. Revisit before any monetization step, per section 9.2 of the build plan.
- Sustained traffic beyond the free allowances. A private preview used by you and a handful of reviewers will not approach them.

Record the observed monthly cost after the first full month as the per-household cost baseline that Checkpoints 8A, 12C, and 13 build on. At one household this figure is a **ceiling, not a projection**, and it excludes your own support time.

## What this preview is not

It is not application authentication, not a production environment, and not a place for real child data. Household accounts arrive at Checkpoint 12A. Until then, one shared passphrase protects one synthetic household.
