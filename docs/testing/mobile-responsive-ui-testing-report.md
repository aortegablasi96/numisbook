# Testing Report — Mobile-Responsive UI

Date: 2026-07-14
Milestone: Mobile-Responsive UI (`docs/roadmap.md`)
Decision record: `docs/design-decisions/DDR-006-responsive-layout.md`

## Summary

The milestone is verified. The app is usable on a phone: full-size text, ≥ 44px
touch targets, no horizontal overflow on any surface, a card-based coin list, a
touch-operable filter bar, and a 3-coin cost-breakdown chart. Desktop rendering is
unchanged. Three defects were found during verification and fixed; two of them were
pre-existing bugs that the density change exposed rather than caused.

## Automated gates

| Gate | Result |
| --- | --- |
| `npm run lint` | pass — no ESLint warnings or errors |
| `npm run typecheck` | pass |
| `npm test` | pass — 263 tests, 29 files (includes i18n catalog parity for the 3 new keys × 7 locales) |

No unit tests were added. The change is CSS and layout geometry, which
`vitest.config.ts` (`environment: "node"`, no DOM) cannot render — the gap this
milestone's successor, *Accessibility Checks in CI*, exists to close. Verification
was therefore done in a real browser, below.

## Browser verification (Playwright, Chromium)

### The premise, measured

The root cause recorded in DDR-006 was measured directly rather than assumed. On a
390px viewport with the old `zoom: 0.75`:

| Measure | Before | After |
| --- | --- | --- |
| `documentElement.clientWidth` (layout width) | 520px | **390px** |
| Root zoom | 0.75 | **1** |
| Body font size (rendered) | ~12px | **16px** |
| `@media (max-width: 400px)` on a 390px phone | matched | matches |

Media queries were evaluating against the real viewport while boxes laid out in a
space 1.333× larger. Below the tablet stop the two now coincide.

### Horizontal overflow (`scrollWidth − clientWidth`)

Zero on every page × viewport tested. Pages: `/`, `/coins`, a collection, a coin
detail, `/portfolio`, `/settings`. Viewports: 360, 390, 768, 1100, 1440.

### Density and chart geometry across the scale

| Viewport | Zoom | Layout width | Cost-chart axis | Chart height |
| --- | --- | --- | --- | --- |
| 1440 × 900 (desktop) | 0.75 | 1430 | 90px | 740 |
| 1100 × 800 (laptop) | 0.75 | 1090 | 90px | 607 |
| 768 × 1024 (tablet) | 1 | 758 | 90px | 564 |
| 390 × 844 (phone) | 1 | 380 | 60px | 384 |
| 360 × 740 (phone) | 1 | 350 | 60px | 320 (clamped) |

**Desktop is bit-for-bit unchanged.** `useChartHeight` was rewritten to resolve the
zoom at runtime and to hold its chrome constant in nominal px; at 1440 × 900 it
returns 740 and at 1100 × 800 it returns 607 — identical to the old formula's
output, confirming the refactor is behaviour-preserving where the zoom is unchanged.

### Coin list card form (phone)

- Table `thead` hidden, rows relaid out as cards (`display: flex`), thumbnail
  shrunk 160px → 64px, obverse only.
- Sort control appears (hidden on desktop); column picker hidden (visible on
  desktop).
- Empty-cell handling verified in both directions with the same `ColState`: with a
  sparse column enabled, the desktop table renders `—` and the phone card **hides**
  the cell, leaving no stray middot separator.
- Desktop re-checked after the change: `thead` shown, rows are `table-row`, both
  thumbnails present, column picker visible.

### Filter bar (touch)

Facet popover expands **in place** (`position: static`, 348px wide, on-screen,
44px rows) rather than floating; the page does not overflow while it is open.

### Cost-breakdown chart

3 coins across the visible plot on a phone (slot 85px in a 256px viewport), the
remaining 8 scrolling — the roadmap's explicit requirement. Thumbnails now derive
from the slot width, so they cannot overlap when slots narrow.

### Accessibility

**axe-core 4.10.2, WCAG 2.0/2.1 A + AA: 30 scans (5 pages × 2 colour schemes × 3
viewports) — zero violations.**

Touch targets: all buttons, selects, and nav links ≥ 44px on a phone. Inline links
inside card metadata remain inline-in-text (exempt under WCAG 2.5.8 and above the
24px minimum regardless).

No console errors on a clean load of any page. (A hydration warning seen during
testing was an artifact of the test harness setting `data-theme` post-render, not
app behaviour — confirmed absent on clean loads.)

## Defects found and fixed

1. **Coin detail overflowed a phone by 146px.** `.coin-side { flex: 0 0 520px }`
   was declared *after* its own responsive override at equal specificity, so the
   override had always been dead code and the rail kept a hard 520px width. This is
   **pre-existing** — invisible on desktop, where the zoomed layout was wide enough
   to hide a 520px rail. Fixed by ordering the override after the base rule. Exactly
   the class of bug DDR-006 predicts from breakpoints that never meant what they
   said.
2. **Chart plots were not keyboard-scrollable** (axe `scrollable-region-focusable`,
   serious). Also **pre-existing** on desktop; the phone layout made both charts
   scroll, doubling it. Fixed with `tabIndex={0}` on `.chart-scroll` in both charts.
3. **The phone sort control could not express the default sort.** `createdAt`
   ("recently added") is a valid API sort key with no column, so the select fell
   back to a disabled `—`. Fixed by offering it as an explicit option
   (`coins.sortRecent`).

## Remaining issues

None blocking.

- The breakpoint scale is a convention, not a compile-time constraint — a
  contributor can still write a fourth width; only review catches it (DDR-006,
  Risks).
- Column visibility and order remain a desktop-only choice. The card list honours
  whatever the user last chose, but the choice cannot be made on a phone.
- The density step at the 1024px boundary (a tablet renders ~33% larger than a
  laptop 80px wider) is accepted and recorded in DDR-006.
