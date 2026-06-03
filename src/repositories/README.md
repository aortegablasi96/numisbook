# `src/repositories` — Data access (Repository pattern)

The **only** layer that talks to the database. One repository per aggregate
(e.g. `coin.repository.ts`, `collection.repository.ts`).

## Rules

- Wraps Drizzle queries behind intention-revealing methods
  (`findById`, `listByCollection`, `create`, `update`, `delete`).
- Returns domain-shaped data; does not leak Drizzle query builders to callers.
- No business logic — that belongs in **services**.
- Imports the Drizzle client and schema from `src/db`.

```
repository → src/db (Drizzle client + schema)
```
