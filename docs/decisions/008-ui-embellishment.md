# ADR-008: UI Embellishment

Status: Accepted

Date: 2026-06-15 (extended through 2026-06-16 across the Embellishment milestone)

## Context

The **Embellishment** milestone (`history.md` Phase 7) polished the MVP features
and UI to a quality bar suitable for real collectors, against the post-reform
data shape (ADR-006) and the multi-currency analytics (ADR-007), before the
Figma UI Redesign and production readiness.

Most of the work was refinement *within* existing vertical slices and does not
warrant an ADR. But the milestone also established several **cross-cutting
decisions** — patterns that the next consumer (and especially the upcoming
visual redesign) must apply consistently rather than re-decide ad hoc. This ADR
records those decisions and their reasoning together, so the conventions survive
the re-skin. They are: (1) how overview aggregates are derived, (2) how clients
surface errors, (3) accessibility/responsiveness as a maintained baseline,
(4) loading/placeholder and visual-consistency conventions, and (5) deriving
sensible currency defaults.

## Decision

### 1. Overview aggregates — derived read-model fields, never denormalized

Several overview/list screens needed a figure *derived* from a child aggregate
(count or sum of a collection's `coins`) that the entity's own table does not
store: **coin count per collection** on `/collections`, the signed-in **home
dashboard** (collection/coin counts + total paid), and **total paid per
collection** (the cost column beside the count). A per-collection **market
value** will follow once valuation-based analytics lands; it reuses the same
path.

Compute these as **derived read-model fields, never stored/denormalized
columns.** Where the work happens depends on whether the figure needs currency
conversion:

* **Currency-agnostic aggregates (counts) → repository, in SQL.** A purpose-built
  method returns the entity shape plus the derived field via one aggregate query
  — e.g. `collectionRepository.listByUserWithCounts` does `LEFT JOIN coins …
  GROUP BY collections.id` with `count(coins.id)` (the `LEFT JOIN` keeps empty
  collections at 0). The derived type intersects the base with the extra field:
  `CollectionWithCount = Collection & { coinCount: number }`. Scoping by
  `collections.userId` keeps it tenant-isolated.
* **Monetary rollups (sums that need FX) → service layer.** A multi-currency
  total cannot be a pure SQL `SUM`: converting each price to the base currency is
  business logic (ADR-007, behind the `FxRateProvider`, using the acquisition-day
  rate with a current-rate fallback). These rollups are computed in
  `analytics.service` over the **already-converted** per-coin figures, reusing
  the one converter the portfolio uses (`buildPriceConverter`, shared with
  `getPortfolioSummary`). `getCollectionCosts(userId, baseCurrencyPref)` returns
  base-currency cost per collection; collections with no priced coins are absent
  (UI shows "—") and unconvertible prices are left out. The home dashboard's
  total paid is the same conversion summed without grouping (via
  `getPortfolioSummary`).

The page **merges** repository counts with service totals (the `/collections`
server component calls `listCollections` and `getCollectionCosts` in parallel
and zips them by id). No denormalized counters/sums kept in sync by triggers or
app code; the aggregate is surfaced unchanged through the API/route and UI.
This generalises the precedent from ADR-007, where the analytics read model
added a derived `imageId` to each `AcquisitionEvent` rather than a stored field.

### 2. Uniform client-side error surfacing

Before the milestone, each domain "manager" handled fetch failures ad hoc, and a
*thrown* fetch (offline, server unreachable, aborted) typically failed silently.

Centralise error messaging in a single shared module, `src/lib/http.ts`:

* `readError(response, fallback)` reads the API's `{ error }` text from a non-OK
  `Response`, with a safe fallback.
* `NETWORK_ERROR` is the friendly message shown when `fetch` itself rejects (no
  response).

**Every** domain manager (`CollectionsManager`, `CoinsManager`, `CoinDetailsCard`,
`CoinImage`, `ValuationsManager`, `AssistantWidget`) routes failures through these
two helpers, so no client path fails silently and the wording is consistent. New
client components that call the API must do the same.

### 3. Accessibility & responsiveness — a maintained baseline in the design system

Accessibility is implemented as **design-system conventions in `globals.css`**,
not per-component fixes: theme tokens meet WCAG AA contrast, `:focus-visible`
outlines cover links/buttons/inputs, a skip-to-content link targets
`#main-content`, animations honour `prefers-reduced-motion`, `.sr-only` labels
cover icon-only/empty controls, and wide tables are wrapped in `.table-wrap`
(in-region scroll on mobile). The bar is **axe-clean in every colour scheme that
ships**. Baking this into the system (rather than each screen) means every view
inherits it; the bar is a convention to *preserve*, and the redesign milestone
must re-verify it against the new tokens.

### 4. Loading/placeholder and visual-consistency conventions

* Async images render **loading skeletons / neutral placeholders** (coin
  thumbnails, the detail image card) so there is no blank flash before bytes
  arrive.
* Reuse shared primitives instead of per-view styling: the shared `formatMoney`
  formatter, the app's ISO date convention (e.g. the coin "Added" date), and the
  stat-card styling.
* Use the semantically correct utility class — the coin-list toolbar is a
  horizontal `.toolbar`, not the column-flex `.filters` it had wrongly reused (a
  real layout bug, not just cosmetics).

### 5. Sensible defaults — valuation currency

A new valuation's currency defaults to `coin.priceCurrency ?? user.baseCurrency
?? "USD"` rather than a hard-coded `USD`. A valuation almost always shares the
coin's currency, so deriving the default avoids silent currency mismatches in
the multi-currency model (ADR-007) while keeping `USD` only as a last-resort
fallback.

## Alternatives Considered

### Denormalized counter/total columns (e.g. `collections.coin_count`)

Pros: O(1) read, no join.
Cons: must be kept consistent on every coin insert/delete/move (and every FX
re-sync, for a cached total) — a class of drift bugs for figures that are cheap
to derive. Premature optimization at this scale. Rejected.

### Count/sum in the service, per entity

Pros: repository methods stay tiny.
Cons: N+1 queries (one per collection). Rejected for counts in favour of one
aggregate query. (Money rollups *do* live in the service — but as a single pass
over all priced rows, not per-collection queries.)

### SQL `SUM` for monetary totals

Pros: one query, like counts.
Cons: would sum raw amounts across mixed currencies — meaningless without
conversion, and conversion (ADR-007) is business logic that doesn't belong in
SQL. Rejected: monetary rollups belong in the service.

### Compute aggregates in the API route / component

Violates the layering rules (no DB access or business logic outside
repositories/services). Rejected outright.

### Per-manager bespoke error handling

Pros: no shared module.
Cons: inconsistent wording and the silent-failure-on-thrown-fetch bug recurs in
every new manager. Rejected in favour of the shared `lib/http` helpers.

### Accessibility fixed per component

Pros: localised changes.
Cons: drifts immediately and can't be verified once; new components forget it.
Rejected in favour of system-level tokens/utilities in `globals.css`.

## Consequences

Positive:

* One consistent, predictable shape for overview aggregates; the next consumer
  (per-collection market value) reuses the monetary-rollup path. No
  consistency/maintenance burden from denormalized counters or cached sums.
* Tenant isolation inherited from existing owner-scoped queries; no new surface.
* Clients fail loudly and consistently; the shared `buildPriceConverter` keeps
  the portfolio and the per-collection rollup on identical FX semantics.
* Accessibility and loading-state quality are properties of the design system,
  so they carry forward into the redesign by default (subject to re-verification).

Negative / tradeoffs:

* Counts cost a join/aggregate, and monetary rollups cost one FX conversion pass
  (the rate cache makes this cheap and offline-safe — ADR-007). Acceptable at the
  app's data volumes; a genuinely hot view could adopt a materialized figure
  later, as a deliberate change.
* Overview pages that show a money total now depend on the analytics service /
  FX cache, not just the repository — a wider dependency for `/collections`,
  mirrored on the home dashboard.
* The accessibility bar is now a standing constraint: the Figma UI Redesign must
  re-verify WCAG AA contrast (notably gold-on-white) and the focus/motion/`.sr-only`
  conventions against the new tokens, in every scheme that ships.

## Related Documents

* docs/architecture.md — layering rules (UI → services → repositories → db)
* docs/database.md
* docs/roadmap.md — Figma UI Redesign milestone (inherits these conventions)
* CLAUDE.md — UI / Design system + accessibility conventions; `src/lib/http`
* ADR-006 — coin & valuation attribute rework (the `coins` shape being aggregated)
* ADR-007 — portfolio analytics upgrade (FX conversion / `buildPriceConverter`,
  and the derived `imageId` read-model precedent)
