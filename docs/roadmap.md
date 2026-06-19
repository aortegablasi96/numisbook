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
dependency-free `globals.css` system, light-only, with `next/font` typography,
including the post-redesign coin-detail and portfolio polish (see `history.md`
Phase 8 and `docs/decisions/009-figma-ui-redesign.md`). The current milestone is
**UX & Feature Refinement** — a focused round of UI refinements and supporting
back-end changes ahead of production readiness.

Primary objective:

**Refine everyday UX across coin detail and the portfolio, with the back-end
changes those refinements require.**

Current priorities:

- UX & feature refinement (current)
- (then) production readiness
- (then) valuation-based analytics

---

# Current Milestone — UX & Feature Refinement

Goal:

Improve everyday UX through targeted UI refinements and the supporting back-end
changes they require. No new domains — refinement across the coin and portfolio
slices.

## Back-end

- [ ] Add **tax costs** to the price-paid partition — a new component alongside
      hammer / premium / shipping that is included in the computed `final_price`
      (schema → repository → service → coin edit form)

## Coin detail

- [ ] Rework the **attribute chips order** on the coin detail page. The order should be:
      1. Category
      2. Metal
      3. Denomination
      4. Condition
      5. Weight
      6. Diameter
      7. Mint
      8. Year
- [ ] Show the **`AD` era suffix for positive years** (it currently appears only
      for `BC`). A negative year keeps `BC`, a positive year gains `AD`, and a
      range spanning the divide shows both ends — e.g. -5 to +5 renders as
      `5 BC – 5 AD`

## Portfolio

- [ ] Replace the **collection comparison table** with a **card list**: show the number of coins and you can use the first image of the first coin to set the list background picture
- [ ] Cap the **Cost Breakdown** chart at the **top 5 coins**, while keeping it scrollable
- [ ] Add an **expand button** to each portfolio chart (enlarge / full-view)

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
