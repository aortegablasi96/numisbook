# `src/lib` — Shared utilities

Cross-cutting helpers used by multiple layers: validation schemas, error types,
formatting, env parsing, etc.

## Rules

- No domain/business logic (that belongs in **services**).
- No database access (that belongs in **repositories**).
- Keep it dependency-light and broadly reusable.

## Observability (ADR-011)

- `logger/` — structured `Logger` singleton (JSON in prod, pretty in dev;
  `LOG_LEVEL` / `LOG_FORMAT` overrides). Log through it, not `console`.
- `observability/` — `ErrorReporter` seam; `captureException(error, context)`
  logs and returns a correlation `errorId`. The API boundary calls it for
  unhandled errors. Swap in a hosted monitor (Sentry) here, not at call sites.
