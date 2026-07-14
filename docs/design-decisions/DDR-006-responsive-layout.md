# DDR-006 Responsive Layout (breakpoint scale + viewport-aware density)

Status: Accepted

Date: 2026-07-14

> **Amends DDR-002** (global `zoom: 0.75`): the density is now viewport-aware and
> applies to desktop only. DDR-002 is not superseded — its rationale, its choice
> of `zoom` over `transform: scale`, and its 0.75 factor all still govern the
> desktop rendering. **Extends DDR-001** (the "stone & gold" system): no tokens,
> type scale, or colours change here.

## Context

The Mobile-Responsive UI milestone asked for a phone-usable NumisBook. The app was
built for a desktop viewport, and responsiveness had accreted rather than been
designed: `globals.css` carried eight ad-hoc `max-width` breakpoints (400, 480,
540, 640, 768, 860, 900, 1160) plus a 1280/1600 pair, each added to rescue one
component, with no shared scale.

Investigating why those rules behaved unpredictably surfaced the root cause, which
is not a missing breakpoint but a **coordinate-space mismatch created by DDR-002's
root `zoom: 0.75`**. Measured in Chrome on a 390px-wide viewport with
`html { zoom: 0.75 }`:

| Measure | Value |
| --- | --- |
| Real viewport (`window.innerWidth`) | 390px |
| Layout width (`document.documentElement.clientWidth`) | **520px** |
| `100vw` computes to | 390 *nominal* px → paints at 292 visual px |
| `@media (max-width: 400px)` | **matches** |

So **media queries are evaluated against the real viewport (390px), while every
box in the stylesheet is laid out in a nominal space 1/0.75 = 1.333× larger
(520px)**. A rule authored as `@media (max-width: 640px)` does not fire "when the
layout has 640px of room" — it fires when the layout has 853 nominal px of room.
Every breakpoint in the file therefore meant something ~33% different from what
its author intended, which is precisely why each new one was tuned by hand against
one component and generalised to nothing.

Two further consequences of the same mismatch:

* Nominal 16px body text paints at 12px on a phone, and a 44px touch target paints
  at 33px — below the WCAG 2.5.5 / platform minimum.
* `vw`/`vh` units resolve in nominal px, so `width: 100vw` covers only 75% of the
  screen. DDR-002's addendum had already hit this in the portfolio charts and
  patched it locally with `calc(96vw / 0.75)` and a `ZOOM = 0.75` constant in
  `chart-layout.ts`.

No breakpoint scale can be coherent while the two spaces disagree. Fixing the
density on phones is therefore the precondition for the rest of the milestone, not
a polish item within it.

## Decision

### 1. Viewport-aware density

`zoom: 0.75` applies to **desktop only**. At and below the tablet breakpoint the
app renders at its nominal 100%:

```css
html {
  zoom: 0.75;              /* desktop (≥ 1025px) — DDR-002 */
}
@media (max-width: 1024px) {
  html {
    zoom: 1;               /* phone + tablet — DDR-006 */
  }
}
```

Below 1025px the two coordinate spaces coincide: media queries, layout boxes,
`vw` units and touch targets all agree, body text is 16px, and the breakpoints
below mean what they say. Above it, DDR-002's desktop rendering is bit-for-bit
unchanged.

The boundary is placed at the tablet/desktop line rather than the phone line so
that touch devices — not just phones — get full-size text and hit targets. The
cost is a visible density step between a 1024px tablet and a 1100px laptop; this
is accepted deliberately (see Tradeoffs).

### 2. Breakpoint scale

Three stops, replacing all ten ad-hoc values. These are the **only** widths any
media query in `globals.css` may use:

| Stop | Range | Meaning |
| --- | --- | --- |
| **phone** | `max-width: 640px` | single column everywhere; density 1 |
| **tablet** | `max-width: 1024px` | rails stack, grids narrow; density 1 |
| **desktop** | *(default, no query)* | full layout; density 0.75 |
| **wide** | `min-width: 1440px` | optional enhancements only |

The scale is a documented convention enforced by review, not by tooling: CSS
custom properties cannot be used in media-query preludes
(`@media (max-width: var(--bp-phone))` is invalid), and `@custom-media` would
require a PostCSS dependency, which the dependency-free-CSS stance (DDR-001)
rules out. The scale is recorded in a header comment in `globals.css`; every media
query in the file cites its stop by name.

