# ADR-010-UX & Feature Refinement

Status: Accepted

Date: 2026-06-19

## Context

With the platform functionally complete and the "stone & gold" re-skin shipped
(ADR-009), the **UX & Feature Refinement** milestone (`roadmap.md`) is a focused
round of everyday-UX polish across the coin and portfolio slices ahead of
Production Readiness. It bundles six small, mostly independent changes — five
visual/UX and one supporting data-model change. No new domains and no new
dependencies; all UI extends the existing `globals.css` system per ADR-009.

The changes are individually minor, but two of them carry decisions worth
recording so later work stays consistent: adding a **tax** component to the
price-paid partition (a data-model change that must thread through the cost
analytics to preserve an invariant), and replacing the per-collection
**comparison table** with a **card list**.

A **follow-up round** (same milestone) extended this with more polish and one new
feature: cost-breakdown chart tuning (bigger coin avatars, wider bars,
per-segment shares moved into the hover tooltip), a hover tooltip on the trend
chart, a more prominent collections card cover with a centred info panel, fixing
**tax before shipping** as the canonical partition order app-wide, and — the one
new feature — storing an auction/seller **bill (PDF)** per coin (decision 7).

## Decision

### 1. Tax is a fourth price-paid partition component

`coins` gains a nullable `tax_cost numeric(12,2)` column alongside
`hammer_price` / `auction_premium` / `shipping_cost`. The existing price-paid
rule is unchanged in shape: when **any** partition component is present,
`final_price` is the computed sum of all of them (missing components count as 0);
otherwise a directly-entered `final_price` is used as-is. Tax simply joins that
sum (schema → `coinAttributesSchema` → `coin.service` `MONEY_FIELDS`/sum →
`CoinDetailsCard` edit form + price-paid breakdown line).

Because the portfolio **cost-breakdown** chart relies on the invariant that a
coin's stacked segments sum to its total cost, tax also flows through analytics:
`PortfolioCoinRow` selects `tax_cost`, and `analytics.service` adds `tax` to
both `CostBreakdown` and `AcquisitionEvent`, so
`hammer + premium + shipping + tax + unsplit == totalFinal`. The cost-breakdown
chart renders a fourth `tax` segment (palette token `--chart-4`). The split
trigger now keys on *any* component being present rather than only
`hammer_price`, so a tax-only (or premium-only) partition is still split rather
than mislabelled "Final only".

**Canonical order — tax before shipping.** The partition is ordered
`hammer → premium → tax → shipping` everywhere it is shown: the coin-detail
price-paid breakdown line and edit form, the cost-breakdown chart's stack /
legend / tooltip, and the analytics `CostBreakdown` / `AcquisitionEvent` shapes.
Tax sits before shipping because it is part of the purchase price proper, with
shipping last as the delivery cost.

### 2. Era suffix: `AD` for positive years, `BC` for negative

`formatYear` (the single source of truth for rendering a year, used by the
derived coin title and the detail attribute chips) now suffixes positive years
with `AD` and keeps `BC` for negative ones. A range spanning the divide shows
both ends (e.g. `5 BC – 5 AD`); a fully-AD range suffixes both bounds
(`50 AD – 100 AD`). Year 0 (there is no historical year zero) renders as AD.
This is purely presentational — stored years are unchanged signed integers.

### 3. Coin-detail attribute chips follow a fixed semantic order

The detail attribute grid is reordered to a stable, collector-meaningful
sequence: Category, Metal, Denomination, Condition, Weight, Diameter, Mint,
Year. Absent attributes are still dropped; only the order of present ones
changes.

### 4. Collections: card list instead of a comparison table

The per-collection comparison on `/collections` (name / coins / paid) becomes a
responsive **card grid** (`CollectionsManager`). Each card optionally carries the
**first image of the collection's oldest coin** as a dimmed full-bleed
background, with the name and coin-count/cost overlaid and rename/delete actions
revealed on hover (mirroring the table's `row-actions`). The cover is resolved in
the repository read-model (`listByUserWithCounts`) via two identically-ordered
correlated subqueries returning the cover coin id and image id (the coin id is
needed to build the thumbnail URL); it is **not** denormalized.

Refined in the follow-up round: the cards are **much larger** and the cover photo
shows at **near-full strength** (rather than heavily dimmed) so the coin is the
visual anchor; the name + meta sit **centred** in a translucent blurred panel
**anchored to the card's bottom edge** (kept at WCAG AA over the bottom-weighted
scrim), and the
**whole card is a stretched link** — clicking anywhere on the cover navigates to
the collection, not just the text. Rename/delete are pinned to the top-right
corner above the link (higher `z-index` so they stay clickable), still
hover-revealed.

### 5. Cost-breakdown chart shows ~5 coins at a time, scrollable

The cost-breakdown chart sizes each coin's column so that **about 5 coins fit
the visible width**; the rest remain reachable by horizontal scroll, and the
plot is scrolled to the **newest** (right) end by default. No coins are dropped
(an earlier iteration hard-capped to 5 — rejected because it hid the older
acquisitions). The expanded view (decision 6) keeps the same per-coin width, so
its wider dialog fits proportionally more coins
(≈ 5 × dialogWidth / inlineWidth) and stays horizontally scrollable.

