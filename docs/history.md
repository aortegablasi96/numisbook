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

# Phase 8 — Figma UI Redesign

Status: Complete

Re-skinned the app to the agreed **Figma "stone & gold"** design — a warm,
editorial look with serif display type — without changing routes, services,
repositories, the API, or the data model. The Figma source (Tailwind + shadcn +
recharts) was a visual reference only; the look was translated into the existing
dependency-free `globals.css` system. See ADR-009.

## Foundations

Implemented:

- Re-mapped `globals.css` to the stone & gold palette, `0.625rem`-based radii,
  and the Figma chart colours; **dropped dark mode** (light-only — the Figma
  defines no real dark variant)
- Typography via `next/font` (self-hosted, no layout shift): **Fraunces**
  (display/numerals), **DM Sans** (body/UI), **DM Mono** (the new `.mono-label`
  uppercase micro-labels)

## Shell & primitives

Implemented:

- `SiteHeader` — gold circular "N" logo, Fraunces wordmark, icon sign-out, and a
  new client `HeaderNav` with an active-state pill
- Gold primary buttons (ink text for AA), `.chip` filter tags, chevron
  breadcrumbs with gold links, rounded-xl cards, mono-header tables

## Screen re-skin

Implemented:

- Dashboard (Fraunces hero, mono-caption stat cards with serif numerals, icon
  feature cards), collections, coin list (dual obverse/reverse thumbnails), coin
  detail (mono field labels, image card), portfolio (gold/stone SVG charts with
  DM Mono axes), and the assistant (dark ink header, gold avatar, gold bubbles)

## Accessibility

Implemented:

- **axe-clean (WCAG 2.1 AA)** on dashboard, portfolio, and coin detail in the
  shipped light scheme; gold-on-white resolved by reserving the bright gold for
  fills and using a deeper gold / ink-on-gold for text, plus a darkened `--muted`
  (ADR-009 §4); responsive verified at mobile and desktop

## Layout matched to the Figma (2026-06-17)

After the initial re-skin read as too narrow on desktop, the shell and dashboard
were aligned **directly to the Figma's exact spacing** (ADR-009 addendum, shell
geometry only — no logic, route, or data-model change):

- `.container` made **full-width with a flat 48px gutter** (Figma `w-full
  px-[48px]`, no max-width; 20px below 768px) instead of a centred
  `max-width:1320px` column; header and content share the one gutter
- **dashboard restructured to the Figma block layout** — header block (`.dash-head`,
  `mb-32`) → stat row (`.stats`, `gap-16 mb-24`) → feature row (`.cards`, `gap-16`);
  this fixed a `margin:0` override on `.stats`/`.cards` that had collapsed the
  stat-row → feature-row gap to ~0px
- **stat cards gained the Figma's top-right icons** (`.stat-head` / `.stat-icon`)
- `.site-header` made opaque (dropped the translucent blur) per the flat Figma nav
- money stat sized down (`.stat-value.is-money`); coin-detail `minmax(0,1fr) 360px`
  image rail with a `40px` gap; portfolio chart row gap `20px`
- **rename/delete icons** added to the collection and coin list rows (the Figma's
  `Pencil`/`Trash2`) via a shared dependency-free `components/ui/icons.tsx` primitive
  and a `.btn-icon` utility; labels kept for accessibility
- values verified pixel-for-pixel (Playwright) at desktop (1680px) and mobile (390px)

## Post-redesign polish (2026-06-18)

A refinement pass over coin detail and the portfolio after the layout match —
still UI-layer only (no logic, route, or data-model change), verified via
Playwright with tsc/lint and the full test suite (121) passing:

- **Coin detail** (`/coins/[id]`) — the photo fills its rounded square
  (`object-fit: cover`); the prev/next carousel became a **selectable thumbnail
  gallery** with a "Picture N of M" caption; the split is full-width flexbox
  (`flex:1` left + a **520px** image rail, stacking below 1160px); 30px title; a
  borderless 20px edit pencil that bolds on hover; key attributes in a larger
  **4-column** tile grid (3/2/1 on narrower viewports)
- **App shell** — header bar **84px** tall with a larger wordmark/nav; the page
  gutter (`.container`) made viewport-scaled `clamp(2rem, 2.6vw, 5.5rem)`
