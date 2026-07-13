# NumisBook — Roadmap

> Guiding principle (from `CLAUDE.md`):
>
> **Build the MVP before introducing advanced automation or optimization.**

---

# Vision

NumisBook aims to become a collector-focused operating system for managing, researching, valuing, and tracking coin collections.

Core pillars:

- Collection management
- Valuation tracking
- Market awareness
- AI-assisted research

The MVP focuses on collection management and valuation tracking before introducing advanced automation and intelligence features.

---

# Current Status

Current maturity: **Live in production — active milestone: Hosted Error Monitoring**

The core collection-management platform is functionally complete, the coin and
valuation data models have been reformed (see `history.md` Phase 5), the
**Portfolio Analytics Upgrade** is complete — portfolio figures are
multi-currency aware, with gain/loss, deeper allocation, per-collection
comparison, and an SVG trend chart (see `history.md` Phase 6 and
`docs/decisions/ADR-007-portfolio-analytics-upgrade.md`) — the **Embellishment**
milestone has shipped (see `history.md` Phase 7 and
`docs/decisions/ADR-008-ui-embellishment.md`), the **Figma UI Redesign** has
shipped: the app is re-skinned to the agreed "stone & gold" look via the
dependency-free `globals.css` system, light-only, with `next/font` typography
(see `history.md` Phase 8 and `docs/design-decisions/DDR-001-figma-ui-redesign.md`), and
the **UX & Feature Refinement** milestone has shipped: tax added to the
price-paid partition (ordered tax-before-shipping app-wide), AD/BC era suffixes,
reordered coin-detail chips, a collections card grid (large cards, prominent
cover, centred info panel), a scrollable ~5-coin cost-breakdown chart with the
per-segment split in a hover tooltip, hover tooltips + expand controls on both
portfolio charts, and per-coin **invoices** (PDF receipts) (see `history.md` Phase 9
and `docs/decisions/ADR-009-ux-and-feature-refinement.md`). **Production
Readiness** has now shipped: NumisBook is **live in production** — deployed on
Vercel against Neon, schema applied via the gated `migrate` job, Google sign-in
working and `/api/health` green, with CI/CD, observability, and auth resilience
in place (see `history.md` Phases 10–11 and ADR-010/011/012). The **Additional
Settings** milestone has shipped (see `history.md` Phases 12–15): a dedicated
`/settings` area with profile editing, self-service account deletion, and the
base-currency preference (Phase 12, ADR-013); **internationalization** across the
full interface (Phases 13–14, ADR-014); and **dark mode** — a warm night theme
with a per-user Light / Dark / System preference (Phase 15, DDR-003). The
**Dashboard Recent Acquisitions** milestone has now shipped: the home dashboard
surfaces the user's most recently acquired coins across all collections below the
overview cards — each row with a thumbnail, derived title, category · denomination ·
metal chips, the price paid, and the acquisition date (`auction_date` with a
`created_at` fallback), plus a "View all →" link and an empty state. The
**Rework Filters** milestone has now shipped: coin filtering is multi-value
(OR within a field, AND across fields) across a widened set — grade,
denomination, mint and a signed year range join metal and category — and the
same filter bar now serves a new cross-collection **All coins** view at `/coins`
(read-only, a top-level nav destination), tenant-scoped through the user's
collection ids. Validation of the milestone also corrected a WCAG AA contrast
failure in the light theme's gold text token (see ADR-015, DDR-005 and
`docs/testing/rework-filters-testing-report.md`). The active milestone is now
**Hosted Error Monitoring**.

Primary objective:

**Turn production errors into proactive, aggregated alerting** by wiring a
hosted monitor onto the existing `ErrorReporter` seam.

Current priorities:

- Production readiness — ✅ complete (live in production)
- Additional settings — ✅ complete (settings area, i18n, dark mode)
- Dashboard recent acquisitions — ✅ complete
- Rework filters — ✅ complete
- Hosted error monitoring (active)
- (then) valuation-based analytics

---

# Shipped Milestone — Dashboard Recent Acquisitions

> ✅ Shipped. Retained here for reference until reconstructed into `history.md`.

Goal:

