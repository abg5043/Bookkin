# ADR 0001: Modular monolith

## Decision

Bookkin begins as one Next.js application with explicit domain, application, infrastructure, and UI boundaries.

## Rationale

V0.1 has one household, limited integrations, and a small product surface. A modular monolith keeps local Windows setup, testing, and deployment understandable while preserving seams for metadata, library, and AI providers.

Separate services will require demonstrated operational or scaling need and a future approved checkpoint.
