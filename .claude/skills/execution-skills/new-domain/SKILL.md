---
name: new-domain
description: Scaffold a full vertical slice for a new NumisBook domain (Drizzle schema → repository → service + tests → thin API route → UI), following the project's layering rules. Use when adding a new domain/entity such as collections, coins, or valuations.
---

# New Domain

Scaffold a complete vertical slice for a NumisBook domain, respecting the
layering in `CLAUDE.md` and `docs/architecture.md`.

## When to use

Adding a new domain or entity (e.g. `collection`, `coin`, `valuation`).

## Steps

1. **Confirm the model.** Check `docs/database.md` for the entity's columns and
   relations. If it isn't there, propose the schema and update `docs/database.md`
   first.
2. **Schema** — add `src/db/schema/<domain>.ts` (Drizzle table + relations) and
   re-export it from `src/db/schema/index.ts`. Generate a migration with
   drizzle-kit into `drizzle/`; do not hand-edit generated SQL.
3. **Repository** — add `src/repositories/<domain>.repository.ts` with
   intention-revealing methods (`findById`, `list...`, `create`, `update`,
   `delete`). This is the only layer that imports `src/db`. Return domain-shaped
   data, not Drizzle query builders.
4. **Service** — add `src/services/<domain>.service.ts` for business rules. It
   depends on the repository only; no `src/db`, no `Request`/`Response`, no React.
   Add `<domain>.service.test.ts` mocking the repository.
5. **API route** — add `src/app/api/<domain>/route.ts` (and `[id]/route.ts` as
   needed). Keep it thin: validate input with Zod → call the service → respond.
6. **UI** — add components under `src/components` that consume the API or Server
   Components. No DB access in components.

## Guardrails

- Dependencies point downward only:
  `app → services → repositories → db`.
- Keep files under ~300 lines.
- Generate tests for service business logic.
- Don't introduce new dependencies without justification.

## Workflow Prerequisites

This skill is an execution skill.

Before using this skill, the following workflow phases must be completed:

1. Product Review (`product-manager`)
2. Architecture Review (`architect`)
3. Database Review (`database-designer`) if schema changes are involved

This skill assumes those reviews have already been approved.

Do not redefine requirements.
Do not redesign architecture.
Do not redesign the schema.

If any prerequisite is missing, stop and request the missing review.

## Required References

Before scaffolding:

Review:

* CLAUDE.md
* docs/architecture.md
* docs/database.md
* docs/decisions/*
* Approved Product Review
* Approved Architecture Review
* Approved Database Review

Generated code must remain consistent with documented decisions and approved reviews.

## Scope

This skill is responsible for scaffolding and implementation only.

Responsibilities:

* schema files
* migrations
* repositories
* services
* API routes
* UI scaffolding
* tests

Not responsible for:

* product design
* architecture decisions
* database design decisions
* dependency selection

Escalate those concerns to the appropriate workflow skill.