Fill the empty space on the home dashboard with a **Recent acquisitions** list —
the most recently acquired coins across **all** of the user's collections, shown
below the existing overview cards (see the mock in
`docs/main-dashboard-example.png`).

Each row shows the coin's thumbnail, its derived title (`formatCoinTitle`), a
`category · denomination · metal` chip line, the price paid (in the coin's
currency), and the acquisition date, ordered most-recent first. A "View all →"
link leads to the full coin listing.

Acquisition date maps to the existing `coins.auction_date` column (the auction a
coin was obtained from — no dedicated acquisition-date field exists). It is
**nullable**, so ordering must fall back to `created_at` when it is absent, and
rows should render gracefully when no date is known.

## Features

- [x] Repository/service query for the user's most recent acquisitions across
      all collections (tenant-scoped; ordered by `auction_date` with a
      `created_at` fallback)
- [x] Home dashboard "Recent acquisitions" section below the overview cards
- [x] Per-row: thumbnail, derived title, category · denomination · metal chips,
      price paid, acquisition date
- [x] "View all →" link to the coin listing
- [x] Empty state when the user has no coins yet
- [x] i18n strings + light/dark styling consistent with the design system

---

# Shipped Milestone — Rework Filters

> ✅ Shipped. Retained here for reference until reconstructed into `history.md`.

Goal:

Revisit and adjust all filtering across NumisBook so the available filters are
consistent, complete, and useful — building on today's coin search/filter set
(`q`, `metal`, `category`, `year`, sort by category/metal/denomination/year/
createdAt; facets endpoint — see `CLAUDE.md` "Coin search and filtering").

Planning is complete (Product / UI / Architecture / Database reviews). The
approved scope is recorded in `docs/decisions/ADR-015-coin-filter-rework.md` and
`docs/design-decisions/DDR-005-filter-bar-pattern.md`.

The audit found that filtering is not merely thin but structurally confined:
it exists on exactly **one** surface (the coin table inside a single collection).
There is no cross-collection coin listing at all — so the milestone now includes
building one, since the most valuable place to filter is the whole inventory.

## Features

- [x] Audit existing filters and identify gaps/inconsistencies
- [x] Composite index `coins (collection_id, created_at DESC)` for the default
      listing (Database Review) — migration `0007`
- [x] Widen the coin filter set: grade, year **range** (signed; negative = BC),
      denomination, mint — and broaden free-text `q` to also match denomination,
      mint, and catalogue references
- [x] Cross-collection coin search + facets (`GET /api/coins`,
      `GET /api/coins/facets`) — tenant-scoped indirectly via the user's
      collection ids
- [x] Multi-select facet filters (OR within a field, AND across fields), with
      active-filter chips and a working clear-all
- [x] Global **All coins** view at `/coins` (read-only), added to the header nav;
      the dashboard's "View all →" repoints to it
- [x] A11y fix found in validation: light-mode `--accent` deepened to `#7f5612`
      — gold text on its own tint failed WCAG AA off-card (DDR-005 §7, amends
      DDR-001)

## Explicitly deferred

- **Price-paid range filtering** — a coin's price is stored in its own currency,
  so "under €500" across a mixed-currency inventory needs FX conversion at a
  chosen rate. That is analytics-grade semantics; it belongs with the
  valuation-based analytics milestone, where the currency question is answered
  properly.
- **URL-synced filter state** — filters stay component-local for now, so filtered
  views are not shareable or bookmarkable (product decision).
- **`pg_trgm` / indexed substring search** — the broadened `ILIKE` only ever runs
  against one tenant's rows; revisit with a measurement rather than adopting a
  Postgres extension pre-emptively (ADR-015).
- Filters on the **portfolio** and **collections** views; filter-aware facet
  counts; saved filter presets.

---

# Active Milestone — Hosted Error Monitoring

Goal:

Turn production errors from a pull-based log stream into proactive,
aggregated alerting.

Today the `ErrorReporter` seam (`src/lib/observability`) only logs; finding a
production error means grepping the deploy platform's runtime logs by `errorId`,
with no grouping, retention, or alerts (see `ADR-011`). This milestone wires a
hosted monitor onto that seam — a change confined to
`src/lib/observability/index.ts`, leaving all call sites untouched.

