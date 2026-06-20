# ADR-006-Coin and valuation attribute rework

Status: Accepted

Date: 2026-06-09

## Context

The **Data Model Reform** milestone reshapes the coin and valuation data models
so they capture collectors' data accurately *before* the richer Portfolio
Analytics work is built on top of them. The original model carried a small set
of mostly free-`text` coin attributes (including a required display `name`) and
a minimal valuation row.

Several distinct modelling questions surfaced together and are decided here as
one coherent rework, rather than as scattered implementation details:

- How to model attributes drawn from a small, fixed, *ordered* value set (the
  first being coin **grade**) — `database.md` had flagged this as open.
- How a coin is identified now that real numismatic attributes exist: collectors
  describe ancient/world coins by issuing authority, category, year range and
  mint, not by an invented short name.
- How to record the **price the collector paid** distinctly from market
  **valuations**, including the auction price partition.
- What stays free text and what gains structure.

## Decision

### 1. Fixed, ordered value sets use Postgres native enums (`pgEnum`)

Model fixed, app-defined value sets as PostgreSQL enums via Drizzle `pgEnum`.
First and current application: coin `grade` as the `coin_grade` enum
(`G, VG, F, VF, EF, AU, MS`), declared worst → best so declaration order is the
quality order (`ORDER BY grade` is meaningful). The Zod schema mirrors the enum
(`z.enum`), and the value list (`COIN_GRADES`) is exported once from the
validation layer and reused by the UI selects and the assistant tool schema, so
the set is defined in one place.

This applies to **fixed, app-defined** sets only. User-defined or
frequently-changing sets should use a lookup table instead (see Alternatives).

### 2. Coins have no `name`; the title is derived

Coins carry no free-text `name`. A coin's display title is **derived** from its
attributes — `"{Category}. {Issuing Authority} ({year range}), {Mint}"` — by
`formatCoinTitle` in `src/lib/coin-format`, with missing pieces dropped and an
"Untitled coin" fallback. Free-text search (`q`) matches `category` /
`issuing_authority`; sorting by name was removed.

### 3. Minting year is a range

The year is stored as two bounds (`year_from` / `year_to`, negative = BC); a
single known year sets both equal. A `year` filter matches coins whose range
contains it.

### 4. Descriptive and physical attributes are nullable columns (free text)

`issuing_authority`, `category`, `denomination`, `mint`, `metal`, `weight`,
`diameter`, `obverse_description`, `reverse_description`, `observations`,
`catalogue_references`, the auction acquisition fields, and **`pedigree`** (a
free-text list of prior auctions where the coin was hammered) stay `text` /
`numeric`. They are descriptive, open-ended, or user-entered — not fixed sets —
so neither enums nor lookup tables apply.

### 5. Price paid lives on the coin, distinct from valuations

The price the collector paid is recorded on the coin as the auction partition —
`hammer_price`, `auction_premium`, `shipping_cost` — plus `final_price` and a
`price_currency` (ISO 4217). When any partition component is provided,
`final_price` is their **computed sum** (set in the service); otherwise
`final_price` is entered directly (for when the partition is unknown). This is
the cost basis, deliberately separate from `valuations`, which remain
point-in-time **market value** records — enabling later gain/loss analytics by
comparing the two.

### 6. Valuations gain a link

`valuations` gains a `source_url` (the page where the hammer/sale is found),
validated as a URL. The existing `source` stays free text — it is not a fixed
set, so it does **not** become an enum.

## Alternatives Considered

### Enum modelling (for decision 1)

- **Free text + app validation** — simplest, but no DB integrity and
  alphabetical (meaningless) ordering for a quality scale.
- **Text + CHECK constraint** — DB-enforced membership, but no native ordering
  type and weaker Drizzle support.
- **Lookup table + FK** — easily extended and can carry metadata, but heavy
  (join + seed) for a tiny static set that changes only with a code release.
- **Postgres enum via `pgEnum` (chosen)** — DB-enforced, lightweight, typed
  end-to-end, with meaningful `ORDER BY`. Cost: changing the set needs a
  migration (`ADD VALUE` is easy; removing/reordering means recreating the type).

### Coin identity (for decision 2)

- **Keep a required `name`** — familiar, but for ancient/world coinage the name
  is redundant with the attributes and invites inconsistent, duplicated data.
- **Derive the title from attributes (chosen)** — one source of truth; the title
  always reflects the structured data. Cost: a coin with no attributes shows a
  generic fallback, and free-text search targets specific columns.

### Price paid (for decision 5)

- **Single `final_price` only** — simplest, but loses the hammer/premium/shipping
  breakdown collectors track.
- **Partition + computed total, stored (chosen)** — keeps the breakdown and a
  ready-to-query total. The stored `final_price` is a small, justified
  denormalization that keeps analytics queries simple.
- **Reuse `valuations`** — rejected: price paid (cost basis) and market value are
  different concepts; conflating them breaks gain/loss reporting.

## Consequences

Positive:

- Invalid grades are rejected at the database; `ORDER BY grade` reflects quality.
- The coin model captures real numismatic data; the title is consistent with it.
- Cost basis and market value are cleanly separated, unblocking gain/loss
  analytics.
- Types flow from the schema through services to the UI; dropdowns are trivial.

Negative / tradeoffs:

- Evolving an enum requires a migration; not suitable for user-defined or
  volatile sets — use a lookup table there.
- The grade value list lives in two synchronized places (the `pgEnum` and the Zod
  `COIN_GRADES`); they must be kept in step.
- `final_price` is denormalized (a stored sum), so the service is responsible for
  keeping it consistent with the partition.
- Dropping `name` is a breaking schema change; applied pre-deployment via a DB
  reset and a squashed migration baseline (no production data to migrate).

## Related Documents

- docs/database.md (Coin and Valuation tables)
- docs/roadmap.md (Data Model Reform milestone)
- src/db/schema/coins.ts, src/db/schema/valuations.ts
- src/lib/validation/coin.ts, src/lib/coin-format.ts
