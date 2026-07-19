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

## Errors

Throw the typed errors from `@/lib/errors` — **never a raw `Error` for a known
domain failure.** The API boundary maps them to responses automatically.

```
AppError(message, status)     — base; carries an HTTP status
  ValidationError(message)    — 400; domain invariant violations
  NotFoundError(message)      — 404; missing or invisible resource
  ForbiddenError(message)     — 403; authenticated but not allowed (demo writes)
```

Anything that is not an `AppError` or `ZodError` is treated as unexpected:
reported via `captureException` and returned as a 500 with a correlation
`errorId`.

## Testing

**Service tests are the primary target.** Mock every repository with
`vi.mock()` and test the business logic in isolation.

**Import `describe` / `it` / `expect` from `vitest` in every test file.** Vitest
runs with `globals: true` so they resolve at runtime, but `tsconfig.json` does
not pull in `vitest/globals` — omitting the import passes `npm test` and then
fails `npm run typecheck`, which is a CI gate.

## Notes

- Services must not call the Next-specific `auth()`. Resolve the session in the
  route or Server Component and pass the plain `AuthSession` shape in — see
  `auth.service.ts` (`resolveCurrentUser`).
- Log through `logger` (`@/lib/logger`), never `console.*` (ADR-011).
