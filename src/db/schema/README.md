# `src/db/schema` — Drizzle schema

Drizzle table definitions, one file per table/aggregate, re-exported from
`index.ts`.

## Rules

- Pure schema definitions (tables, columns, relations, indexes).
- The Drizzle client is initialized in `src/db/index.ts`.
- Migrations are generated from these definitions into the top-level
  `drizzle/` folder via `drizzle-kit`, and are **not** hand-edited.
- Only **repositories** import from `src/db`.
- Auth.js owns `auth.ts` and the identity columns in `users.ts`; app-owned
  profile columns (locale, theme) are edited through `user.service`.
- Add a new table to `index.ts` — it is the re-export barrel.

## Tenant columns

Most user-owned tables carry a `user_id` that repositories scope every query
by. Two deliberate exceptions:

- **`coins`** has no `user_id` — coins are scoped indirectly, through a
  subquery of the user's `collection_id`s.
- **`fx_rates`** is global reference data, intentionally **not** tenant-scoped.
