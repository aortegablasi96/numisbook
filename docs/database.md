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
| issuing_authority | text | nullable; specific issuer, e.g. "Alexander III", "Athens", "Roman Republic" |
| category | text | nullable; broad grouping, e.g. "Seleucids", "Romans", "Indo-Greek" |
| year | integer | nullable; negative values = BC (see open questions) |
| denomination | text | nullable; e.g. tetradrachm, denarius |
| mint | text | nullable; place struck (distinct from the issuing authority) |
| metal | text | nullable |
| grade | text | nullable (grading scale TBD) |
| created_at | timestamptz | default now() |

> **Note:** ancient coinage is issued by an *authority*, not a modern country.
> `issuing_authority` is the specific issuer; `category` is a broader grouping
> (civilization / dynasty / cultural sphere) useful for browsing and grouping.

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
- Ancient dating: a single integer `year` (negative = BC) is coarse. Do we need
  date *ranges* (e.g. "336–323 BC") and/or a textual period label? Revisit if
  precise dating matters for the MVP.
- `issuing_authority` and `category` are currently free-text fields. If naming
  consistency or analytics-by-issuer/category becomes important, graduate them to
  dedicated lookup tables (the repository pattern keeps that migration localized).

## Migrations Workflow

1. Edit/add tables in `src/db/schema`.
2. Generate a migration with drizzle-kit → `drizzle/`.
3. Review the generated SQL, commit it.
4. Apply via the migrate command (defined in `package.json` during setup).

See also: [`architecture.md`](./architecture.md).
