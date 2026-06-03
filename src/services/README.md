# `src/services` — Business logic

All domain/business logic lives here. One module per domain
(e.g. `coin.service.ts`, `collection.service.ts`, `valuation.service.ts`).

## Rules

- Services orchestrate use cases and enforce business rules.
- Services access data **only** through **repositories** — never import
  `src/db` or run queries directly.
- Services are framework-agnostic: no `Request`/`Response`, no React.
- This is the primary layer to unit-test (mock the repositories).

```
service → repository → db
```
