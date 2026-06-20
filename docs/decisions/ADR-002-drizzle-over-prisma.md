# ADR-002-Drizzle ORM

Status: Accepted

Date: 2026-06-06

## Context

The project requires a type-safe ORM for PostgreSQL.

## Decision

Use Drizzle ORM.

## Alternatives Considered

### Prisma

Pros:
* Large ecosystem
* Excellent tooling

Cons:
* Additional abstraction layer
* Less SQL-centric

## Consequences

Positive:
* Better SQL visibility
* Strong typing
* Lightweight

Negative:
* Smaller ecosystem