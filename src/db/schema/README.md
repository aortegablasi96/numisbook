# `src/db/schema` — Drizzle schema

Drizzle table definitions, one file per table/aggregate, re-exported from an
`index.ts` (created during implementation).

## Rules

- Pure schema definitions (tables, columns, relations, indexes).
- The Drizzle client is initialized in `src/db/index.ts` (created later).
- Migrations are generated from these definitions into the top-level
  `drizzle/` folder via `drizzle-kit`.
- Only **repositories** import from `src/db`.
