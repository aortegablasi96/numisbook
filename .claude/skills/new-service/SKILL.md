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
