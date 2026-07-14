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
dependency-free `globals.css` system. See DDR-001.

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
  (DDR-001 §4); responsive verified at mobile and desktop

## Layout matched to the Figma (2026-06-17)

After the initial re-skin read as too narrow on desktop, the shell and dashboard
were aligned **directly to the Figma's exact spacing** (DDR-001 addendum, shell
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
(product → UI → architecture → DB → implementation → testing). See ADR-009.

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

# Phase 10 — Deployment Scaffolding

Status: Complete (in-repo scaffolding; the account-bound deploy actions remain
the owner's, per the runbook)

The final slice of **Production Readiness**: make deploying NumisBook turnkey.
The platform decisions were recorded as ADR-012 (Vercel hosting + Neon managed
PostgreSQL + migrations applied from a gated GitHub Actions job), and the in-repo
artifacts that implement them were shipped. No application code, schema, or
dependency changes — deployment reuses the existing env-var configuration and
`drizzle-kit migrate`.

## Hosting & database

Decided (ADR-012):

- **Vercel** for hosting (push-to-`main` production deploys, PR previews;
  zero-config Next.js build). Minimal `vercel.json` pins the framework and region.
- **Neon** serverless PostgreSQL, used unchanged through the existing `pg` +
  Drizzle setup — **pooled** connection for the app runtime, **direct/unpooled**
  connection for migrations.

## Production migration workflow

Implemented:

- A `migrate` job added to `.github/workflows/ci.yml` — runs on push to `main`
  only, `needs: check` (after lint/type-check/test), in a protected `production`
  GitHub Environment, applying `npm run db:migrate` against the
  `MIGRATION_DATABASE_URL` secret (Neon direct endpoint). Activates once that
  secret is set; the additive-migration discipline keeps the parallel
  deploy/migrate safe.

## Configuration & runbook

Implemented:

- `.env.production.example` — non-secret inventory of every production variable
  (required/optional, with sources), flagging that **R2 object storage is
  required in production** (the filesystem fallback does not persist on Vercel).
- `docs/deployment.md` — step-by-step runbook (provision Neon → import to Vercel
  → secrets → first migration → Google OAuth redirect URI / R2 → deploy & verify
  `/api/health` → rollback / break-glass migration).
- Cross-references added to `architecture.md`, `roadmap.md`, and CLAUDE.md.

---

# Phase 11 — Production Deployment

Status: Complete

NumisBook went **live in production**, completing the Production Readiness
milestone. This is the account-bound counterpart to Phase 10's in-repo
scaffolding — the owner actions from `docs/deployment.md`, performed against the
real platforms. No application code, schema, or dependency changes.

## Go-live

Completed (per the runbook, ADR-012):

- **Neon** PostgreSQL provisioned; pooled connection wired to the app
  (`PROD_DATABASE_URL`) and the direct/unpooled connection stored as the
  `MIGRATION_DATABASE_URL` secret in the GitHub `production` environment.
- **Schema migrated** — the committed `drizzle/` migrations applied to Neon
  (initially via a break-glass manual `drizzle-kit migrate` to unblock sign-in,
  then automated through the gated `migrate` job for future changes).
- **Vercel** project imported and deployed (push-to-`main` production deploys).
- **Production secrets** set — `AUTH_*`, the four `R2_*` vars, and the Neon
  pooled URL in Vercel; Google OAuth production redirect URI configured.
- **Verified** — Google sign-in working end to end, `/api/health` returning
  `ok` (app ↔ Neon), and image upload confirming R2.

## Existing data migrated

Implemented:

- A one-off idempotent migration moved the owner's existing collection from the
  local dev database into production: 2 collections, 9 coins, 1 valuation, and
  18 image + 2 bill metadata rows, with `collections.user_id` **remapped** to the
  prod user (looked up by email, since the prod user row has a different id), and
  the 20 referenced image/bill **byte objects** uploaded from local `.storage`
  into R2 under their existing storage keys.

---

# Phase 12 — Settings Foundation

Status: Complete

First pass of the **Additional Settings** milestone: a dedicated `/settings` area
giving signed-in collectors control over their account (see
`docs/decisions/ADR-013-account-settings-and-deletion.md`). Internationalization
and dark mode are deferred to later passes of the milestone.

## Achievements

- **Settings page + navigation** — a new auth-gated `/settings` route, reached
  from a Settings entry in the header's account cluster; card sections for
  Profile, Preferences, and a Danger zone, built entirely on the existing design
  system (a small `.field`/`.alert-ok`/`.danger-zone` addition to `globals.css`,
  no new UI dependency).
- **Profile editing** — collectors can edit their display name (`users.name`,
  previously OAuth-seeded and read-only) via a new app-owned mutation:
  `displayNameSchema` → `userRepository.updateName` →
  `user.service.updateDisplayName` → `PATCH /api/user`. Email stays read-only
  (OAuth-owned).
- **Base currency in Settings** — the existing base-currency preference (ADR-007)
  gets its canonical home on the settings page, reusing `setBaseCurrency`
  unchanged; the `/portfolio` control remains as a convenience.
- **Self-service account deletion** — `DELETE /api/user` →
  `account.service.deleteAccount`: enumerate the user's image/invoice storage
  keys, delete the user row (Postgres cascade removes the full owned graph plus
  Auth.js accounts/sessions), then best-effort purge the object-storage blobs a
  DB cascade cannot reach (logged on failure). Gated behind `<ConfirmButton>`;
  the client signs out on success.
- **Schema-stable** — no migration (`users.name`/`users.baseCurrency` already
  existed); tenant isolation preserved (storage-key enumeration scoped via the
  user's collections). 22 new tests; full suite green (166).

Tracked as GitHub Epic #114 (stories #115–#118).

---

# Phase 13 — Internationalization (Shell)

Status: Complete (shell); deep domain screens tracked as a follow-up

Second pass of the **Additional Settings** milestone: multi-language support for
the app shell, so non-English collectors can use NumisBook in their own language
(see `docs/decisions/ADR-014-internationalization.md`).

## Achievements

- **Dependency-free i18n layer** (`src/lib/i18n/`) — supported-locale set +
  endonyms, an English source catalog that defines the `MessageKey` type, SSR-safe
  locale resolution (user preference → `NEXT_LOCALE` cookie → `Accept-Language` →
  English), and `t()` (server) / `useT()` via a client `LocaleProvider`. No new
  dependency, consistent with the hand-rolled design system.
- **Per-user language preference** — a nullable `users.locale` column
  (migration `0005`, additive) with `userRepository.updateLocale`, a Zod
  `localeSchema`, and `user.service.setLocale`, mirroring the base-currency
  preference. The root layout resolves the active locale from the session user's
  preference first and seeds the client provider (no hydration mismatch).
- **Language selector in Settings** — a Preferences control listing the seven
  languages by endonym; its server action persists the preference, syncs the
  `NEXT_LOCALE` cookie, and revalidates the root layout so the whole app
  re-renders in the chosen language.
- **Seven locales for the shell** — English + Spanish, German, French, Italian,
  Chinese (Simplified), Russian, covering the global chrome (header/nav), home
  dashboard, settings, and the not-found / error / auth-error pages. Catalogs
  merge over English with per-key fallback; a parity test guards completeness.
- **Fonts** — DM Sans/Fraunces cover Latin only, so Russian (Cyrillic) and
  Chinese fall back to system fonts for those scripts (documented MVP tradeoff).
  `global-error` stays English (renders outside the provider).
- **Deep domain screens** (coins/collections/valuations/assistant/analytics) are
  a tracked follow-up extraction using the same machinery; they render in English
  via fallback until then. Full suite green (207 tests).

Tracked as GitHub Epic #120 (stories #121–#125).

---

# Phase 14 — Internationalization (Deep Domain Screens)

Status: Complete

Follow-up pass to Phase 13 that extends i18n coverage from the app shell to the
**deep domain screens**, so a non-English collector sees the whole working app —
not just the chrome — in their language. Mechanical, behaviour-preserving sweep
on the existing machinery; no new architecture (`ADR-014`).

## Achievements

- **Domain screens localized** — all static UI text in the coin, collection,
  valuation, assistant, and analytics surfaces now renders via `t()` / `useT()`:
  `CoinsManager` (+ `ColumnPicker`), `CoinDetailsCard`, `CoinImage`,
  `CoinInvoices`, `CollectionsManager`, `ValuationsManager`, `AssistantWidget`,
  the `TrendChart` / `CostBreakdownChart` / `ExpandChartButton` analytics
  components, and the `collections`, `collections/[id]`, `coins/[id]`, and
  `portfolio` pages.
- **~180 new catalog keys** added to the canonical English catalog, grouped by
  area, with shared `field.*` / `action.*` / `unit.*` keys reused across the
  filters, list columns, forms, and detail tiles. Module-level label constants
  (`COLUMN_DEFS`, `TEXT_FIELDS`, chart `SEGMENTS`, range presets) switched from
  literal `label` strings to typed `MessageKey`s translated at render.
- **Seven locales complete** — Spanish, German, French, Italian, Chinese
  (Simplified) and Russian translations added for every new key; the key-parity
  test stays green for all locales. Assistant suggestion prompts are translated
  so the model receives the question in the user's language (and answers in kind).
- **Behaviour-preserving** — the English UI is visually unchanged; interpolated
  placeholders and pluralization (coin/coins, priced counts) preserved. Full
  suite green (207 tests), `typecheck` / `lint` / `build` clean, and signed-out
  domain pages verified rendering in ES / DE / ZH via the `NEXT_LOCALE` cookie.

Tracked as GitHub Story #126 (under Epic #120).

---

# Phase 15 — Dark Mode (night theme)

Status: Complete

Final pass of the **Additional Settings** milestone: a **day/night theme**, the
last of the milestone's four preferences. It reintroduces a dark scheme that
DDR-001 had deliberately omitted (light-only), so this pass is governed by a new
**DDR-003** that supersedes DDR-001 on that one point.

## Achievements

- **Warm dark token set** — `[data-theme="dark"]` overrides the same design-system
  tokens (a warm near-black stone palette), so every surface, the SVG charts, and
  their legends flip as one. `color-scheme` is set per theme for native controls.
- **Gold-contrast fix (`--on-gold`)** — DDR-001's `--accent` served double duty
  (gold text *and* the background of white-text CTAs), which conflicts on dark.
  A new `--on-gold` token (light `#fff` / dark near-black ink) lets the five gold-
  filled surfaces (`.btn-primary`, `.brand-logo`, `.chat-avatar`, `.chat-send-btn`,
  `.msg-user`) carry dark ink on bright gold in dark mode — AA holds in both
  schemes.
- **Per-user theme preference** — a nullable `users.theme` column (migration
  `0006`, additive), `userRepository.updateTheme`, a Zod `themeSchema`, and
  `user.service.setTheme`, mirroring the locale/base-currency pattern. A `THEME`
  cookie keeps SSR / signed-out visits in sync.
- **Theme selector in Settings** — a Preferences control: **System default /
  Light / Dark**. Its server action persists the preference, syncs the cookie,
  and revalidates the root layout so `<html data-theme>` updates immediately.
- **System-follow, no flash** — the layout renders `data-theme` only for an
  explicit choice and omits it for "system"; a `prefers-color-scheme` CSS block
  then resolves "system" at paint time. No theme script, no FOUC — consistent
  with the dependency-free ethos.
- **Verified** — new `setTheme` service tests + a `resolveTheme` unit test
  (226 tests green); `typecheck` / `lint` / `build` clean; both themes checked in
  the browser (dark palette + AA gold buttons; light pixel-unchanged).

Governed by **DDR-003 (Dark Mode)**, which supersedes DDR-001's light-only
decision. Completes the Additional Settings milestone.

---

# Phase 16 — Dashboard Recent Acquisitions

Status: Complete

The home dashboard showed portfolio tiles and collection shortcuts, and then
stopped — a large empty region below them. This phase fills it with the answer to
the question a collector actually opens the app with: *what did I just buy?*

## Achievements

- **Recent acquisitions across all collections** — a tenant-scoped
  `coin.service.listRecentAcquisitions` read model ordered by `auction_date` (the
  auction a coin came from — the closest thing to an acquisition date; there is no
  dedicated column) with a **`created_at` fallback**, since `auction_date` is
  nullable.
- **Dashboard section** — each row carries the coin's thumbnail, its derived title
  (`formatCoinTitle`), a `category · denomination · metal` chip line, the price
  paid, and the acquisition date; a "View all →" link and an empty state for
  collectors with no coins yet.
- **Prices in the base currency** — each price paid is converted through the FX
  converter into the user's base currency, falling back to the coin's own currency
  when no rate applies, so the list is summable by eye.
- **Density pass** — larger rows, with fewer shown on short viewports.
- i18n strings for all 7 locales; light/dark styling from the existing tokens.

No new decisions were required: the phase composes existing services and the
design system. The home page stays a Server Component with no client manager.

---

# Phase 17 — Rework Filters

Status: Complete

Filtering was not merely thin — it was **structurally confined**. It existed on
exactly one surface (the coin table *inside* a single collection), offered three
single-select controls, and had a clear-all button that did nothing. There was no
cross-collection coin listing at all, which meant the most valuable place to
filter — the whole inventory — did not exist. This phase rebuilt the contract and
gave it a second home. See **ADR-015** and **DDR-005**.

## Filter contract

- **Widened field set** — grade, denomination, mint and a signed **year range**
  (negative = BC, matching the coin form's convention) join metal and category.
  Free-text `q` now also matches denomination, mint and catalogue references.
- **Multi-value semantics** — filters are repeated query params
  (`?metal=Silver&metal=Gold`): **OR within a field, AND across fields**.
- **Defined once** — the query contract lives in `coinSearchParamsSchema` and the
  SQL conditions in `buildCoinConditions`; both coin surfaces compose them, so the
  two cannot drift. Adding a filter is a change in those two places, not per-route.

## Cross-collection coins

- **`GET /api/coins` + `GET /api/coins/facets`** — the user's coins across every
  collection. Coins have no `user_id`, so both scope indirectly through
  `collections.user_id`. **The facets query is scoped identically**: an unscoped
  `SELECT DISTINCT` would have leaked another tenant's mints and denominations
  through a filter dropdown — the milestone's highest-severity risk, and the one
  verified most carefully.
- **`/coins`** — a read-only **All coins** view, a top-level nav sibling of
  Collections (coins are created *inside* a collection, so there is no sensible
  answer to "which collection?" from a cross-collection view). The dashboard's
  "View all →" repoints to it.
- **Composite index** `coins (collection_id, created_at DESC)` for the default
  listing (migration `0007`).

## Filter bar

- One `CoinFilters` component serves both surfaces: **multi-select facet popovers**
  (metal, category, denomination, mint), **grade toggle chips** rendered in scale
  order, two signed year inputs with a live `300 BC – 100 AD` hint, an
  **active-filter chip row** with per-value removal, and a clear-all that finally
  works (DDR-005).

## Accessibility correction

- Validation found a real **WCAG AA contrast failure**, and it was a *token
  contract* bug rather than a component bug: `--accent` had only ever been measured
  on white, but the filter bar is the first UI to place gold text on the gold tint
  **outside a card**, where `--accent-weak` composites over the stone `--bg` and the
  pairing falls to 4.2:1. Light-mode `--accent` was deepened to **`#7f5612`**
  (4.8:1 on the tint, 6.5:1 on white); dark mode already passed. Recorded as
  **DDR-005 §7**, amending DDR-001.
- The defect was invisible to lint, type-check and 263 unit tests — it required
  rendering the page. An axe check in CI is on the technical backlog as a result.

## Deferred (ADR-015)

`pg_trgm` / indexed substring search (the `ILIKE` only ever scans one tenant's
rows — revisit with a measurement, not pre-emptively), price-paid range filtering
(needs FX semantics; belongs with valuation analytics), URL-synced shareable
filter state, and filters on the portfolio/collections views.

---

# Phase 18 — Mobile-Responsive UI

Status: Complete

The app was built for a desktop viewport and degraded badly below it. Responsiveness
had never been designed — it accreted: `globals.css` carried eight ad-hoc
`max-width` breakpoints (400, 480, 540, 640, 768, 860, 900, 1160) plus a 1280/1600
pair, each added to rescue one component. See **DDR-006**.

## The root cause

The fix was not a missing breakpoint. Measuring a 390px phone under the root
`zoom: 0.75` (DDR-002) showed the layout width was **520px** and `@media
(max-width: 400px)` still *matched*: **media queries evaluate against the real
viewport, while every box lays out in a nominal space 1.333× larger.** A rule
written as `max-width: 640px` fired when the layout had 853 nominal px of room. No
breakpoint in the file had ever meant what its author intended — which is precisely
why each new one was hand-tuned against one component and generalised to nothing.

Nominal 16px body text also painted at 12px, and 44px touch targets at 33px.

## What shipped

- **Viewport-aware density** — `zoom: 0.75` now applies to **desktop only**
  (≥ 1025px); phones and tablets render at 100%. Below the boundary the two
  coordinate spaces coincide, so the breakpoints finally mean what they say.
  Amends DDR-002; desktop rendering is unchanged.
- **A three-stop breakpoint scale** — phone (≤ 640), tablet (≤ 1024), desktop, plus
  a single wide (≥ 1440) enhancement tier — replacing all ten ad-hoc values.
- **The coin list as cards on a phone** — the *same* table DOM restyled, so the
  user's `ColState` still decides which attributes show (the two forms cannot
  drift), thumbnails are fetched once, and there is no client breakpoint check to
  desync from the server render. Valueless cells vanish on a card and keep their
  em-dash in the table. A sort `<select>` replaces the hidden sortable headers.
- **A touch filter bar** — facet popovers expand the bar in place instead of
  floating (no collision detection needed at phone width), 44px rows.
- **Responsive shell and charts** — horizontally scrolling nav strip, stacked
  analytics grid, single-column card grids, and a cost-breakdown chart showing
  **3 coins** across on a phone (5 on desktop) with slot-derived thumbnails.

## Two latent bugs the density change exposed

- **The coin-detail rail overflowed a phone by 146px.** `.coin-side`'s base
  `flex: 0 0 520px` was declared *after* its own responsive override at equal
  specificity — the override had always been dead code. Invisible on desktop, where
  the zoomed layout was wide enough to hide a 520px rail.
- **The chart plots were not keyboard-scrollable** (axe `scrollable-region-focusable`,
  serious) — a pre-existing WCAG 2.1.1 failure on desktop too.

Both were found by rendering the page, not by the gates. Validated with **30 axe
scans** (5 pages × 2 colour schemes × 3 viewports): zero violations. See
`docs/testing/mobile-responsive-ui-testing-report.md`.

---

# Major Architectural Decisions

See:

- `docs/decisions/ADR-001-nextjs-monolith.md`
- `docs/decisions/ADR-002-drizzle-over-prisma.md`
- `docs/decisions/ADR-003-authjs-google-oauth.md`
- `docs/decisions/ADR-004-s3-storage-abstraction.md`
- `docs/decisions/ADR-005-cloudflare-r2-initial-provider.md`
- `docs/decisions/ADR-006-coin-and-valuation-attribute-rework.md`
- `docs/decisions/ADR-007-portfolio-analytics-upgrade.md`
- `docs/decisions/ADR-008-ui-embellishment.md`
- `docs/decisions/ADR-009-ux-and-feature-refinement.md`
- `docs/decisions/ADR-010-ci-pipeline-github-actions.md`
- `docs/decisions/ADR-011-observability.md`
- `docs/decisions/ADR-012-production-deployment.md`
- `docs/decisions/ADR-013-account-settings-and-deletion.md`
- `docs/decisions/ADR-014-internationalization.md`
- `docs/decisions/ADR-015-coin-filter-rework.md`

# Design Decisions

See:

- `docs/design-decisions/DDR-001-figma-ui-redesign.md` — Figma "stone & gold"
  re-skin (Phase 8; visual-only; originally an ADR, relocated to the Design
  Decisions). Its **light-only** stance is superseded by DDR-003.
- `docs/design-decisions/DDR-002-global-display-density.md` — global `zoom: 0.75`
  on `html` (renders the whole app at 75% density; builds on DDR-001). Its scope is
  **amended by DDR-006**: the scale is now desktop-only.
- `docs/design-decisions/DDR-003-dark-mode.md` — warm dark theme + per-user
  Light/Dark/System preference (Phase 15; supersedes DDR-001's light-only point)
- `docs/design-decisions/DDR-004-theme-toggle.md` — binary sun/moon theme toggle
  in Settings, replacing the three-option `<select>` (amends DDR-003 §3)
- `docs/design-decisions/DDR-005-filter-bar-pattern.md` — filter bar pattern
  (facet popovers, grade chips, active-filter chip row) and Coins as a top-level
  nav destination (Phase 17). §7 **amends DDR-001**: light-mode `--accent`
  deepened to `#7f5612`, which failed AA as text on its own tint off-card
- `docs/design-decisions/DDR-006-responsive-layout.md` — responsive layout
  (Phase 18): a three-stop breakpoint scale, viewport-aware density, and the
  per-surface mobile forms (coin-list cards, touch filter bar). **Amends DDR-002**:
  `zoom: 0.75` applies to desktop only

---

# Current Architecture Snapshot

Current stack:

## Frontend

- Next.js App Router
- React
- TypeScript
- Dependency-free CSS design system (`src/app/globals.css`; no Tailwind/CSS-in-JS) —
  "stone & gold" theme with light + dark token sets, `next/font` typography
  (DDR-001; dark mode DDR-003)

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