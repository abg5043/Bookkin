# ADR 0005: Canonical PostgreSQL architecture

## Status

Accepted by the owner in the Checkpoint 5B phase-one decision on 2026-08-15. Local PostgreSQL implementation is authorized within Checkpoint 5B; hosted provisioning remains unauthorized.

## Context

The current application and migration history are SQLite-specific. Checkpoint 5B requires database-enforced household integrity, source-preserving correction chains, typed taxonomies, validated structured evidence, and reproducible local and CI migration evidence. Prisma migration SQL cannot be reused across database providers.

## Proposed decision

- Use a pinned PostgreSQL 18 image/major as canonical for local development, CI, and future hosting.
- Use Docker Desktop with a checked-in Compose service as the primary Windows workflow; document the native PostgreSQL Windows installer as the fallback.
- Store instants as `timestamptz(3)`, validated structured contracts as `jsonb`, and closed taxonomies as PostgreSQL enums plus reviewed check constraints.
- Enforce household ownership through composite keys and composite foreign keys in addition to use-case validation.
- Preserve the SQLite migration history outside Prisma's active PostgreSQL migration directory for audit; create a newly reviewed PostgreSQL baseline from an empty database.
- Back up and checksum the ignored local SQLite file before cutover. Default to a minimal verified reseed; require separate owner approval for any one-time data importer.
- Use `prisma migrate deploy` for CI and deployment-style verification. Never improvise provider conversion or down-migrations.

## Consequences

Local and CI behavior share one database family and stronger integrity primitives. Docker becomes the recommended local service dependency, while a native fallback remains available. Migration replay, backup/restore, rollback, and destructive-target safeguards become acceptance evidence. Hosted database selection and provisioning remain outside Checkpoint 5B.
