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

## Tenant isolation

**Every user is a tenant; data must never leak across users.**

- Methods for user-owned entities take the owner's `userId` and scope every
  read and write by it (`WHERE … AND user_id = userId`). The `userId` always
  comes from the authenticated session — **never from client input.**
- Mutations that match no row raise `NotFoundError` (404) rather than revealing
  that another tenant's row exists.
- **Coins are scoped indirectly** — via a subquery of the user's
  `collectionId`s — because `coins` has no `user_id` column.
- **Facet queries are scoped identically.** An unscoped `SELECT DISTINCT` leaks
  another tenant's data through a filter dropdown.
- Exception: `fxRateRepository` is global reference data, intentionally not
  tenant-scoped.

## Domain types

Repositories export the inferred Drizzle types as the canonical domain types,
re-used by services, routes, and components:

```ts
export type Coin = typeof coins.$inferSelect;
export type NewCoin = typeof coins.$inferInsert;
```

Callers import these from the repository, **not** from `@/db/schema`.
