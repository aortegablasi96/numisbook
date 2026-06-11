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

# Completed Milestone — Portfolio Analytics Upgrade

Complete. Analytics is based on the **price paid** per coin (hammer + final
price), expressed in one base currency: total paid, allocation breakdowns (metal,
category, acquisition year, collection), per-collection comparison, a cumulative
acquisition-cost trend chart, and multi-currency support (per-user base currency
+ ECB FX conversion). See `history.md` (Phase 6) and
`docs/decisions/007-portfolio-analytics-upgrade.md`.

> Valuation-based current value, gain/loss, and performance indicators were
> **deferred** to a later stage (they depend on valuation tracking maturing) —
> see the Valuation-Based Analytics milestone below.

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

# Next Milestone — Embellishment

Goal:

Bring the existing MVP features and UI to a level of quality and completeness
suitable for real collectors before preparing to deploy.

## Feature Refinement

- [ ] Review and round out existing MVP features
- [ ] Address rough edges and missing affordances

## UI/UX Polish

- [ ] Enhance style and UX 
- [ ] Visual consistency across views
- [ ] Empty / loading / error states
- [ ] Responsive layout
- [ ] Accessibility pass

## Quality

- [ ] Bug fixing
- [ ] Usability improvements

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