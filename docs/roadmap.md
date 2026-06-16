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

Current maturity: **Pre-deployment — Embellishment**

The core collection-management platform is functionally complete, the coin and
valuation data models have been reformed (see `history.md` Phase 5), and the
**Portfolio Analytics Upgrade** is now complete — portfolio figures are
multi-currency aware, with gain/loss, deeper allocation, per-collection
comparison, and an SVG trend chart (see `history.md` Phase 6 and
`docs/decisions/007-portfolio-analytics-upgrade.md`). The next milestone is
**Embellishment**: polishing the MVP features and UI against the final data
shape before preparing for deployment.

Primary objective:

**Polish the MVP features and UI to a quality bar suitable for real collectors
before preparing for production deployment.**

Current priorities:

- Feature and UI/UX polish (Embellishment)
- (then) production readiness

---

# Next Milestone — Embellishment

Goal:

Bring the existing MVP features and UI to a level of quality and completeness
suitable for real collectors before preparing to deploy.

## Shipped so far

- Portfolio chart embellishment — side-by-side equal-height charts, gridlines,
  per-segment allocation labels, coin thumbnails, date-range presets (ADR-007).
- Coin count per collection on `/collections` (ADR-008).
- Signed-in **home dashboard** — collection/coin counts and total paid (ADR-008).
- **Accessibility & responsive pass** — WCAG AA contrast, `:focus-visible`,
  skip-to-content link, `prefers-reduced-motion`, `.sr-only` labels, and
  `.table-wrap` mobile scrolling; axe-clean on all pages in both colour schemes.
- **Error-state resilience** — shared `lib/http` (`readError` + `NETWORK_ERROR`);
  every client manager now surfaces a friendly message on network failure instead
  of failing silently.
- **Visual-consistency pass** — fixed the coin-list toolbar (a real layout bug:
  reused the column-flex `.filters`; now a horizontal `.toolbar`), added loading
  skeletons / neutral placeholders for coin thumbnails and the detail image card
  (no more blank flash), and aligned the coin "Added" date to the app's ISO
  convention. Builds on the earlier shared `formatMoney`/`readError` and stat-card
  styling.
- **Total paid per collection** — the `/collections` list now shows each
  collection's cost (base currency) beside the coin count, via `getCollectionCosts`
  (monetary rollups extend the ADR-008 pattern: counts in SQL, converted sums in
  the service over the shared FX converter).

## Feature Refinement

- [ ] Review and round out existing MVP features
- [ ] Address rough edges and missing affordances *(in progress: coin counts,
  home dashboard)*

## UI/UX Polish

- [ ] Enhance style and UX *(in progress: charts, dashboard)*
- [x] Visual consistency across views
- [x] Empty / loading / error states
- [x] Responsive layout
- [x] Accessibility pass

## Quality

- [ ] Bug fixing
- [ ] Usability improvements

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