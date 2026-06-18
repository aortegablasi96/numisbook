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

Current maturity: **Pre-deployment — Production Readiness**

The core collection-management platform is functionally complete, the coin and
valuation data models have been reformed (see `history.md` Phase 5), the
**Portfolio Analytics Upgrade** is complete — portfolio figures are
multi-currency aware, with gain/loss, deeper allocation, per-collection
comparison, and an SVG trend chart (see `history.md` Phase 6 and
`docs/decisions/007-portfolio-analytics-upgrade.md`) — the **Embellishment**
milestone has shipped (see `history.md` Phase 7 and
`docs/decisions/008-ui-embellishment.md`), and the **Figma UI Redesign** has
shipped: the app is re-skinned to the agreed "stone & gold" look via the
dependency-free `globals.css` system, light-only, with `next/font` typography
(see `history.md` Phase 8 and `docs/decisions/009-figma-ui-redesign.md`). The
next milestone is **Production Readiness**.

Primary objective:

**Prepare NumisBook for production deployment (hosting, managed Postgres, CI/CD,
observability).**

Current priorities:

- Production readiness (next)
- (then) valuation-based analytics

---

# Completed Milestone — Figma UI Redesign

Status: **Complete** — see `history.md` Phase 8 and
`docs/decisions/009-figma-ui-redesign.md`.