The ten previous values map on as follows: 400 / 480 / 540 / 640 → **phone**;
768 / 860 / 900 / 1160 → **tablet**; 1280 / 1600 → **wide** (collapsed to one tier).

### 3. Per-surface mobile form

* **Coin list → stacked cards below `phone`.** The wide data table is not a usable
  way to read a collection on a phone, and `.table-wrap`'s sideways scroll only
  prevents a broken page. Each coin becomes a card: thumbnail, the derived title
  (`formatCoinTitle`), and the attributes the user has left visible, rendered as
  `label · value` metadata beneath. The same `ColState` drives which attributes
  appear, so the table and the card list cannot drift.
  The **column picker and drag-to-reorder are desktop affordances and are hidden
  below `phone`** — both are pointer gestures with no touch equivalent worth
  building, and the card form makes column *order* meaningless. Sorting stays,
  as a `<select>`.
* **Filter bar (DDR-005) on touch.** Search goes full-width; the facet popovers
  drop their anchored floating box for a full-width dropdown within the bar; grade
  chips wrap; the active-filter chip row and clear-all stay exactly as they are —
  on a phone they are the user's only view of what is applied.
* **Shell.** The header keeps brand + nav on one row; the primary nav scrolls
  horizontally rather than wrapping into a second line or collapsing behind a
  hamburger. Settings and sign-out keep their text labels.
* **Assistant.** The existing bottom-sheet form is re-targeted from its ad-hoc
  540px to the `phone` stop.
* **Charts.** The analytics two-up grid stacks at `tablet`. The cost-breakdown
  chart fits **3 coins** across the visible width at `phone` (5 on desktop) —
  five 104px thumbnails cannot read on a 390px screen.
* **Card grids.** The collections grid and the dashboard `.cards` / `.stats` grids
  drop to one column at `phone`.

### 4. Density-dependent chart sizing

`chart-layout.ts` converted visual → nominal px with a hardcoded `ZOOM = 0.75`.
Because the zoom is now a function of viewport width, that constant becomes a
function too — `currentZoom()`, resolved at measure time and recomputed on resize,
returning 1 at or below the tablet stop and 0.75 above it. `.modal-chart`'s
`calc(96vw / 0.75)` is likewise moved under the desktop stop, with a plain
`96vw/96vh` at `tablet` and below where no correction is needed.

This remains the narrow, intentional exception DDR-002 recorded: the
fit-to-viewport charts are the one place that reads `window.innerHeight` and
viewport units directly, so they are the one place that must know the scale.

## Alternatives Considered

### Option A — Full size below 1025px (chosen)

Pros:
* Phones *and* tablets get 16px text and full-size touch targets.
* Below the boundary the coordinate spaces coincide, so the breakpoint scale is
  finally meaningful and future responsive work is predictable.
* Desktop — the view the owner tuned and approved in DDR-002 — is untouched.

Cons:
* A visible density step between a 1024px tablet and a 1100px laptop.

### Option B — Full size below 641px only (phone-only)

Pros:
* Smaller visual jump across the tablet/desktop boundary.

Cons:
* A 768px tablet keeps 12px text and 33px touch targets — it remains a scaled-down
  desktop, which is the exact defect this milestone exists to fix. Rejected.

### Option C — Graduated density (1 → 0.85 → 0.75)

Pros:
* Smoothest transition across the whole range.

Cons:
* Three density regimes to reason about, a second magic number for the chart code
  to track, and a middle value (0.85) that nothing motivates. Rejected as
  complexity without user benefit.

### Option D — Re-scale the design tokens instead of zooming

Rejected for the same reasons DDR-002 rejected it: invasive, rewrites the exact px
geometry DDR-001 records, and risks visual drift — for a visually equivalent
outcome.

## Consequences

Benefits:

* NumisBook is usable on a phone: 16px text, ≥ 44px touch targets, no horizontal
  page scroll, and a coin list that reads as a collection rather than a spreadsheet.
* One breakpoint scale replaces ten ad-hoc values; the next responsive change has
  a place to go instead of adding an eleventh.
* The breakpoints now mean what they say, removing a class of bug that was
  invisible to anyone who had not measured `documentElement.clientWidth`.

Tradeoffs:

