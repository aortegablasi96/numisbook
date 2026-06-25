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

Current maturity: **Live in production — next: Additional Settings**

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
portfolio charts, and per-coin **bills** (PDF receipts) (see `history.md` Phase 9
and `docs/decisions/ADR-009-ux-and-feature-refinement.md`). **Production
Readiness** has now shipped: NumisBook is **live in production** — deployed on
Vercel against Neon, schema applied via the gated `migrate` job, Google sign-in
working and `/api/health` green, with CI/CD, observability, and auth resilience
in place (see `history.md` Phases 10–11 and ADR-010/011/012). The next milestone
is **Additional Settings**.

Primary objective:

**Give users control over their account and preferences through a dedicated
settings area.**

Current priorities:

- Production readiness — ✅ complete (live in production)
- Additional settings (current)
- (then) hosted error monitoring
- (then) valuation-based analytics

---

# Current Milestone — Additional Settings

Goal:

Give users control over their account and preferences through a dedicated
settings area — profile/account details, a preferred base currency for
portfolio analytics, interface language, and theme (day/night).

## Features

- [ ] Settings page (route + navigation entry)
- [ ] View/edit user profile (display name, account info)
- [ ] Account/data controls (e.g. account deletion)
- [ ] Add languages (i18n / multi-language support)
- [ ] Add night mode (dark theme)
  > ⚠️ Reverses `DDR-001-figma-ui-redesign`, which made the app light-only
  > (`globals.css` ships light theme tokens only). Requires a new DDR
  > superseding DDR-001 — re-introducing dark theme tokens — before
  > implementation.
- [ ] Settings menu controls
  - [ ] Select language
  - [ ] Select default currency (base currency applied to portfolio analytics)
  - [ ] Select day/night mode

---

# Future Milestone — Hosted Error Monitoring

Goal:

Turn production errors from a pull-based log stream into proactive,
aggregated alerting — to be picked up **post-deployment**, once a hosting
platform and a monitor account/DSN exist.

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
