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
