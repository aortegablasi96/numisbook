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

Current maturity: **Live in production — active milestone: Public Demo Account**

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
**Dashboard Recent Acquisitions** milestone has shipped — the home dashboard now
surfaces the user's most recently acquired coins across all collections, priced in
their base currency (see `history.md` Phase 16). And the **Rework Filters**
milestone has shipped: coin filtering is multi-value (OR within a field, AND across
fields) over a widened field set, the same filter bar serves a new cross-collection
**All coins** view at `/coins`, and validation of it corrected a WCAG AA contrast
failure in the light theme's gold text token (see `history.md` Phase 17, ADR-015,
DDR-005, and `docs/testing/rework-filters-testing-report.md`). And the
**Mobile-Responsive UI** milestone has shipped: NumisBook is usable on a phone —
one three-stop breakpoint scale replaces eight ad-hoc ones, the 75% display density
is now desktop-only, the coin list reads as cards, and the filter bar works on
touch (see `history.md` Phase 18, DDR-006, and
`docs/testing/mobile-responsive-ui-testing-report.md`); four refinements from using
it since then — a filter bar that starts collapsed, one sort control, every sortable
field reachable, and cards that name their collection — are recorded as DDR-006
addenda (`history.md` Phase 18, "Refinements after the ship"). The active milestone
is now **Public Demo Account**.

Primary objective:

**Make the product reachable by the people who have not signed up yet.** The
mobile half of this is done — a visitor arriving from a phone can now read the app.
What remains is that they cannot see a single coin without connecting a Google
account and creating a collection from an empty state: the product still cannot
demonstrate itself to the person deciding whether to use it.

**Hosted Error Monitoring & Accessibility Checks in CI** is deferred behind the
demo. It remains the right next investment in defect detection, and the a11y gate
should now be built against the breakpoints DDR-006 settled. The mobile milestone
sharpened the case for it: two of the three defects it fixed — a 146px overflow on
the coin detail and a serious axe violation on the chart plots — were **pre-existing
bugs that lint, type-check and 263 unit tests could not see**, because none of them
renders a page.

Current priorities:

- Production readiness — ✅ complete (live in production)
- Additional settings — ✅ complete (settings area, i18n, dark mode)
- Dashboard recent acquisitions — ✅ complete
- Rework filters — ✅ complete
- Mobile-responsive UI — ✅ complete
- Public demo account (active)
- (then) hosted error monitoring & accessibility checks in CI
- (then) valuation-based analytics

---

# Active Milestone — Public Demo Account

Goal:

Let a visitor see a real, populated collection **before** signing up. Today the
only way in is Google OAuth, and what waits on the other side is an empty state —
the product cannot demonstrate itself to the person deciding whether to use it.

## Approach

A **"Try the demo" entry point on the marketing page signs the visitor into a
seeded, read-only demo tenant without Google**. The demo account is preconfigured
with collections, coins, images, invoices, and valuation history, so every
surface — the coin list and filters, a coin's detail view, `/portfolio`, the
assistant — has something real to show.

The tenant-isolation invariant (`CLAUDE.md`) is the constraint that governs the
design: the demo user must be an ordinary tenant whose `userId` still comes from
the session, never from client input. The open questions for planning are how a
session is established without an OAuth provider, how writes are prevented (or
sandboxed and reset) so one visitor cannot spoil the demo for the next, and
whether the assistant — which has write and delete tools — is exposed at all.

## Features

- [ ] Decide the demo session mechanism (a session without an OAuth provider) and
      the write policy: read-only, or per-visitor sandbox with reset
- [ ] Seed script / fixture for the demo tenant — collections, coins, images,
      invoices, valuations — reproducible and re-runnable
- [ ] "Try the demo" entry point on the signed-out home page
- [ ] Make the demo state visible in the UI (a banner or badge) with a clear path
      to real sign-up
- [ ] Ensure the demo tenant cannot read or write another tenant's data, and that
      demo credentials grant nothing beyond it
- [ ] Record the decision as an ADR (it adds a second, non-Google way to obtain a
      session — a departure from ADR-003)

---

# Future Milestone — Hosted Error Monitoring & Accessibility Checks in CI

Goal:

Close the two gaps between a defect existing and anyone finding out: production
errors that nobody is alerted to, and UI defects that no gate can see.

> Deferred behind the Mobile-Responsive UI and Public Demo Account milestones. The
> a11y gate below should be written once, against the breakpoints the mobile
> milestone settles — building it first would mean rewriting it after.

## Hosted error monitoring

Today the `ErrorReporter` seam (`src/lib/observability`) only logs; finding a
production error means grepping the deploy platform's runtime logs by `errorId`,
with no grouping, retention, or alerts (see `ADR-011`). This wires a hosted
monitor onto that seam — a change confined to `src/lib/observability/index.ts`,
leaving all call sites untouched.

### Features

- [ ] Add the Sentry SDK (`@sentry/nextjs`) and provision a project/DSN
- [ ] Implement a Sentry-backed `ErrorReporter` behind the existing seam
- [ ] Forward the generated `errorId` to Sentry as a correlation tag
- [ ] Configure environment, release tagging, and PII scrubbing
- [ ] Set up alerting rules / notification channels
- [ ] Document the setup in an ADR (extends or supersedes ADR-011)

## Accessibility checks in CI

Promoted from the technical backlog. CI gates on lint + type-check + 265 unit
tests, and **none of them render a page** — `vitest.config.ts` runs
`environment: "node"`, so there is no DOM. The Rework Filters milestone shipped
two defects straight through that gate, both of which needed a browser to see:

- a **WCAG AA contrast failure** in the light theme (DDR-005 §7), and
- a **facet popover whose rows stacked** the checkbox above its value (#144).

Both were caught by hand. This adds the missing gate so the next one is caught by
CI, in both colour schemes.

### Features

- [ ] Add a headless-browser + `@axe-core` pass over the key pages, in light and
      dark, run against a production build in CI
- [ ] Fail the build on any violation; keep the run fast enough to gate every PR
- [ ] Decide and document the page set (at minimum `/`, `/coins`, a collection,
      `/portfolio`, `/settings`), the viewports (desktop **and** the mobile
      breakpoints), and the interactive states worth asserting
- [ ] Record the decision (extends ADR-010, the CI pipeline)

> Open question for planning: whether this stays an a11y-only axe gate or grows
> into a general rendering/visual gate. The popover bug was a **layout** defect —
> axe would not have caught it. Scope it deliberately rather than assuming axe
> covers both.

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
