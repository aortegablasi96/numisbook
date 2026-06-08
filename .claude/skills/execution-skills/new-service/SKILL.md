---
name: new-service
description: Scaffold a NumisBook service in src/services that holds business logic and depends only on repositories. Includes a unit test that mocks the repository. Use when adding or extending domain/business logic.
---

# New Service

Create a service following NumisBook's service-layer rules
(`CLAUDE.md`, `docs/architecture.md`).

## When to use

You need business logic / use-case orchestration for a domain.

## Steps

1. Create `src/services/<domain>.service.ts`.
2. Depend on the relevant **repository** only. Do **not** import `src/db`,
   and do **not** reference `Request`/`Response` or React — services are
   framework-agnostic.
3. Implement use cases that enforce business rules; keep validation of raw HTTP
   input at the API boundary, but enforce domain invariants here.
4. Create `src/services/<domain>.service.test.ts`:
   - Mock the repository.
   - Cover the business rules and edge cases.

## Guardrails

- All business logic lives here — not in routes, repositories, or components.
- Services are the primary unit-test target.
- Keep the file under ~300 lines.
- Don't introduce new dependencies without justification.

## Workflow Prerequisites

This is an execution skill.

Before using this skill, the following workflow phases must be completed:

* Product Review (`product-manager`)
* Architecture Review (`architect`)

If business rules affect persistence or schema:

* Database Review (`database-designer`)

This skill assumes business requirements have already been approved.

Do not redesign:

* requirements
* architecture
* database schema

Implement approved business behavior only.

## Required References

Before creating or modifying a service:

Review:

* CLAUDE.md
* docs/architecture.md
* docs/product.md
* docs/decisions/*
* Approved Product Review
* Approved Architecture Review

If persistence behavior is involved:

* docs/database.md
* Approved Database Review

Generated services must remain consistent with approved requirements and documented architecture.

## Service Responsibilities

Services are responsible for:

* business rules
* domain invariants
* use-case orchestration
* repository coordination
* storage coordination
* AI orchestration
* authorization decisions

Services are NOT responsible for:

* database queries
* schema definitions
* HTTP request parsing
* HTTP response generation
* UI rendering
* framework concerns

If database access is required, use repositories.

If file access is required, use storage abstractions.

If AI functionality is required, use dedicated AI services.