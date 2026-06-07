# NumisBook — Database Design

> Status: **Implemented.** This documents the live schema. The Drizzle
> definitions in `src/db/schema` are the source of truth; migrations are
> generated into `drizzle/`. Update this doc when the schema changes.

## Engine & Tooling

- **PostgreSQL**
- **Drizzle ORM** — schema in `src/db/schema`, client in `src/db/index.ts`.
- **drizzle-kit** — generates migrations into the top-level `drizzle/` folder.

## Access Pattern

The database is reached **only** through repositories
(`src/repositories`). Services and routes never query it directly.

## Core Entities

```
User (1) ──< (N) Collection (1) ──< (N) Coin ──< (N) Valuation
                                          └─< (N) CoinImage
```

`coins` has no `user_id`; a coin's tenant is the owner of its collection, so
coin-scoped queries filter through a subquery of the user's `collection_id`s.

### User
Owned by the Auth.js Drizzle adapter (it populates the identity fields on OAuth
login). Application code reads but does not write these.

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid (pk) | |
| name | text | nullable |
| email | text | unique, not null |
| email_verified | timestamptz | nullable |
| image | text | nullable; avatar URL |
| created_at | timestamptz | default now() |

The adapter also owns `accounts`, `sessions`, and `verification_tokens`
(see `src/db/schema/auth.ts`) — standard Auth.js tables, not detailed here.

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

### CoinImage
One or more images per coin. Bytes live here (not on `coins`) so coin listings
stay lean; cascades on coin delete. Storage is abstracted behind
`coinImage.repository` so the bytes could later move to S3/R2.

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid (pk) | |
| coin_id | uuid (fk → Coin) | not null; cascade delete |
| mime_type | text | not null; PNG/JPEG/WebP/GIF |
| data | bytea | not null; raw image bytes |
| created_at | timestamptz | default now(); also the display order |

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

## Decisions & Open Questions

Resolved during implementation:

- **Deletes are hard.** Every owned table cascades on parent delete; there is no
  soft-delete column.
- **Year is a single integer** (negative = BC); the UI renders BC/AD. Date
  *ranges* and textual period labels remain a possible future refinement.
- **Currency is stored as-entered, never normalized.** Portfolio totals are
  reported per currency; allocation/trend use the primary (largest) currency. A
  user-selected base currency + FX conversion is on the roadmap backlog.

Still open:

- Grading scale: free text vs. enum (Sheldon 1–70)? Currently free text.
- `issuing_authority` and `category` are free-text fields. If naming consistency
  or analytics-by-issuer/category becomes important, graduate them to dedicated
  lookup tables (the repository pattern keeps that migration localized).

## Migrations Workflow

1. Edit/add tables in `src/db/schema`.
2. Generate a migration with drizzle-kit → `drizzle/`.
3. Review the generated SQL, commit it.
4. Apply via the migrate command (defined in `package.json` during setup).

See also: [`architecture.md`](./architecture.md).
