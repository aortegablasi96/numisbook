# NumisBook — Database Design

> Status: **Proposed model — not yet implemented.** This describes the intended
> schema; actual Drizzle definitions live in `src/db/schema` (created during
> implementation).

## Engine & Tooling

- **PostgreSQL**
- **Drizzle ORM** — schema in `src/db/schema`, client in `src/db/index.ts`.
- **drizzle-kit** — generates migrations into the top-level `drizzle/` folder.

## Access Pattern

The database is reached **only** through repositories
(`src/repositories`). Services and routes never query it directly.

## Core Entities (proposed)

```
User (1) ──< (N) Collection (1) ──< (N) Coin (1) ──< (N) Valuation
```

### User
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid (pk) | |
| email | text | unique |
| created_at | timestamptz | default now() |

### Collection
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid (pk) | |
| user_id | uuid (fk → User) | indexed |
| name | text | |
| created_at | timestamptz | default now() |

### Coin
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid (pk) | |
| collection_id | uuid (fk → Collection) | indexed |
| name | text | |
| year | integer | nullable |
| country | text | nullable |
| denomination | text | nullable |
| mint | text | nullable |
| metal | text | nullable |
| grade | text | nullable (grading scale TBD) |
| created_at | timestamptz | default now() |

### Valuation
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid (pk) | |
| coin_id | uuid (fk → Coin) | indexed |
| amount | numeric(12,2) | |
| currency | text | ISO 4217 (e.g. "USD") |
| source | text | nullable (manual, auction, estimate) |
| valued_at | timestamptz | |
| created_at | timestamptz | default now() |

## Indexing (initial)

- `collection.user_id`
- `coin.collection_id`
- `valuation.coin_id`, and `(coin_id, valued_at)` for latest-value lookups.

## Open Questions

- Grading scale: free text vs. enum (Sheldon 1–70)?
- Multi-currency: store original currency + convert on read, or normalize?
- Soft deletes vs. hard deletes?

## Migrations Workflow

1. Edit/add tables in `src/db/schema`.
2. Generate a migration with drizzle-kit → `drizzle/`.
3. Review the generated SQL, commit it.
4. Apply via the migrate command (defined in `package.json` during setup).

See also: [`architecture.md`](./architecture.md).
