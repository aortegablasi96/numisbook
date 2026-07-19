# `src/db` — Database client and schema

The Drizzle client singleton (`index.ts`) and the table definitions
(`schema/`). The lowest layer — nothing below it but PostgreSQL.

## Rules

- **Only `src/repositories` may import from here.** An ESLint
  `no-restricted-imports` guard fails `npm run lint` on any `@/db` /`@/db/**`
  import outside `src/repositories` — the exceptions are `src/db` itself and
  `src/auth.ts` (the Auth.js Drizzle adapter).
- Import domain types from the repository that owns them, not from
  `@/db/schema` directly. Repositories re-export the inferred Drizzle types
  (`$inferSelect` / `$inferInsert`) as the canonical domain types.
- `index.ts` **throws at import time** if no connection string is set.

## Connection string (ADR-012)

In production the client reads `PROD_DATABASE_URL`, falling back to
`DATABASE_URL`; locally it always uses `DATABASE_URL`. This keeps a
`PROD_DATABASE_URL` stashed in a local `.env` from repointing dev at
production. Migrations are separate — `drizzle.config.ts` always uses
`DATABASE_URL`.

```
repository → src/db (Drizzle client + schema) → PostgreSQL
```
