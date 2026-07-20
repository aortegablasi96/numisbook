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

Current maturity: **Live in production — active milestone: Hosted Error
Monitoring & Accessibility Checks in CI**

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
addenda (`history.md` Phase 18, "Refinements after the ship"). And the **Public
Demo Account** milestone has shipped: a visitor can now enter a seeded, read-only
demo tenant from the signed-out home page without a Google account, and see a real
collection — 13 coins with museum photography, invoices, filters, portfolio
analytics and the assistant — before deciding to sign up (see `history.md` Phase 19,
ADR-016, DDR-007, and `docs/testing/public-demo-account-testing-report.md`). The
active milestone is now **Collector Experience**, whose first two slices have
shipped: **CSV export** — a collector can download the coins in view from either
coin surface, filters and all (see `history.md` Phase 20 and ADR-017) — and **CSV
import**, which reads that same contract back, previewing what it will add before
it writes anything (see `history.md` Phase 21 and the ADR-017 addendum) — and the
**full-account archive with restore**, which carries everything CSV cannot (all
collections, coins, valuations, plus image and invoice bytes) as a dependency-free
zip, restoring additively into any account (see `history.md` Phase 22 and the
ADR-017 archive addendum). With that, the **Collector Experience** milestone is
complete: a collector can get their data fully in and out. And **Assistant
Hardening** has shipped: the assistant streams its replies over SSE and renders
them as formatted Markdown, and the platform's one per-request money cost is
bounded on every surface — rate limits and a token budget per metered subject, a
per-request ceiling, bounded conversations, and a usage row behind all of them
that makes the feature's real spend answerable (see `history.md` Phase 23 and
ADR-018).

The active milestone is now **Hosted Error Monitoring & Accessibility Checks in
CI** — deferred twice behind the two above, and the gap they both widened: CI
gates on lint, type-check and unit tests, **none of which render a page**.

Primary objective:

**Close the gap between a defect existing and anyone finding out.** Production
errors are only discoverable by grepping runtime logs, and no gate renders a
page — so UI defects reach users unless someone happens to look. Four have now
shipped that way (a WCAG contrast failure, a stacked facet popover, a 146px
overflow, and a control offered to the read-only demo), each caught by hand.

> Objectives met by the two preceding milestones: *let a collector get their data
> in and out* (**Collector Experience**, `history.md` Phases 20–22) and *make the
> assistant safe to leave switched on* (**Assistant Hardening**, Phase 23).

Current priorities:

- Production readiness — ✅ complete (live in production)
- Additional settings — ✅ complete (settings area, i18n, dark mode)
- Dashboard recent acquisitions — ✅ complete
- Rework filters — ✅ complete
- Mobile-responsive UI — ✅ complete
- Public demo account — ✅ complete
- Collector experience — ✅ complete (CSV export + import, full-account archive)
- Assistant hardening — ✅ complete (streaming, rate limiting, cost controls,
  conversation limits, Markdown-formatted answers)
- Hosted error monitoring & accessibility checks in CI — active

---

# Active Milestone — Hosted Error Monitoring & Accessibility Checks in CI

Goal:

Close the two gaps between a defect existing and anyone finding out: production
errors that nobody is alerted to, and UI defects that no gate can see.

> Was the active milestone; deferred behind **Collector Experience** and
> **Assistant Hardening**, both now complete. Deferred, not reconsidered — the
> case below stands, and each milestone taken ahead of it is one more shipped
> without the gate. It is now active.

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

Promoted from the technical backlog. CI gates on lint + type-check + 297 unit
tests, and **none of them render a page** — `vitest.config.ts` runs
`environment: "node"`, so there is no DOM. Three milestones running have now
shipped defects straight through that gate, each needing a browser to see:

- a **WCAG AA contrast failure** in the light theme (DDR-005 §7),
- a **facet popover whose rows stacked** the checkbox above its value (#144),
- a **146px overflow** on the coin detail and an axe violation on the chart plots
  (mobile milestone), and
- a **base-currency control offered to the read-only demo** that the server would
  have refused (demo milestone).

All were caught by hand. This adds the missing gate so the next one is caught by
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

> Cleared 2026-07-16. The three entries that stood here — a type-to-filter box in
> the facet popovers (DDR-005 addendum), the `next lint` → ESLint CLI migration,
> and the CI actions bump off deprecated Node 20 (both ADR-010 addendum) — have
> shipped.

---

## Coins

### Coin list ordering is not a total order (#182)

**Problem**

`buildCoinOrderBy` (`coin.repository`) orders by a single nullable column with no
tiebreaker, so rows sharing a sort value have no defined relative order. Paging a
list sorted by a repeated value (e.g. 25 coins all categorised "Romans", sorted by
Category) can show a coin twice or skip it entirely — silently, since the total
count stays right.

Found while assessing whether CSV export could stream. Export **buffers**, so it
is immune (one query, one snapshot) — but this becomes a hard blocker if export is
ever changed to batched reads, which would drop rows from the file (ADR-017 §8).

**Fix**

- Give every coin ordering a unique final tiebreaker (`coins.id`)
- Pin it with a test, so a future sort key cannot reintroduce a partial order

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
