# ADR-015-Coin filter rework (multi-value filter contract + cross-collection coin resource)

Status: Accepted

Date: 2026-07-12

## Context

The active milestone is **Rework Filters** (`roadmap.md`): make filtering across
NumisBook consistent, complete, and useful. An audit of the current state found
that filtering is not merely thin — it is structurally confined:

- **One filter surface exists.** Filters live only on the coin table inside a
  single collection (`CoinsManager`, rendered at `/collections/[id]`). There is
  no cross-collection coin listing at all: `src/app/coins/` contains only
  `[id]/page.tsx` (the detail view), the header nav is Collections + Portfolio,
  and the dashboard's "View all →" link dead-ends at `/collections`. A collector
  with several collections cannot search their inventory as a whole.
- **Three of ~20 coin attributes are filterable** (`metal`, `category`, `year`).
  Notably absent is `grade` — already a Postgres enum ordered worst→best (ADR-006)
  and a primary axis collectors think in.
- **Free-text search silently under-matches.** `q` matches only `category` and
  `issuing_authority`, so a mint name, a denomination, or a catalogue reference
  ("RIC 123") returns nothing, despite those columns existing.
- **The year filter contradicts the data model.** It takes a single year and
  matches coins whose `year_from..year_to` range contains it. The model is
  explicitly a *range* with negative values for BC, so "3rd century BC" is
  inexpressible.
- Filters are single-select, have no clear-all or active-filter indicator, and
  live in component state.

The non-trivial decisions are **(a)** the wire contract for multi-value filters,
**(b)** where a cross-collection coin query lives and how it stays tenant-safe,
and **(c)** whether broadened substring search warrants a Postgres search
extension now.

## Decision

Widen the coin filter contract, and add a **top-level coin resource** for
querying coins across collections.

1. **Filter contract.** Filters are expressed as **repeated query params**
   (`?metal=Silver&metal=Gold`), read with `searchParams.getAll`. Semantics are
   **OR within a field, AND across fields**. The filterable set becomes: free-text
   `q`, `metal`, `category`, `denomination`, `mint`, `grade` (multi-value), plus a
   `yearFrom`/`yearTo` **range** (signed integers; negative = BC, matching how the
   coin form already takes these fields). `q` is broadened to match `category`,
   `issuing_authority`, `denomination`, `mint`, and `catalogue_references`.

   `issuing_authority` is deliberately **searchable but not faceted** — it is
   high-cardinality free text ("Alexander III", "Athens"), and a dropdown of
   hundreds of values is hostile.

2. **A single validation schema.** `coinSearchParamsSchema`
   (`src/lib/validation/coin.ts`) is the one place the query contract is defined,
   used by both the collection-scoped and the cross-collection routes. Routes stay
   thin (validate → service → shape), per the layering rules.

3. **New resource: `GET /api/coins` and `GET /api/coins/facets`** — the user's
   coins across every collection they own. This is the project's first top-level
   coin route; coins were previously reachable only nested under a collection.
   Backing it: `coinRepository.searchForUser` / `getDistinctFacetsForUser`, and
   `coin.service.searchAllCoins` / `getAllCoinFacets`.

4. **Tenant isolation.** Coins carry no `user_id`, so both new queries scope
   indirectly — `collection_id IN (SELECT id FROM collections WHERE user_id = $1)`
   — the pattern CLAUDE.md already mandates. The `userId` comes from the session
   (`currentUser()`), never from client input, even though the new route is not
   nested under `/collections/[id]` and so inherits no ownership check. **The
   facets query is scoped identically**: an unscoped `SELECT DISTINCT mint` would
   leak other collectors' data through a filter dropdown.

5. **One shared condition builder.** `searchInCollection` and `searchForUser`
   differ only in their scoping predicate; the filter conditions are built once
   (`buildCoinConditions`) and composed by both, so the two surfaces cannot drift
   — which is the very inconsistency this milestone exists to remove.

