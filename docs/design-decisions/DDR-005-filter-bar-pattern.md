# DDR-005 Filter bar pattern (multi-select facet popover + active-filter chips) and the Coins nav destination

Status: Accepted

Date: 2026-07-12

## Context

The **Rework Filters** milestone (ADR-015) widens coin filtering from three
single-select controls to a multi-select set spanning metal, category,
denomination, mint, grade, and a year range — and introduces a second place where
that filter bar lives: a new cross-collection **`/coins`** view, alongside the
existing per-collection coin table.

Two design problems follow. First, `<select>` cannot express multi-select
acceptably, so the facet controls need a new affordance. Second, once several
filters can be active at once, the user needs to see *what* is filtering the list
and undo it — today's bar has neither an indicator nor a working clear-all.

Two facts about the existing design system shape this decision:

- **`.chip` already exists and was built for this.** `globals.css` styles
  `.chip[aria-pressed="true"]` and `.chip.is-active` with a gold-tint background,
  gold border, and `--accent` text — an active-filter appearance nobody had yet
  used for filters.
- **A popover pattern already exists.** `.col-picker` (the coin table's column
  picker) is an anchored, surfaced, shadowed dropdown holding a list of toggles —
  structurally the same thing a multi-select facet needs.

So this DDR mostly *names and generalizes* patterns the system already contains,
rather than adding to it. No new tokens, no new colours, no new dependency
(consistent with the standing ban on CSS-in-JS and component frameworks).

## Decision

### 1. Facet filters — anchored multi-select popover

Metal, Category, Denomination, and Mint become **dropdown buttons**, not
`<select>`s. Each button shows the field name plus an active count (`Metal · 2`);
clicking opens a `.col-picker`-style popover containing a scrollable list of
checkboxes. The popover closes on Escape, on outside click, and stays open while
values are ticked (multi-select). The button carries `aria-haspopup` and
`aria-expanded`; focus returns to it on close.

### 2. Grade — inline toggle chips, not a popover

Grade is a fixed, ordered 7-value scale (`G → MS`, ADR-006). It renders as inline
`.chip` toggle buttons **in scale order**, using the existing
`.chip[aria-pressed]` contract. Direct manipulation, no click-to-open, and the
left-to-right ordering communicates the scale itself. A popover here would hide a
small, ordered, meaningful set behind a click for no benefit.

### 3. Year — two signed number inputs, matching the coin form

The year range is two number inputs (From / To) where **a negative value means
BC** — exactly how the coin add/edit form already accepts `yearFrom`/`yearTo`.
Users have already learned this convention in the form; a separate AD/BC selector
in the filter would be a second grammar for the same field. A live hint renders
the parsed range back (`300 BC – 100 AD`) via the existing `formatYearRange`
helper, so the convention teaches itself.

### 4. Active-filter chip row + clear-all

Beneath the filter bar sits a **second row**, present only when at least one
filter is active: one removable `.chip` per active value (each remove control
carries an `.sr-only` label — "Remove filter Metal: Silver"), the result count,
and a **Clear all** control (disabled when nothing is active, as today's Clear
button already is). The row's absence when unfiltered keeps the default view no
busier than it is now.

The chip row is what makes the OR-within/AND-across semantics legible without
stating the rule.

### 5. Coins as a top-level nav destination

The nav becomes **Collections · Coins · Portfolio**. `/coins` is a *sibling* of
Collections, not a child: it is another way of seeing the same inventory, so it
belongs at the same depth (shallow navigation over nested). The dashboard's
"View all →" repoints from `/collections` to `/coins`.

`/coins` is **read-only** — no Add button, no inline edit form. There is no
sensible answer to "which collection does this new coin go into?" from a
cross-collection view, and bolting a collection picker onto the create flow would
duplicate a workflow that already works in context. Rows link to the coin detail,
where editing lives. A **Collection** column (linking back to the owner
collection) appears on this table only.

### 6. Responsive & accessibility

`.filters` already wraps, so the bar reflows with no change; facet popovers anchor
full-width below their button under ~480px. The table stays inside `.table-wrap`.
The result count is wrapped in `aria-live="polite"` so screen-reader users hear
the list narrow as they filter. Verify with axe in light and dark.

### 7. `--accent` deepened to #7f5612 (corrects DDR-001)

Contrast is inherited from the theme tokens — but this decision originally
asserted that `--accent` on `--accent-weak` was "already AA in both schemes", and
**that was wrong in light mode**. The pairing had no user before this milestone,
so it had never been measured in place.

The filter bar is the first UI to put gold text on the gold tint *outside a card*.
On the stone `--bg`, `--accent-weak` composites to `#e6decd` rather than the near-white
`#f6f1e4` it makes on `--surface`. DDR-001 verified `#8a5f15` at 5.6:1 on white, but
on that darker tint it is only **4.2:1 — below the 4.5:1 AA floor** for the 12–13px
active-filter chips and the year-range hint badge (axe: `color-contrast`, serious).

`--accent` is therefore deepened to **`#7f5612`** in the light theme: 4.8:1 on the
tint, 6.5:1 on white. This *upholds* DDR-001's rule (the deep gold is the one that
carries gold text at AA) by correcting a value that failed it; the gold-for-fills
stance is untouched, and white-on-gold buttons improve from 5.6:1 to 6.5:1. Dark
mode is unaffected (`#e7ba5c` already passes on its tint).

