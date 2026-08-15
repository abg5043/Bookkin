# Bookkin

Your family's next great read.

Bookkin is a private family preference engine for remembering what worked and building a better public-library bag next time.

## Current status

Checkpoints 0-5 are approved. The current application provides verified ISBN, title, and author discovery; an explicit owned, borrowed, or wishlist family shelf; book history; append-only reading events; separate child and caregiver reactions; and the current shared editorial design system.

Checkpoint 4R is reconciling that approved but mostly untracked baseline with Git and GitHub. It does not add product behavior. Checkpoint 5A remains blocked until the owner approves the exact 4R commit scopes and the approved baseline is delivered.

See [CODEX_BUILD_PLAN.md](./CODEX_BUILD_PLAN.md) for the canonical SDD, checkpoint sequence, and mandatory human gates.

## Windows setup

Requirements:

- Node.js 22.13.0 or a compatible current LTS release
- npm 10 or newer

From the repository root in PowerShell:

```powershell
.\scripts\windows\setup.ps1
```

To start the development server:

```powershell
npm run dev
```

Then open <http://localhost:3000>.

To initialize the current local SQLite development database:

```powershell
npm run db:generate
npm run db:migrate
npm run db:seed
```

`db:migrate` applies the committed migrations and includes a narrow fresh-SQLite fallback for the current Windows Prisma engine behavior. Checkpoint 5B will separately present the proposed PostgreSQL transition, Windows-local alternatives, and SQLite-data disposition for human approval before any database change.

To run the local validation suite:

```powershell
.\scripts\windows\validate.ps1
```

The suite runs linting, TypeScript checking, unit and integration tests, and a production build. Playwright is available separately with `npm run test:e2e` after its browser is available.

## Access model

The current local application has no public registration or application authentication. Household-alpha hosting is planned as a protected HTTPS preview. Hosting providers, managed PostgreSQL, accounts, costs, secrets, and deployment actions require the Checkpoint 8A phase-one human gate.

PWA installability, service workers, offline writes, private-data caching, custom domains, and DNS are not part of V0.1. The access boundary is recorded in `docs/architecture/decisions/0002-alpha-access.md`.

## Repository map

- `src/domain/` - pure product rules and validation
- `src/application/` - household-scoped use cases and ports
- `src/infrastructure/` - Prisma and metadata-provider adapters
- `src/app/` - Next.js routes and request entry points
- `src/components/` - reusable presentation components
- `prisma/` - current schema, committed migrations, and non-sensitive seed data
- `docs/` - product, architecture, design, engineering, stories, and testing documentation
- `scripts/windows/` - Windows setup and validation helpers
- `tests/` - unit, integration, and end-to-end tests