6. **Indexing: add one, defer one.** Add a composite
   `coins (collection_id, created_at DESC)` to serve the default "newest first"
   listing on both surfaces without a sort step (Database Review). **Defer**
   `pg_trgm`: the broadened `ILIKE '%…%'` runs only against one tenant's rows,
   already narrowed by the `collection_id` index, and scanning a few thousand rows
   for a substring is cheap. Taking on a Postgres extension to solve an unmeasured
   problem is premature; revisit with a measurement.

7. **No `coins.user_id` denormalization.** Rejected — it duplicates ownership the
   FK chain already expresses and creates a second source of truth that can drift.

**Filter state is not synced to the URL** (product decision): filters remain
component-local and reset on navigation. Shareable filtered views are a future
enhancement.

## Alternatives Considered

### Option A — Widen the contract + top-level `/api/coins` (chosen)

Pros:
* Puts filtering where it is most valuable — across the whole inventory — which
  is the milestone's actual goal.
* Purely additive: no schema change, no new dependency, existing patterns extended
  (thin routes, repository-only DB access, indirect tenant scoping).
* One filter contract and one condition builder serve both surfaces, so they
  cannot diverge.

Cons:
* Introduces the first non-nested coin resource, a new API precedent.
* The cross-collection query is a new tenant-isolation surface that must be tested
  explicitly rather than inherited.

### Option B — Rework filters in place, no cross-collection view

Pros:
* Smaller milestone; no new route, no new query, no new isolation surface.

Cons:
* Leaves the largest gap unaddressed — a collector still cannot search their
  inventory as a whole, and the dashboard's "View all →" still dead-ends.
  Rejected by the product decision.

### Option C — Denormalize `coins.user_id` for a direct cross-collection query

Pros:
* Simpler, faster predicate (`WHERE user_id = $1`), no subquery.

Cons:
* A second source of truth for ownership that can drift from `collections.user_id`
  (a coin moved between collections must update both). The existing
  `collection_id` index already serves the semi-join well. Rejected.

### Option D — Adopt `pg_trgm` (or full-text search) now

Pros:
* Indexed substring/fuzzy search that scales.

Cons:
* An infrastructure dependency (a Postgres extension) adopted with no measurement
  showing the tenant-scoped scan is slow. Premature; deferred, not rejected.

## Consequences

Positive:
* Every attribute the coin table can display is filterable, and search no longer
  silently ignores fields it appears to cover.
* Coins gain a first-class home (`/coins`) spanning collections; the dashboard's
  "View all →" finally leads somewhere.
* The filter contract is defined once and validated once, giving later filtering
  work (portfolio, collections) a convention to follow.

Negative:
* `CoinsManager` (535 lines, already over the 300-line guideline) must be split
  into shared filter/table components — a behaviour-preserving refactor with real
  regression risk to existing CRUD and column persistence (Refactoring Reviewer).
* Two tables now persist column state, so the global view needs its own versioned
  `localStorage` key; sharing `numisbook:coin-columns-v4` would corrupt both.
* Facet lists are unbounded across a whole inventory (dozens of mints), scrolling
  in a popover for now; a type-to-filter box is the likely follow-up.

Risks:
* **Tenant isolation on the two new queries is the highest-severity risk in this
  milestone.** A scoping mistake leaks another collector's inventory — including
  through the facets dropdown. It must be covered by explicit tests, not assumed
  from the shape of the subquery.
* Substring search will degrade first if any single inventory grows very large;
  the `pg_trgm` deferral is a deliberate, cheap-to-revisit bet.

## Related Documents

* docs/design-decisions/DDR-005-filter-bar-pattern.md
* docs/decisions/ADR-006-coin-and-valuation-attribute-rework.md
* docs/decisions/ADR-012-production-deployment.md
* docs/architecture.md
* docs/database.md
* docs/roadmap.md