## Features

- [ ] Add the Sentry SDK (`@sentry/nextjs`) and provision a project/DSN
- [ ] Implement a Sentry-backed `ErrorReporter` behind the existing seam
- [ ] Forward the generated `errorId` to Sentry as a correlation tag
- [ ] Configure environment, release tagging, and PII scrubbing
- [ ] Set up alerting rules / notification channels
- [ ] Document the setup in an ADR (extends or supersedes ADR-011)

---

# Future Milestone — Valuation-Based Analytics

Goal:

Layer market value on top of the price-paid analytics once valuation tracking is
mature.

## Features

- [ ] Current value from latest valuations (in the base currency)
- [ ] Gain/loss vs. price paid (absolute + %), portfolio and per collection
- [ ] Performance indicators and value-over-time (market) trend

---

# Future Milestone — Collector Experience

Goal:

Improve collection management and portability.

## Features

> Multi-currency portfolio support and base-currency preferences were pulled
> forward into the **Portfolio Analytics Upgrade** milestone — analytics figures
> are only meaningful once all values share a single currency.
>
> User profile/account settings were pulled forward into the **Additional
> Settings** milestone.

- [ ] CSV export
- [ ] CSV import
- [ ] Collection backup and recovery

---

# Future Milestone — Market Intelligence

Goal:

Help collectors understand market value and opportunities.

## Features

- [ ] Auction monitoring
- [ ] Auction alerts
- [ ] Market price tracking
- [ ] Market trend analysis
- [ ] Watchlists

---

# Future Milestone — Assistant Hardening

Goal:

Make the collection assistant production-grade once the platform is deployed.

## Features

- [ ] Streaming responses
- [ ] Rate limiting
- [ ] Cost controls
- [ ] Conversation limits

---

# Future Milestone — AI Research Assistant

Goal:

Transform NumisBook into an intelligent collecting assistant.

## Features

- [ ] Coin identification
- [ ] AI-assisted valuation suggestions
- [ ] Auction analysis
- [ ] Collection insights
- [ ] Research workflows
- [ ] Image-based coin recognition

---

# Technical Backlog

## Product Documentation

### Complete product.md

**Problem**

Product positioning and user segmentation remain incomplete.

**Fix**

- Define user personas
- Define pricing assumptions
- Define long-term product strategy

---

## Tooling

### Automated accessibility checks in CI

**Problem**

The Rework Filters milestone's only serious defect — a WCAG AA contrast failure
in the light theme — was invisible to lint, type-check and 263 unit tests. It
required rendering the page, which nothing in CI does (there is no DOM test
environment; `vitest.config.ts` runs `environment: "node"`).

**Fix**

- Evaluate an axe pass over the key pages in CI (headless browser + `@axe-core`),
  in both colour schemes.

### Filter facet popovers: type-to-filter

**Problem**

Facet lists are unbounded on `/coins` — fine at 6 mints, unpleasant at 60
(DDR-005 risk).

**Fix**

- Add a type-to-filter box inside the facet popover.

### Migrate off deprecated next lint

**Problem**

`next lint` will be removed in Next.js 16.

**Fix**

- Migrate to the ESLint CLI

---

## Internationalization

### Translation quality review

**Problem**

The shipped non-English catalogs (`es`, `de`, `fr`, `it`, `zh`, `ru`) are
MVP machine-quality with English per-key fallback; they have not had native
review.

**Fix**

- Have each locale reviewed by a native/fluent speaker before any
  language-targeted marketing.

### CJK / Cyrillic web font

**Problem**

DM Sans / Fraunces (the `next/font` families) cover Latin only, so Russian
(Cyrillic) and Chinese currently fall back to system fonts for those scripts —
inconsistent typography across platforms (ADR-014).

**Fix**

- Evaluate adding a CJK/Cyrillic-capable web font behind the existing
  `next/font` setup if consistent rendering becomes a priority.

---

# Out of Scope

The following are not currently planned:

- Marketplace / user-to-user trading
- Native mobile applications

---

# Related Documentation

- `history.md`
- `product.md`
- `architecture.md`
- `database.md`
- `docs/decisions/*`