* A density step at the 1024px boundary — a tablet renders ~33% larger than a
  laptop 80px wider. Accepted: the alternative is knowingly shipping sub-minimum
  touch targets to every tablet.
* The coin table's column picker and drag-reorder are unavailable on phones. The
  card list shows the same user-chosen columns, so nothing is hidden that the user
  did not already hide — but the *choice* must be made on a larger screen.
* The breakpoint scale is a convention, not a compile-time constraint. A future
  contributor can still write `@media (max-width: 900px)`; only review will catch
  it.

Risks:

* `chart-layout.ts` now resolves the zoom at runtime. If `currentZoom()` and the
  CSS breakpoint ever disagree, the portfolio charts mis-size — the two must be
  changed together. Both cite this DDR.
* `zoom` remains non-standard (DDR-002's risk). Unchanged: a browser without it
  renders everything at 100%, which after this DDR is exactly the mobile
  rendering — a strictly safer degradation than before.

Accessibility:

* Body text on a phone returns from ~12px to 16px; touch targets from ~33px to
  ≥ 44px (WCAG 2.5.5).
* User zoom still multiplies on top of the root zoom, so WCAG 1.4.4 (Resize text)
  remains satisfied, as in DDR-002.
* Contrast is scale-invariant: the DDR-001 / DDR-005 §7 AA baseline is unaffected.
* Verified with axe at phone, tablet, and desktop widths in both colour schemes.

## Related Documents

* `docs/design-decisions/DDR-001-figma-ui-redesign.md` — the design system this
  extends (tokens, typography, spacing, px geometry)
* `docs/design-decisions/DDR-002-global-display-density.md` — **amended**: the
  `zoom: 0.75` it establishes now applies to desktop only
* `docs/design-decisions/DDR-005-filter-bar-pattern.md` — the filter bar given a
  touch form here
* `docs/decisions/ADR-008-ui-embellishment.md` — the accessibility baseline
* `docs/roadmap.md` — Mobile-Responsive UI milestone
* `CLAUDE.md` — UI / Design system + accessibility conventions

## Addendum — the filter bar collapses by default on a phone (2026-07-14)

> Amends §3, "Filter bar (DDR-005) on touch". The touch **form** of the bar is
> unchanged; what changes is that it is no longer open by default at the phone stop.

§3 gave the bar a touch form — full-width search, full-width facet popovers,
wrapping grade chips — but left it, like on desktop, permanently expanded. In
use that is the wrong default. Stacked at 100% density with 44px controls, the
bar is a full phone screen tall on its own: search, four facet triggers, a
seven-chip grade scale, and two year bounds. The coin list — the reason the page
exists — starts below the fold, so the phone user pays the full cost of a control
surface they use occasionally on every visit, including the ones where they only
want to look at their coins.

At the **phone** stop the bar is therefore collapsed behind a toggle:

* A full-width **`Filters`** trigger sits where the bar was, showing the number of
  active filters (`Filters · 3`) so a collapsed bar can never hide the fact that
  the list is filtered. It is `aria-expanded` + `aria-controls` on the bar.
* The **active-filter chip row and clear-all stay outside the collapsible region**
  and remain visible whether the bar is open or shut. §3's reasoning holds and is
  in fact why this works: on a phone the chips are the user's view of what is
  applied, and they are also the fastest way to *remove* a filter, so a collapsed
  bar loses no reachability.
* Default state is collapsed. Filter state is not persisted across mounts
  (`EMPTY_FILTERS` on load), so a freshly-mounted bar is always empty — there is
  no case where the page opens shut on filters the user cannot see.

Above the phone stop nothing changes: the bar is always open, and the toggle is
not rendered at all.

The collapse is CSS-driven, not viewport-detecting: the component always renders
the toggle and the bar, marks the bar `data-open={open}`, and `globals.css` hides
the trigger outside the phone stop and honours `data-open` only within it. So the
desktop bar cannot be collapsed by a stale bit of client state, and there is no
breakpoint check in JS to drift from the one in CSS — the same discipline §3 used
to justify restyling the coin table's DOM instead of rendering a second card
component.

Rejected: **auto-expanding when filters are active.** The count on the trigger
already carries that information, and a bar that decides for itself whether to
occupy the screen is harder to predict than one that stays where the user left it.