Any future gold text on a tint must be checked against `--bg`, not just `--surface`
— that is the case the token contract had missed.

## Alternatives Considered

### Option A — Facet popover + grade chips + chip row (chosen)

Pros:
* Reuses `.chip`, `.col-picker`, `.filters`, `.badge`, `.empty` — no new visual
  vocabulary, and one pattern serves both coin surfaces.
* Multi-select is expressible; active state is visible and individually
  reversible.

Cons:
* A popover is a heavier affordance than a `<select>` and needs its own keyboard
  and dismissal handling.
* Facet lists are unbounded on `/coins` (dozens of mints) — scrolling only, for
  now.

### Option B — Native `<select multiple>`

Pros:
* Zero new components; fully accessible for free.

Cons:
* Notoriously poor UX (ctrl-click to multi-select, awkward sizing, bad on touch)
  and unstylable within the design system. Rejected.

### Option C — All filters as inline chips (no popovers)

Pros:
* The simplest possible interaction; no dismissal logic at all.

Cons:
* Works for grade's fixed 7 values, but metal/mint/denomination facets are
  open-ended — rendering every distinct value inline would flood the toolbar.
  Adopted for grade only; rejected as the general pattern.

### Option D — Filter sidebar / drawer

Pros:
* Room for many filters; a familiar e-commerce convention.

Cons:
* Costs horizontal space on a data-dense table, adds a screen region the app does
  not otherwise have, and buries filters behind a toggle on mobile. Rejected as
  disproportionate to seven filters.

## Consequences

Benefits:
* One filter component, one interaction model, used by both coin surfaces — the
  consistency the milestone asks for.
* Active filters are visible and individually reversible; clear-all finally works.
* Coins get a first-class home in the nav, and the dashboard's "View all →" leads
  somewhere real.

Tradeoffs:
* The chip row appearing/disappearing on the first filter causes a small layout
  shift; reserving the space permanently would cost more than it saves.
* `/coins` being read-only means the add/edit affordances differ between the two
  coin tables — deliberate, and justified by the missing-collection problem.

Risks:
* Column state is persisted under `numisbook:coin-columns-v4`; the global table
  has a different column set (it adds Collection), so it **must** use its own
  versioned key or the two views will corrupt each other's layout.
* Long facet lists in a scrolling popover are usable but not pleasant; a
  type-to-filter box inside the popover is the expected follow-up.

## Addendum — type-to-filter inside long facet popovers (2026-07-16)

> Discharges the second Risk above ("Long facet lists in a scrolling popover are
> usable but not pleasant; a type-to-filter box inside the popover is the expected
> follow-up"). The facet pattern of §1 is unchanged; this adds a way to narrow the
> list inside it.

A facet popover on `/coins` lists every distinct value the user's coins carry.
That is fine at six metals and unpleasant at sixty mints, where finding a value
means scrolling a 16rem panel. A text box at the top of the popover now narrows
the checkbox list as the user types.

* **Only above ten values** (`FACET_SEARCH_THRESHOLD`). Short facets are unchanged.
  A search box over six checkboxes is visible clutter and an extra tab stop, and
  the risk this addendum answers only bites on the open-ended facets — mints and
  denominations. The cost is a variable affordance: the box is present on one
  popover and absent on the next. That is accepted, because the alternative is
  paying for a long-list tool on every short list to make the *absence* of a
  problem look consistent.
* **Matching is case- and accent-insensitive.** Catalogue data is full of
  diacritics ("Zürich", "Kraków") that a user typing quickly will not reproduce, so
  values are folded (NFD, diacritics stripped, lowercased) on both sides before the
  substring test. Matching is a plain substring, not a prefix: "ome" finds "Rome".
* **Narrowing never selects.** The query filters what is *shown*; a selected value
  that stops matching stays selected and keeps its chip in the active-filter row of
  §4. That row is what makes this safe — it is already the user's account of what is
  applied, so a value can leave the popover's view without leaving their view.
* **Escape keeps one meaning: close the popover.** §1 gave the key a single job.
  A two-stage Escape (clear the query, then close) is a rule only its author
  remembers, and the query is discarded on close anyway.
* **The box is not autofocused.** On desktop autofocus would be the obvious choice.
  But DDR-006 makes the phone popover expand *in place* rather than float, so
  autofocus raises the on-screen keyboard directly over the results being narrowed.
  The input is the first tab stop instead, which costs a keyboard user one Tab and
  costs a phone user nothing.
* **The query resets when the popover reopens.** A remembered query would silently
  hide values from the next visit to that popover — the one state where the panel
  could lie about what the facet contains.
* An empty result renders the existing `.col-picker-hint` ("No matches"), reusing
  the affordance already there for an empty facet, and the box is `position: sticky`
  because the popover itself is the scroll container.

This stays presentation-only: facets are already fetched in full, so filtering is
client-side over an in-memory array. Nothing touches the API, the service, the
repository, or the query contract of ADR-015. Both coin surfaces get it at once,
from the one shared component — the consistency §1 was built for.

Rejected: **server-side facet search.** It would add a round-trip per keystroke,
a new endpoint, and a debounce, to filter a list already sitting in the client.

## Related Documents

* docs/decisions/ADR-015-coin-filter-rework.md
* docs/design-decisions/DDR-001-figma-ui-redesign.md
* docs/design-decisions/DDR-003-dark-mode.md
* docs/decisions/ADR-006-coin-and-valuation-attribute-rework.md
* docs/roadmap.md
