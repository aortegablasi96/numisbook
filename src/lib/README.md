# `src/lib` — Shared utilities

Cross-cutting helpers used by multiple layers: validation schemas, error types,
formatting, env parsing, etc.

## Rules

- No domain/business logic (that belongs in **services**).
- No database access (that belongs in **repositories**).
- Keep it dependency-light and broadly reusable.
