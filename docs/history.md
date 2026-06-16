# NumisBook — Project History

This document records completed milestones and major architectural achievements.

For planned work and prioritization, see `roadmap.md`.

---

# Phase 0 — Foundation

Status: Complete

## Achievements

- Established Next.js + Drizzle + PostgreSQL stack
- Defined project architecture and layering rules
- Created initial documentation:
  - architecture.md
  - database.md
  - product.md
- Created initial Claude Code workflow
- Created initial Claude Code skills

---

# Phase 1 — Project Setup

Status: Complete

## Achievements

- Next.js + TypeScript project scaffolded
- Drizzle ORM configured
- drizzle-kit configured
- ESLint configured
- Vitest configured
- Initial database schema created:
  - User
  - Collection
  - Coin
  - Valuation
- Environment template added
- First migration executed against Docker PostgreSQL

---

# Phase 2 — MVP Features

Status: Complete

## Authentication

- Auth.js v5
- Google OAuth
- Drizzle adapter
- Framework-agnostic auth service

## Collections

- Create collections
- List collections
- Rename collections
- Delete collections

## Coins

- Add coins
- Edit coins
- List coins
- Delete coins

## Valuations

- Record valuations
- Historical valuation tracking

## UI

- Collection pages
- Coin pages
- Navigation

---

# Phase 3 — Post-MVP Features

Status: Complete

## Portfolio Analytics

Implemented:

- Portfolio totals
- Allocation analysis
- Value-over-time trends

## Collection Assistant

Implemented:

- OpenAI integration
- Function calling
- Tool execution
- Tenant-safe user context injection

## Coin Images

Implemented:

- Image uploads
- Image storage abstraction

## UI Improvements

Implemented:

- Design system
- Application shell
- Dashboard

---

# Phase 4 — Usability & Scalability Improvements

Status: Complete

## Collection Management

Implemented:

- Search
- Filtering
- Sorting
- Pagination

## User Experience

Implemented:

- ConfirmButton component
- Inline editing
- Improved destructive actions

## Testing

Implemented:

- API route tests
- Auth coverage
- Validation coverage

## Assistant

Implemented:

- Floating assistant widget
- Multi-turn image persistence

## Coin Management

Implemented:

- Coin detail page
- Full editing workflow
- Multi-image support
- Image carousel

## Performance

Implemented:

- WebP thumbnail generation
- Object storage migration
- Cloudflare R2 integration
- S3-compatible storage abstraction

## Data Tables

Implemented:

- Reusable table layouts
- Column customization
- Drag-and-drop ordering
- LocalStorage persistence

---

# Phase 5 — Data Model Reform

Status: Complete

Reformed the coin and valuation data models to capture collectors' data
accurately before building richer analytics on them.

## Coin Attributes

Implemented:

- Reformed attribute schema (year as a range, grade `pgEnum`, weight, diameter,
  obverse/reverse descriptions, observations, catalogue references, auction
  acquisition fields)
- Removed the free-text `name`; coin title is now derived from attributes
  (`formatCoinTitle`); search/sort repointed off `name`
- Added `pedigree` (free-text provenance)
- Added price paid — hammer / premium / shipping partition with a computed
  `final_price` (or direct entry) and `price_currency` — distinct from valuations

## Valuation Attributes

Implemented:

- Added `source_url` link to the sale/hammer page

## Detail Page

Implemented:

- Reworked coin detail page: derived title, characteristics line, and the
  roadmap-defined element order

## Migrations

Implemented:

- Squashed migrations to a fresh baseline (pre-deployment DB reset)

---

# Phase 6 — Portfolio Analytics Upgrade

Status: Complete

Upgraded portfolio analytics on top of the reformed data models, expressing all
figures in a single base currency so a mixed-currency collection is finally
comparable. Analytics is based on the **price paid** per coin (hammer and final
price); valuation-based value and gain/loss are deferred to a later stage (when
valuation tracking matures). Built through the standard workflow
(product → UI → architecture → ADR/DB → implementation → testing).

## Multi-currency foundation

Implemented:

