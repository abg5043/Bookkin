# Windows PostgreSQL development runbook

## Canonical local workflow

Docker Desktop plus `compose.yaml` is Bookkin's canonical Windows-local PostgreSQL workflow. The credentials in `.env.example` are local-only placeholders, not hosted secrets.

1. Start Docker Desktop and wait until `docker info` succeeds.
2. Copy `.env.example` to `.env` if a local environment file does not already exist. Never overwrite an existing environment file blindly.
3. Start the development database:

   ```powershell
npm run db:up
docker compose ps
   ```

4. Generate the client, replay the committed migration history, and seed the minimal synthetic household:

   ```powershell
   npm run db:generate
   npm run db:migrate
   npm run db:migrate:status
   npm run db:seed
   ```

5. Start Bookkin with `npm run dev`.

The separate disposable test service uses port 5433. The required database-integrity command fails unless `DATABASE_URL` explicitly names a loopback PostgreSQL database ending in `_test` or `_ci`:

```powershell
npm run db:test:up
$env:DATABASE_URL = "postgresql://bookkin_test:bookkin_test_only@127.0.0.1:5433/bookkin_test?schema=public"
npm run db:migrate
npm run test:db
```

Stop containers without deleting development data:

```powershell
npm run db:down
```

## Native Windows fallback

If Docker Desktop cannot run, install the current supported PostgreSQL 18 Windows package and create databases/users matching `.env.example`, or update only the private `.env` file with the local values chosen during installation. The schema, migrations, and application remain identical. Do not commit local credentials.

## Private SQLite rollback copy

The pre-transition SQLite file is ignored and backed up under `.local-backups`. Do not commit it, print its private values, or feed it to the PostgreSQL migration. Checkpoint 5B uses the approved discard-and-reseed path.

## Backup and restore rehearsal

Run the fail-fast automated rehearsal:

```powershell
npm run db:rehearse:restore
```

It resolves the PostgreSQL container for this exact checkout, refuses an existing or ambiguously named restore target, creates a compressed dump, restores into a new `*_restore_check` database, compares every table's row count and the complete constraint inventory, records the dump SHA-256 and non-sensitive reconciliation evidence under ignored `.local-backups`, and independently verifies cleanup of both the disposable database and dump. Cleanup failures make the rehearsal fail without concealing an earlier validation error.

The equivalent manual flow is documented below for recovery inspection. It does not replace the automated reconciliation.

Create a compressed backup inside the container, then copy it to the ignored local backup directory:

```powershell
New-Item -ItemType Directory -Force -Path ".local-backups" | Out-Null
docker compose exec postgres pg_dump -U bookkin_local -d bookkin -Fc -f /tmp/bookkin-checkpoint.dump
docker compose cp postgres:/tmp/bookkin-checkpoint.dump .local-backups/bookkin-checkpoint.dump
```

Restore only into a new disposable verification database:

```powershell
docker compose cp .local-backups/bookkin-checkpoint.dump postgres:/tmp/bookkin-checkpoint.dump
docker compose exec postgres createdb -U bookkin_local bookkin_restore_check
docker compose exec postgres pg_restore -U bookkin_local -d bookkin_restore_check --exit-on-error /tmp/bookkin-checkpoint.dump
docker compose exec postgres psql -U bookkin_local -d bookkin_restore_check -Atc "SELECT COUNT(*) FROM pg_class WHERE relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = current_schema()) AND relkind = chr(114);"
docker compose exec postgres dropdb -U bookkin_local bookkin_restore_check
```

Do not restore over the active database. On corruption, restore a tested backup into a new database, verify counts and constraints, then change the private connection string.

## Destructive local reset

`docker compose down --volumes` deletes the named development volume. Different clones can share a directory-derived Compose project name, so labels—not the project name alone—must identify the owning checkout. Before using it, verify all of the following:

Do not run that broad command. Use the guarded reset script only after a backup/restore rehearsal and only when no local data must be retained:

```powershell
npm run db:rehearse:restore
npm run db:reset:local -- --confirm-reset-local-bookkin
```

The script verifies the PostgreSQL container's exact checkout working-directory, service, and project labels; derives the exact volume mounted at PostgreSQL 18's data path from that verified container; validates the volume's standard Compose project and logical-volume labels; and refuses deletion if any other container is attached. It then removes only that verified local container and volume. The removed local data is not recoverable except from a retained backup. Never use this command against hosted, shared, another checkout's, or unidentified databases.

## Migration rules

- Use `prisma migrate dev` only while authoring a reviewed local development migration.
- Use the committed `npm run db:migrate` (`prisma migrate deploy`) in CI and deployment-style environments.
- Never replay the archived SQLite SQL against PostgreSQL.
- Prefer a forward corrective migration after PostgreSQL becomes canonical. Application rollback is safe only when the applied schema remains compatible.