The app was re-skinned to the agreed **Figma** "stone & gold" design
([Coin Collection Management SaaS](https://www.figma.com/make/3whQq5SMmW1rjEn4ZwOc0G/Coin-Collection-Management-SaaS))
by re-mapping the dependency-free `globals.css` token/utility system — no
Tailwind/shadcn/recharts adopted, and the SVG charts (`TrendChart`,
`CostBreakdownChart`) were re-skinned in place. Routes, services, repositories,
API, and the data model were unchanged.

Delivered:

- [x] Tokens re-mapped to the stone & gold palette, radii, and chart colours
- [x] Typography via `next/font` — Fraunces (display), DM Sans (body), DM Mono
      (the `.mono-label` micro-labels)
- [x] **Dark mode dropped — light-only** (the Figma defines no real dark variant;
      ADR-009 §3)
- [x] Shell + primitives — `SiteHeader` (gold "N" logo, Fraunces wordmark,
      active-pill `HeaderNav`, icon sign-out), gold buttons, `.chip` filter tags,
      chevron breadcrumbs, rounded-xl cards, mono-header tables
- [x] Every screen re-skinned — dashboard, collections, coin list (dual
      thumbnails), coin detail, portfolio (gold/stone SVG charts), assistant
      (dark header, gold bubbles)
- [x] Quality gates — **axe-clean (WCAG 2.1 AA) in the shipped light scheme**;
      responsive at mobile/desktop; no new UI dependency; data-model integrity
      preserved. Gold-on-white was resolved per ADR-009 §4 (fills keep the bright
      gold; text uses a deeper gold / ink-on-gold; muted darkened).
- [x] **Design-system consolidation & spacing pass** (ADR-009 addendum) — the
      ad-hoc styling was hardened into explicit token scales (4px **spacing**,
      **elevation** `--shadow-sm…xl`, **motion** easing/durations) applied across
      every screen, plus the coin-detail **attribute-tile grid** and the remaining
      spacing fixes (dashboard `auto-fit` grid, coin-list title column absorbing
      slack, normalised card padding, Figma page rhythm, thin scrollbar, portfolio
      total-paid spacing). UI layer only — logic untouched.
- [x] **Layout matched to the Figma** (ADR-009 addendum, 2026-06-17) — the centred
      `max-width:1320px` container was replaced with the Figma's **full-width shell
      + flat 48px gutters**, and the dashboard restructured to the Figma's block
      layout (header `mb-32` → stats `gap-16 mb-24` → features `gap-16`), fixing a
      `margin:0` override that had collapsed the gap between the stat and feature
      rows. Also: Figma stat-card icons, solid header (no blur), money stat sized
      down, coin-detail `360px` image rail (`gap-40`), portfolio chart `gap-20`,
      and the Figma's `Pencil`/`Trash2` rename/delete glyphs on the collection and
      coin list rows (shared dependency-free `components/ui/icons.tsx`). Shell
      geometry + icons only; values verified pixel-for-pixel via Playwright at
      desktop and mobile.
- [x] **Coin-detail rail, header & page spacing polish** (ADR-009 addendum,
      2026-06-18) — a post-redesign refinement pass (final state after several
      Figma comparison rounds). Coin-detail (`/coins/[id]`): the photo fills its
      rounded square (`object-fit: cover`), the prev/next carousel became a
      **selectable thumbnail gallery** with a "Picture N of M" caption (no
      obverse/reverse), the two-column split is full-width flexbox (`flex: 1` left
      + a **520px** image rail, 52px gap, stacking below 1160px), the title is
      **30px**, the edit pencil is a borderless **20px** icon that bolds (not
      highlights) on hover, and the key-attribute tiles are a larger **4-column**
      grid (stepping to 3/2/1 on narrower viewports). App-wide: the header bar is
      **84px** tall with a larger
      wordmark/nav, and the page gutter (`.container`) is viewport-scaled
      `clamp(2rem, 2.6vw, 5.5rem)` (32px on small screens, ~88px on large). UI
      layer only; verified via Playwright.
- [x] **Portfolio page alignment** (ADR-009 addendum, 2026-06-18) — `/portfolio`
      restructured to the Figma's block layout: a single **"Total paid" summary
      card** (mono caption + base-currency control on one header row, large serif
      total inline with the hammer/ECB note, `N of M coins priced` mono line
      below), the priced-count moved out of the page header into the card, and the
      base-currency form relocated from a dominant top-of-page row into the card
      header. The two-up charts row is unchanged and the **coin thumbnails are
      kept on the cost-breakdown columns**. UI layer only; verified via Playwright
      at desktop and mobile.
- [x] **Scrollable portfolio charts + hover tooltip** (ADR-009 addendum,
      2026-06-18) — both portfolio SVG charts reworked (still dependency-free, no
      recharts): one **fixed equal height**, a **horizontally scrollable** plot
      (fixed slot per coin/point) so a long history scrolls instead of squeezing,
      a **frozen y-axis** whose cost labels stay visible while scrolling, a
      **floating per-coin tooltip** on the cost-breakdown columns (Figma
      `BreakdownTooltip`), and the coin thumbnails now always crowning their
      columns. The summary card's "converted to … using ECB rates" clause was
      dropped. Shared `chart-layout.ts` (constants + `useMeasuredWidth`). UI layer
      only; verified via Playwright.
- [x] **Taller charts, trimmed trend filters, compact slots** (ADR-009 addendum,
      2026-06-18) — both portfolio charts now fill the viewport height via a shared
      `useChartHeight()` hook (`clamp(innerHeight − chrome, 360, 820)`, equal-height
      on resize) instead of the short fixed 280px; the "Acquisition cost over time"
      chart's per-dimension filters were removed, leaving only the 3M/6M/1Y/All
      range presets (dead `.filters` CSS removed); and the per-element `SLOT`
      narrowed 76→56px so columns/points sit closer and overflow scrolls
      horizontally. UI layer only; tsc/lint/121 tests pass, Playwright-verified.
- [x] **Chart legibility + true equal-height alignment** (ADR-009 addendum,
      2026-06-18, ui-designer pass) — fixed the real height mismatch (the
      breakdown card's extra legend row left it 41px taller) by giving the trend
      card a matching caption row, so both cards align exactly (681px, equal tops/
      bottoms/plot tops); enlarged the cost-breakdown coin thumbnails (44→64px),
      columns/bars (`SLOT` 56→92px), and in-bar/axis text for legibility; and
      bumped the chart titles to a 1.25rem `.chart-title`. Horizontal scroll
      preserved for overflow. UI layer only; tsc/lint/121 tests pass,
      Playwright-verified.
- [x] **Denser portfolio header + larger breakdown coins** (ADR-009 addendum,
      2026-06-18) — collapsed the "Total paid" summary hero to a single line
      (caption + total + merged note inline, base-currency control right),
      tightened the page top margin via a scoped `.portfolio-page` class
      (`--space-10`→`--space-6`), and enlarged the cost-breakdown coin thumbnails
      (64→80px) while compacting the bars (`SLOT` 92→88px, wider bars → ~25px
      inter-bar gap). Equal-height alignment preserved. UI layer only; tsc/lint/121
      tests pass, Playwright-verified.
- [x] **Fit the portfolio to the viewport** (ADR-009 addendum, 2026-06-18) —
      shortened both charts so the whole page fits on screen without scrolling
      (`useChartHeight` chrome 360→472, min/max 320/760; the page overran the
      viewport by a constant ~98px), nudged the title up
      (`.portfolio-page` `--space-6`→`--space-4`), and enlarged the breakdown coin
      thumbnails again (80→88px, `SLOT` 88→94px). Charts stay equal height. UI
      layer only; tsc/lint/121 tests pass, Playwright-verified at 900/940/1080px.

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

# Future Milestone — Production Readiness

Goal:

Prepare NumisBook for deployment and usage by real collectors.

## Deployment

- [ ] Deploy to Vercel
- [ ] Configure managed PostgreSQL
- [ ] Configure production secrets
- [ ] Production migration workflow

## CI/CD

- [ ] GitHub Actions
- [ ] Lint checks
- [ ] Type-checking
- [ ] Automated tests

## Observability

- [ ] Structured logging
- [ ] Error monitoring
- [ ] Production diagnostics

## Assistant Hardening

- [ ] Streaming responses
- [ ] Rate limiting
- [ ] Cost controls
- [ ] Conversation limits

## Authentication Resilience

- [ ] Graceful auth error page
- [ ] Database outage handling

---

# Future Milestone — Collector Experience

Goal:

Improve collection management and portability.

## Features

> Multi-currency portfolio support and base-currency preferences were pulled
> forward into the **Portfolio Analytics Upgrade** milestone — analytics figures
> are only meaningful once all values share a single currency.

- [ ] User profile/account settings
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

### Migrate off deprecated next lint

**Problem**

`next lint` will be removed in Next.js 16.

**Fix**

- Migrate to the ESLint CLI

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