# ADR-008: Derived aggregate fields for overview views

Status: Accepted

Date: 2026-06-15

## Context

The Embellishment milestone is rounding out overview/list screens with
at-a-glance figures collectors expect. The first is a **coin count per
collection** on `/collections`; more of the same shape are coming (a signed-in
**home dashboard** with totals, and a per-collection **total value** once
valuation-based analytics lands — see `docs/roadmap.md`).

These are all the same problem: a list (or summary) view needs a figure
*derived* from a child aggregate (count/sum of `coins`) that the entity's own
table does not store. We need a consistent answer for **where that derivation
lives** before the pattern is copied several more times, so we don't drift into
ad-hoc choices (a denormalized counter here, a service-side loop there).

## Decision

Compute overview aggregates as **derived read-model fields in the repository**,
not as stored/denormalized columns.

* A repository exposes a purpose-built read method that returns the entity
  shape plus the derived field(s), produced by aggregate SQL in a single query
  — e.g. `collectionRepository.listByUserWithCounts` does
  `LEFT JOIN coins … GROUP BY collections.id` with `count(coins.id)` (the
  `LEFT JOIN` keeps empty collections at 0). The derived type is the base type
  intersected with the extra field(s): `CollectionWithCount = Collection &
  { coinCount: number }`.
* The aggregation stays in the **repository** (it is data access / a query),
  reached by the service and surfaced unchanged through the API and UI. No new
  service-layer fan-out (N+1 count calls) and no business logic in the route.
* **Tenant isolation is preserved by the existing scoping**: the query filters
  by the owner (`collections.userId = userId`), so only the owner's rows — and
  therefore only their children — are aggregated. No new isolation surface.
* **No denormalized counters.** We do not add a `coin_count` column (or similar)
  kept in sync by triggers/application code.

This generalises the precedent already set in ADR-007, where the analytics read
model added a derived `imageId` to each `AcquisitionEvent` via a correlated
subquery rather than a stored field.

## Alternatives Considered

### Option A — Denormalized counter column (e.g. `collections.coin_count`)

Pros:
* O(1) read; no join.

Cons:
* Must be kept consistent on every coin insert/delete/move (triggers or
  app-level bookkeeping) — a new class of drift bugs for a figure that is cheap
  to compute. Premature optimization at this scale (a collector's coins number
  in the hundreds, not millions). Rejected.

### Option B — Count in the service per collection

Pros:
* Repository methods stay tiny and single-purpose.

Cons:
* N+1 queries (one count per collection), and aggregation logic leaking toward
  the service for what is plainly data access. Rejected in favour of one
  aggregate query in the repository.

### Option C — Compute in the API route / component

Cons:
* Violates the layering rules (no DB access or business logic outside
  repositories/services). Rejected outright.

## Consequences

Positive:
* One consistent place and shape for overview aggregates; the next consumers
  (home dashboard totals, per-collection value) follow the same recipe.
* No consistency/maintenance burden from denormalized counters.
* Tenant isolation is inherited from existing owner-scoped queries.

Negative:
* Each derived figure costs a join/aggregate at read time. Acceptable for the
  app's data volumes and the always-indexed owner scoping; if a future view ever
  proves hot, it can adopt a materialized count *then*, as a deliberate change.
* Aggregate SQL (`GROUP BY`, `count(...)::int`) is slightly more involved than a
  plain select — mitigated by keeping it in a clearly named repository method.

## Related Documents

* docs/architecture.md — layering rules (UI → services → repositories → db)
* docs/database.md
* ADR-006 — coin & valuation attribute rework (the `coins` shape being counted)
* ADR-007 — portfolio analytics upgrade (derived `imageId` read-model precedent)
