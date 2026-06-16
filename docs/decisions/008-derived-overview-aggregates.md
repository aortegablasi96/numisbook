# ADR-008: Derived aggregate fields for overview views

Status: Accepted

Date: 2026-06-15 (extended 2026-06-16 with monetary rollups)

## Context

The Embellishment milestone rounds out overview/list screens with at-a-glance
figures collectors expect. Three have shipped, all the same shape — a list or
summary view needs a figure *derived* from a child aggregate (count or sum of a
collection's `coins`) that the entity's own table does not store:

* **coin count per collection** on `/collections`;
* the signed-in **home dashboard** — collection and coin counts plus total paid;
* **total paid per collection** on `/collections` (the cost column beside the
  count).

A per-collection **market value** will follow once valuation-based analytics
lands (see `docs/roadmap.md`); it reuses the monetary-rollup path below.

We need a consistent answer for **where each derivation lives** before the
pattern is copied further, so we don't drift into ad-hoc choices (a denormalized
counter here, a service-side N+1 loop there, a currency-mixing SQL `SUM`
elsewhere).

## Decision

Compute overview aggregates as **derived read-model fields, never stored or
denormalized columns.** Where the work happens depends on whether the figure
needs currency conversion:

### Currency-agnostic aggregates (counts) → repository, in SQL

A purpose-built repository method returns the entity shape plus the derived
field via a single aggregate query — e.g. `collectionRepository.listByUserWithCounts`
does `LEFT JOIN coins … GROUP BY collections.id` with `count(coins.id)` (the
`LEFT JOIN` keeps empty collections at 0). The derived type is the base type
intersected with the extra field: `CollectionWithCount = Collection &
{ coinCount: number }`. Scoping by `collections.userId` keeps it tenant-isolated
(only the owner's rows — and therefore their children — are aggregated).

### Monetary rollups (sums that need FX) → service layer

A multi-currency total **cannot** be a pure SQL `SUM`: converting each price to
the base currency is business logic (ADR-007, behind the `FxRateProvider`, using
the acquisition-day rate with a current-rate fallback). So these rollups are
computed in `analytics.service` over the **already-converted** per-coin figures,
reusing the one converter the portfolio uses (`buildPriceConverter`, shared with
`getPortfolioSummary`):

* `getCollectionCosts(userId, baseCurrencyPref)` returns base-currency **cost per
  collection** (`{ baseCurrency, totalPaid: Record<collectionId, number> }`);
  collections with no priced coins are absent (the UI shows "—") and
  unconvertible prices are left out of the total.
* the home dashboard's **total paid** is the same conversion summed without
  grouping (via `getPortfolioSummary`).

The page **merges** the repository counts with the service totals (the
`/collections` server component calls `listCollections` and `getCollectionCosts`
in parallel and zips them by id).

### Common to both

* **No denormalized counters/sums** kept in sync by triggers or app code.
* The aggregate is produced in the repository (counts) or service (money) and
  surfaced **unchanged** through the API/route and UI — no business logic in
  routes, no DB access outside repositories.
* Tenant isolation rides on the existing owner-scoped queries; no new surface.

This generalises the precedent from ADR-007, where the analytics read model
added a derived `imageId` to each `AcquisitionEvent` rather than a stored field.

## Alternatives Considered

### Denormalized counter/total columns (e.g. `collections.coin_count`)

Pros: O(1) read, no join.
Cons: must be kept consistent on every coin insert/delete/move (and every FX
re-sync, for a cached total) — a class of drift bugs for figures that are cheap
to derive. Premature optimization at this scale (hundreds of coins, not
millions). Rejected.

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

### Compute in the API route / component

Violates the layering rules (no DB access or business logic outside
repositories/services). Rejected outright.

## Consequences

Positive:

* One consistent, predictable shape for overview aggregates; the next consumer
  (per-collection market value) reuses the monetary-rollup path.
* No consistency/maintenance burden from denormalized counters or cached sums.
* Tenant isolation inherited from existing owner-scoped queries.
* The shared `buildPriceConverter` keeps the portfolio and the per-collection
  rollup on identical FX semantics.

Negative / tradeoffs:

* Counts cost a join/aggregate, and monetary rollups cost one FX conversion pass
  (the rate cache makes this cheap and offline-safe — ADR-007). Acceptable at the
  app's data volumes and always-indexed owner scoping; a genuinely hot view could
  adopt a materialized figure later, as a deliberate change.
* Overview pages that show a money total now depend on the analytics service /
  FX cache, not just the repository — a wider dependency for the `/collections`
  page, mirrored on the home dashboard.

## Related Documents

* docs/architecture.md — layering rules (UI → services → repositories → db)
* docs/database.md
* ADR-006 — coin & valuation attribute rework (the `coins` shape being aggregated)
* ADR-007 — portfolio analytics upgrade (FX conversion / `buildPriceConverter`,
  and the derived `imageId` read-model precedent)