Follow-up tuning: the coin avatars are **larger** and the bars **wider**, and the
per-segment **percentages are no longer drawn on the bars** — the bars stay
clean and the split is read off the **hover tooltip** instead. The tooltip always
lists **all four** partition components (hammer / premium / tax / shipping), even
those that are 0, for a partitioned coin (a final-only coin shows the single
"Final only" row); its bottom line is a labelled **"Total"** row. The coin's
total still sits above each column.

### 6. Each portfolio chart has an expand control

Both portfolio charts gain an **expand** icon button that opens the enlarged
chart in a wide native `<dialog>` (the app's existing `.modal` pattern, as used
by `ConfirmButton`). The enlarged view is an independent instance of the same
chart component rendered with an `inModal` flag — so it manages its own range
state, re-measures to the modal width, and uses a taller height band — avoiding a
larger refactor to hoist chart state.

The **trend chart** (cumulative acquisition cost) gained a **hover tooltip**:
moving the cursor over the plot scrubs to the nearest day's data point, drops a
dashed vertical guide + marker, and floats a tooltip with that day's cumulative
total and date — matching the cost-breakdown chart's hover affordance.

### 7. Coin bills (auction/seller receipts) stored as PDFs

A coin can carry one or more **bills** — the auction or seller receipt the coin
was purchased against — uploaded, viewed, downloaded, and deleted from the coin
detail page. Bills are **always PDFs**.

This is a new vertical slice that deliberately **mirrors coin images** rather than
inventing a new pattern: a `coin_bills` table holds only metadata (`mime_type`,
`filename`, `size_bytes`, `storage_key`), while the PDF bytes live in **object
storage** behind the existing `src/lib/storage` abstraction (ADR-004 / ADR-005) —
so no new dependency and no new storage decision. The `coinBill.repository` is the
only layer that composes the row with the stored object (deleting the object on
row delete, cleaning up on a failed insert); `coinBill.service` gates every use
case on the acting user owning the coin (tenant isolation). Routes follow the
images convention:

```
GET    /api/coins/[id]/bills            → { bills: [{ id, filename, sizeBytes, createdAt }] }
POST   /api/coins/[id]/bills            → { id }   (multipart/form-data, field "file")
GET    /api/coins/[id]/bills/[billId]   → the PDF inline (?download=1 → attachment)
DELETE /api/coins/[id]/bills/[billId]   → 204
```

Constraints (`src/lib/bills.ts`): `application/pdf` only, max 15 MB. Because it
reuses the established storage abstraction and the coin-images pattern end to end,
no separate ADR is warranted — this section records it.

## Alternatives Considered

### Tax modelled outside the partition (e.g. a separate "fees" bucket)

Pros:
* Keeps the four-way hammer/premium/shipping/final shape untouched.

Cons:
* Tax is conceptually part of what the collector paid; excluding it from
  `final_price` would make the total wrong or require a second total.
* Rejected — folding it into the existing partition is simpler and keeps one
  authoritative `final_price`.

### Collection cards: store a chosen cover image per collection

Pros:
* Lets the user pick the cover; avoids a per-request subquery.

Cons:
* New column + UI to manage it; denormalizes data the database can already
  derive. Premature for a refinement milestone.
* Rejected in favour of deriving "oldest coin's first image" in the read-model.

### Chart expand via a shared extracted chart "body" component

Pros:
* No duplicate chart instance in the DOM.

Cons:
* Requires hoisting each chart's range state and splitting header/plot — a
  bigger refactor than the feature warrants.
* Rejected in favour of rendering a second `inModal` instance.

## Consequences

Positive:
* Tax-inclusive cost paid is captured and analysed without breaking the
  cost-breakdown segment-sum invariant.
* Year rendering is unambiguous across the BC/AD divide.
* The collections overview is more visual and scannable; the cost chart stays
  legible as collections grow (≈5 coins per view, scroll for the rest); charts
  are inspectable at full size, fitting more coins when expanded.
* Both portfolio charts are now hover-inspectable; the cost bars are cleaner with
  the split moved into a tooltip that always shows the full partition.
* Collectors can keep the purchase receipt (PDF) attached to each coin, reusing
  the proven coin-images storage pattern (no new dependency or storage decision).
* No new dependencies; all styling extends `globals.css` (ADR-009) and reuses the
  existing `.modal`, `row-actions`, and chart chrome.

Negative / trade-offs:
* `coins` gains a nullable column (additive migration `0002`); existing rows have
  `NULL` tax (treated as 0 in the partition sum), so no backfill is needed.
* A new `coin_bills` table (additive migration `0003`) plus its object-storage
  prefix (`bills/<coinId>/…`); the maintenance burden is the same as coin images.
* The expand modal keeps a second (hidden) chart instance mounted per chart;
  acceptable for dependency-free SVG.
* The collection card cover costs two correlated subqueries per collection list
  load; negligible at expected collection counts and not on a hot path.

## Related Documents

* docs/roadmap.md (UX & Feature Refinement milestone)
* docs/architecture.md
* docs/database.md
* docs/decisions/006-coin-and-valuation-attribute-rework.md (price-paid partition)
* docs/decisions/007-portfolio-analytics-upgrade.md (cost analytics, FX)
* docs/decisions/009-figma-ui-redesign.md (design system)