- Per-user base-currency preference (`users.base_currency`; null = derive from
  the dominant price currency)
- Currency conversion via European Central Bank reference rates (frankfurter.app,
  no API key), behind an `FxRateProvider` interface (mirroring the storage
  abstraction) with an `fx_rates` cache table for offline-safe reads
- `fx.service` converter (EUR-pivot; each price converted at the rate on or
  before its acquisition date); see ADR-007

## Price-based portfolio figures

Implemented:

- Total paid in the base currency, with hammer and final totals shown side by
  side; native spend per currency reported for reference
- Prices no rate covers are surfaced as a count, never summed across currencies

## Allocation & comparisons

Implemented:

- Allocation breakdowns by metal, category, acquisition year, and collection
  (by final price)
- Per-collection comparison (hammer + total paid per collection)

## Charts & controls

Implemented:

- Dependency-free SVG line/area chart (`analytics/TrendChart`) showing cumulative
  acquisition cost over time, with 3M/6M/1Y/All date-range presets

## Deferred to a later stage

- Market valuations as the basis for current value, gain/loss, and performance
  indicators (depends on valuation tracking maturing)

---

# Phase 7 — Embellishment

Status: Complete

Polished the MVP features and UI to a quality bar suitable for real collectors,
against the final (post-reform) data shape, before the visual redesign and
production readiness. No new domains — refinement across the existing slices.

## Overview aggregates

Implemented:

- Coin count per collection on `/collections`, the signed-in **home dashboard**
  (collection/coin counts and total paid), and **total paid per collection**
  (base-currency cost beside the count) — all as derived read-model fields
  (counts in SQL, FX-converted sums in the service over the shared converter);
  see ADR-008

## UI/UX polish

Implemented:

- Portfolio chart embellishment — side-by-side equal-height charts, gridlines,
  per-segment allocation labels, coin thumbnails, date-range presets (ADR-007)
- Visual-consistency pass — fixed the coin-list toolbar layout bug (horizontal
  `.toolbar` instead of the reused column-flex `.filters`), loading skeletons /
  neutral placeholders for coin thumbnails and the detail image card (no blank
  flash), and ISO-aligned the coin "Added" date
- **Accessibility & responsive pass** — WCAG AA contrast, `:focus-visible`,
  skip-to-content link, `prefers-reduced-motion`, `.sr-only` labels, and
  `.table-wrap` mobile scrolling; axe-clean on all pages in both colour schemes

## Quality

Implemented:

- Error-state resilience — shared `lib/http` (`readError` + `NETWORK_ERROR`);
  every client manager surfaces a friendly message on network failure instead of
  failing silently (incl. a `CoinDetailsCard` save that previously failed silently)
- Usability — new valuations default the currency to the coin's price currency
  (or the user's base currency) instead of a hard-coded USD

---

# Major Architectural Decisions

See:

- `docs/decisions/001-nextjs-monolith.md`
- `docs/decisions/002-drizzle-over-prisma.md`
- `docs/decisions/003-authjs-google-oauth.md`
- `docs/decisions/004-s3-storage-abstraction.md`
- `docs/decisions/005-cloudflare-r2-initial-provider.md`
- `docs/decisions/006-coin-and-valuation-attribute-rework.md`
- `docs/decisions/007-portfolio-analytics-upgrade.md`
- `docs/decisions/008-derived-overview-aggregates.md`

---

# Current Architecture Snapshot

Current stack:

## Frontend

- Next.js App Router
- React
- TypeScript
- Dependency-free CSS design system (`src/app/globals.css`; no Tailwind/CSS-in-JS)

## Backend

- Next.js Route Handlers
- Service Layer
- Repository Layer

## Database

- PostgreSQL
- Drizzle ORM

## Authentication

- Auth.js
- Google OAuth

## AI

- OpenAI
- Function Calling
- Tool-based Assistant

## Storage

- Cloudflare R2
- S3-compatible abstraction

---

# Historical Notes

This document intentionally records completed work only.

Future plans, priorities, and backlog items belong in `roadmap.md`.