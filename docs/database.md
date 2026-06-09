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
| year_from | integer | nullable; start of the minting range, negative = BC |
| year_to | integer | nullable; end of the minting range, negative = BC. A single known year is stored as `year_from == year_to` |
| denomination | text | nullable; e.g. tetradrachm, denarius |
| mint | text | nullable; place struck (distinct from the issuing authority) |
| metal | text | nullable |
| grade | coin_grade (enum) | nullable; one of `G, VG, F, VF, EF, AU, MS` (worst → best; enum order is preserved for sorting) |
| weight | numeric(7,2) | nullable; grams |
| diameter | numeric(6,2) | nullable; millimetres |
| obverse_description | text | nullable; type description of the obverse |
| reverse_description | text | nullable; type description of the reverse |
| observations | text | nullable; detailed free-form notes |
| catalogue_references | text | nullable; free text, e.g. "RIC 123; Sear 456" |
| auction_house | text | nullable; acquisition — auction house name |
| auction_name | text | nullable; acquisition — auction/sale name |
| auction_lot | text | nullable; acquisition — lot number (text, e.g. "123A") |
| auction_date | date | nullable; acquisition — auction date |
| created_at | timestamptz | default now() |

> **Note:** ancient coinage is issued by an *authority*, not a modern country.
> `issuing_authority` is the specific issuer; `category` is a broader grouping
> (civilization / dynasty / cultural sphere) useful for browsing and grouping.
>
> **Minting year is a range.** Exact dates are often unknown, so the year is two
> bounds (`year_from`, `year_to`); a single known year sets both equal. A `year`
> search filter matches coins whose range contains it.

### CoinImage
One or more images per coin. Only **metadata** lives here — the bytes are kept
in object storage (`src/lib/storage`, S3-compatible / Cloudflare R2, with a
local-filesystem fallback for dev) and referenced by `storage_key`. Keeping the
bytes out of Postgres keeps the DB small and backups fast. Cascades on coin
delete; the `coinImage.repository` removes the stored object alongside the row.

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid (pk) | |
| coin_id | uuid (fk → Coin) | not null; cascade delete |
| mime_type | text | not null; PNG/JPEG/WebP/GIF |
| storage_key | text | not null; object-storage key (e.g. `coins/<coinId>/<uuid>`), not a public URL |
| size_bytes | integer | not null; size of the stored object |
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
- **Year is a range** (`year_from`/`year_to`, negative = BC); the UI renders
  BC/AD and collapses equal bounds to a single year. Replaced the original single
  `year` integer in the Data Model Reform milestone.
- **Grade is a Postgres enum** (`coin_grade`: `G, VG, F, VF, EF, AU, MS`), not
  free text. Declaration order is worst → best so `ORDER BY grade` is meaningful.
  Sheldon 1–70 was considered but the lettered scale suits ancient/world coinage.
- **Currency is stored as-entered, never normalized.** Portfolio totals are
  reported per currency; allocation/trend use the primary (largest) currency. A
  user-selected base currency + FX conversion is on the roadmap backlog.

Still open:

- `catalogue_references` is a single free-text field. If catalogue lookups or
  per-catalogue analytics become important, graduate it (and `issuing_authority`
  / `category`) to dedicated lookup tables (the repository pattern keeps that
  migration localized).
- Valuation attribute rework is the next step of the Data Model Reform milestone
  (the coin attributes were reformed first).

## Migrations Workflow

1. Edit/add tables in `src/db/schema`.
2. Generate a migration with drizzle-kit → `drizzle/`.
3. Review the generated SQL, commit it.
4. Apply via the migrate command (defined in `package.json` during setup).

See also: [`architecture.md`](./architecture.md).