- **Portfolio** (`/portfolio`) — restructured to the Figma block layout: a
  single-line **"Total paid" summary card** (mono caption + base-currency
  control, serif total with the hammer/ECB note inline, `N of M coins priced`
  below). Both SVG charts reworked (still dependency-free, no recharts) to
  **equal, viewport-fitted height** (shared `useChartHeight()`), a
  **horizontally scrollable** plot with a **frozen y-axis** and a **floating
  per-coin tooltip** on the cost-breakdown columns, coin thumbnails crowning the
  columns; the "Acquisition cost over time" chart trimmed to just the
  3M/6M/1Y/All range presets; shared `chart-layout.ts` (slot constants +
  `useMeasuredWidth`)

---

# Phase 9 — UX & Feature Refinement

Status: Complete

A focused round of everyday-UX polish across the coin and portfolio slices ahead
of Production Readiness, plus the one supporting data-model change those
refinements required. No new domains or dependencies; UI extends the existing
`globals.css` system. Built through the standard workflow
(product → UI → architecture → DB → implementation → testing). See ADR-010.

## Price paid

Implemented:

- Added **tax** as a fourth price-paid partition component (`coins.tax_cost`,
  additive migration `0002`): included in the computed `final_price` sum
  (schema → validation → `coin.service` → coin edit form + breakdown line) and
  threaded through the cost analytics — `analytics.service` adds `tax` to
  `CostBreakdown`/`AcquisitionEvent` and the cost-breakdown chart renders a
  fourth `tax` segment, preserving `hammer + premium + tax + shipping + unsplit
  == totalFinal`. The split now triggers on any component (not only hammer)

## Coin detail

Implemented:

- **Era suffix** — `formatYear` now appends `AD` to positive years (keeping `BC`
  for negative); a divide-spanning range shows both ends (e.g. `5 BC – 5 AD`)
- **Attribute chips reordered** to a fixed semantic sequence: Category, Metal,
  Denomination, Condition, Weight, Diameter, Mint, Year

## Portfolio

Implemented:

- `/collections` per-collection comparison **table replaced by a card grid** —
  each card optionally carries the first image of the collection's oldest coin as
  a dimmed full-bleed background (resolved in the repository read-model via
  correlated subqueries, not denormalized), with a legibility scrim for AA
- Cost-breakdown chart sizes columns so **~5 coins fit the visible width**
  (scrolled to the newest by default), the rest reachable by horizontal scroll
- **Expand** control on each portfolio chart — opens the enlarged chart in a
  near-full-viewport `<dialog>` (an independent `inModal` instance) that keeps the
  per-coin width, so it fits proportionally more coins and stays scrollable

## Follow-up round

A second pass within the same milestone (also through the standard workflow):

- **Tax before shipping** fixed as the canonical partition order
  (`hammer → premium → tax → shipping`) across the coin-detail breakdown + edit
  form, the cost-breakdown chart stack/legend/tooltip, and the analytics shapes
- Cost-breakdown chart: **bigger coin avatars and wider bars**; the per-segment
  **percentages moved off the bars into the hover tooltip**, which now always
  lists all four partition components (even 0s) for a partitioned coin and ends
  with a labelled **Total** row
- **Trend chart hover tooltip** — scrubbing the plot drops a dashed guide +
  marker and floats the nearest day's cumulative total and date
- Collections cards **much larger**, the cover photo shown at near-full strength,
  the name/meta **centred** in a translucent blurred panel **anchored to the bottom edge**,
  and the **whole card a stretched link** (clicking the cover navigates, not just
  the text); rename/delete pinned to the top-right, hover-revealed
- **Coin bills (PDF receipts)** — a new vertical slice mirroring coin images:
  `coin_bills` table (additive migration `0003`) for metadata, bytes in object
  storage behind `src/lib/storage`, `coinBill.repository`/`coinBill.service`,
  `GET`/`POST`/`DELETE` routes under `/api/coins/[id]/bills`, and a
  `CoinBills` upload/list/view/download/delete card on the coin detail page.
  PDF-only, max 15 MB

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
- `docs/decisions/008-ui-embellishment.md`
- `docs/decisions/009-figma-ui-redesign.md`
- `docs/decisions/010-ux-and-feature-refinement.md`

---

# Current Architecture Snapshot

Current stack:

## Frontend

- Next.js App Router
- React
- TypeScript
- Dependency-free CSS design system (`src/app/globals.css`; no Tailwind/CSS-in-JS) —
  "stone & gold" theme, light-only, `next/font` typography (ADR-009)

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