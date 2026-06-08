---
name: new-repository
description: Scaffold a NumisBook repository in src/repositories that wraps Drizzle queries behind intention-revealing methods. Use when adding the data-access layer for an entity. Repositories are the only layer allowed to touch the database.
---

# New Repository

Create a repository following NumisBook's Repository pattern
(`CLAUDE.md`, `docs/architecture.md`).

## When to use

You need data access for an entity (often invoked by `new-domain`).

## Steps

1. Create `src/repositories/<entity>.repository.ts`.
2. Import the Drizzle client and schema from `src/db`. **This is the only layer
   permitted to do so.**
3. Expose intention-revealing methods, e.g.:
   - `findById(id)`
   - `listByX(...)`
   - `create(input)`
   - `update(id, patch)`
   - `delete(id)`
4. Return domain-shaped objects. **Never** return or accept Drizzle query
   builders across the boundary.
5. Keep it free of business logic — rules belong in the service.

## Guardrails

- No business logic here.
- Callers (services) must not need to know it's Drizzle underneath.
- Keep the file under ~300 lines; split by aggregate if it grows.

## Workflow Prerequisites

This is an execution skill.

Before using this skill, the following workflow phases must be completed:

* Product Review (`product-manager`)
* Architecture Review (`architect`)
* Database Review (`database-designer`)

This skill assumes repository requirements have already been approved.

Do not redesign:

* requirements
* architecture
* schema

If repository requirements are unclear, request clarification from the approved reviews.

## Required References

Before creating a repository:

Review:

* CLAUDE.md
* docs/architecture.md
* docs/database.md
* docs/decisions/*
* Approved Architecture Review
* Approved Database Review

Ensure repository structure remains consistent with documented patterns and accepted decisions.

## Repository Responsibilities

Repositories are responsible for:

* data retrieval
* persistence
* query composition
* mapping database records to domain objects

Repositories are NOT responsible for:

* business rules
* validation
* authorization
* external integrations
* storage operations
* AI operations

These responsibilities belong to services.

If business logic is required, expose the necessary repository methods and defer logic to the service layer.
