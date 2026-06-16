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

Current maturity: **Pre-deployment — Figma UI Redesign**

The core collection-management platform is functionally complete, the coin and
valuation data models have been reformed (see `history.md` Phase 5), the
**Portfolio Analytics Upgrade** is complete — portfolio figures are
multi-currency aware, with gain/loss, deeper allocation, per-collection
comparison, and an SVG trend chart (see `history.md` Phase 6 and
`docs/decisions/007-portfolio-analytics-upgrade.md`) — and the **Embellishment**
milestone has shipped: the MVP features and UI were polished against the final
data shape (see `history.md` Phase 7 and
`docs/decisions/008-derived-overview-aggregates.md`). The next milestone is the
**Figma UI Redesign**: re-skinning the app to the agreed "stone & gold" spec.

Primary objective:

**Re-skin the existing app to the agreed Figma design without changing the
routes, data model, or API, then prepare for production deployment.**

Current priorities:

- UI redesign to the Figma spec (next)
- (then) production readiness

---

# Next Milestone — Figma UI Redesign

Goal:

Re-skin the existing app to the agreed **Figma design**
([Coin Collection Management SaaS](https://www.figma.com/make/3whQq5SMmW1rjEn4ZwOc0G/Coin-Collection-Management-SaaS)) —
a warm, editorial "stone & gold" look with serif display type. This is a
**visual** redesign only: the App-Router routes, the `app → services →
repositories → db` flow, the data model (derived coin title, price-paid +
valuations, multi-currency base currency), and the API stay as they are. Every
screen the Figma covers already exists in the app.

The Figma source is built in Tailwind + shadcn/ui + recharts + lucide-react.
**We do not adopt that stack.** Per `CLAUDE.md` / the design-system rules, we
translate its *visual language* into the existing dependency-free
`globals.css` system and keep the dependency-free SVG charts
(`analytics/TrendChart`, `analytics/CostBreakdownChart`). The Figma's code is a
reference for look-and-feel and tokens, not a component library to import.

## Design Tokens & Foundations

Re-map `globals.css` theme tokens to the Figma variables:

- [ ] Palette — background `#ECEAE5` (warm stone), foreground `#1C1917`, card
      `#FFFFFF`, **primary/accent `#B8871E` (gold)**, muted `#F4F1EC` /
      muted-foreground `#78716C`, destructive `#DC2626`, border
      `rgba(28,25,23,0.10)`, focus ring `rgba(184,135,30,0.35)`
- [ ] Chart palette — `#B8871E`, `#5A8A6A`, `#4A7A9B`, `#8A4A3A`, `#6A4A8A`
- [ ] Radii — base `0.625rem` (10px) with sm/md/lg/xl steps; cards use ~`xl`
- [ ] **Typography** — add web fonts: **Fraunces** (serif) for `h1–h3` /
      display numerals at weight ~400/`font-light`, **DM Sans** for body/UI,
      **DM Mono** for the uppercase letter-spaced micro-labels (stat captions,
      table headers, filter chips). Self-host or load efficiently.
- [ ] **Dark mode decision** — the Figma is light-only (its `.dark` tokens
      duplicate light). The app currently themes via `prefers-color-scheme`;
      decide whether to derive a proper dark variant or drop dark mode. The
      accessibility pass below must still pass in whatever schemes ship.

## Shared Shell & Primitives

- [ ] `SiteHeader` — sticky 56px bar, max-width 1200px; gold circular "N" logo +
      Fraunces wordmark; minimal nav (Collections, Portfolio) with active-state
      pill; "Sign out" with icon
- [ ] Buttons — primary (gold, subtle shadow), outline, ghost, and danger
      variants; sizes sm/md
- [ ] Inputs / search fields, filter **chips/tags** (active = gold-tint bg +
      gold border + gold text), and **breadcrumbs** (chevron separators,
      gold links)
- [ ] Card / table shells — white cards, hairline borders, rounded-xl; tables as
      bordered grids with mono uppercase headers, row hover, and actions that
      reveal on hover (keep keyboard/focus access — not hover-only)
- [ ] Icon set — adopt a lightweight icon approach consistent with the Figma
      (lucide-style line icons); keep `.sr-only` labels on icon-only controls

## Screen-by-Screen Re-skin

Map each Figma screen onto its existing manager/route:

- [ ] **Home dashboard** (`/`) — Fraunces hero, three stat cards (Collections,
      Coins, Total paid · base currency) with mono captions + big serif
      numerals, and two feature cards (Collections, Portfolio) with icon tiles
- [ ] **Collections** (`CollectionsManager`) — filter field + "New collection";
      card-wrapped table with Name / Coins / Paid columns and inline
      rename + delete (delete via `ConfirmButton`, not the Figma's bare button)
- [ ] **Collection detail / coin list** (`CoinsManager`) — search + category
      chips + filter toggles toolbar, result count, and the card table with
      **dual obverse/reverse thumbnails**, derived coin title
      (`formatCoinTitle`) as the gold link, attributes, and paid column
- [ ] **Coin detail** (`CoinDetailsCard` / `CoinImage`) — two-column layout:
      left = title + attribute tiles + Description/Provenance/Notes/References
      cards + valuations table; right = large square image with
      obverse/reverse toggle + thumbnail carousel. Keep edit + remove
      (`ConfirmButton`). Respect the real image API (carousel, not a fixed
      two-sided model)
- [ ] **Valuations** (`ValuationsManager`) — restyle to the card/table +
      mono-label language (no direct Figma frame; follow the system)
- [ ] **Portfolio** (`/portfolio`) — total-paid header stat card (with
      hammer/ECB note), then two side-by-side chart cards: acquisition cost
      over time (gold gradient area) and cost breakdown (stacked bars), each
      with 3M/6M/1Y/All presets and category filters. Re-skin the **existing
      SVG charts** to the gold/stone palette + DM Mono axis labels — do not pull
      in recharts
- [ ] **Assistant** (`AssistantWidget`) — floating bottom-right widget: dark
      (`#1C1917`) header with gold Sparkles avatar + online dot, message
      bubbles (user = gold), starter suggestion chips, gold send button, and an
      "N" toggle FAB

## Quality Gates

- [ ] Visual parity review against the Figma frames (per screen)
- [ ] Preserve accessibility conventions (WCAG AA contrast — re-verify gold-on-
      white and the new tokens; `:focus-visible`, skip-to-content,
      `prefers-reduced-motion`, `.sr-only`, `.table-wrap`) — **axe-clean in
      every scheme that ships**
- [ ] Responsive behaviour verified at mobile / tablet / desktop
- [ ] No new UI dependency added (no Tailwind / shadcn / recharts / CSS-in-JS);
      changes stay within `globals.css` + existing components
- [ ] Data-model integrity preserved — derived titles, price-paid + valuations,
      and base-currency conversion render correctly under the new skin

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