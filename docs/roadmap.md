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

Current maturity: **Pre-deployment — Portfolio Analytics Upgrade**

The core collection-management platform is functionally complete, and the coin
and valuation data models have been reformed (see `history.md` Phase 5 and
`docs/decisions/006-coin-and-valuation-attribute-rework.md`). Portfolio analytics
will now be upgraded on top of the new data shape, before the later embellishment
work, so polish targets the final data shape rather than the current one.

Primary objective:

**Upgrade portfolio analytics on the reformed data models before polishing the
MVP for production deployment.**

Current priorities:

- Portfolio analytics upgrade
- (then) feature and UI/UX polish

---

# Next Milestone — Portfolio Analytics Upgrade

> The preceding **Data Model Reform** milestone is complete; see `history.md`
> (Phase 5) and `docs/decisions/006-coin-and-valuation-attribute-rework.md`.

Goal:

Improve the portfolio analytics page into a richer, more insightful view of a
collector's holdings.

## Analytics

- [ ] Richer value-trend visualization over time
- [ ] Deeper allocation breakdowns (by metal, category, year, etc.)
- [ ] Per-collection and aggregate comparisons
- [ ] Gain/loss and performance indicators

## UX

- [ ] Improved charts and layout
- [ ] Date-range / filter controls

---

# Future Milestone — Embellishment

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

- [ ] Multi-currency portfolio support
- [ ] Base-currency preferences
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