# ADR 0002: Platform-protected household alpha

## Decision

The household-alpha preview uses platform-level protection at the hosting layer. Bookkin does not add public registration or application-level authentication in Checkpoint 3.

## Rationale

The initial test scope is one household. A protected private preview keeps child and reading data away from the public while avoiding account and session complexity before the product behavior is validated.

## Future extension point

Before external beta testing or multiple-household use, add application-level authentication and authorization at the request boundary. That layer should map authenticated principals to household memberships, protect routes, enforce household-scoped access, and support account recovery and removal.

Domain logic must not depend directly on a specific authentication vendor.
