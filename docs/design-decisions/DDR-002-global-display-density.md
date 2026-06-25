# DDR-002 Global Display Density (75% root zoom)

## Status

Accepted

## Date

2026-06-25

> Builds on **DDR-001** (the "stone & gold" Figma re-skin); it does **not**
> supersede it. DDR-001's tokens, typography, spacing scale, and the exact px
> geometry recorded across its addenda all stand unchanged. DDR-002 adds a single
> global scale factor on top of that system.

## Context

The NumisBook UI was designed and tuned (DDR-001 and its addenda) against the
Figma "stone & gold" source, with many values pinned to exact pixels: the page
gutter, the 84px header, the 520px coin-detail rail, the 4px spacing scale, the
coin-detail attribute tiles, and the portfolio chart geometry (`SLOT`, the
viewport-derived `useChartHeight`, coin-thumbnail diameters).

In practice the owner viewed and preferred the app at **75% browser zoom** — it
reads as denser and better balanced on wide monitors, where the nominal (100%)
scale leaves the composition feeling large. The production deployment (viewed at
100%) therefore looked different from the local view the owner had been working
against. The two screenshots that prompted this (`docs/local version
screenshot.png` at 75%, `docs/production version screenshot.png` at 100%) are the
same page and the same code — the only difference was browser zoom.

The goal: make the preferred 75% density the **default**, for every user, on
every screen, without per-component rework.

## Decision

Apply **`zoom: 0.75` to the root `html` element** in `src/app/globals.css`.

```css
html {
  zoom: 0.75;
}
```

This scales the entire rendered application — type, images, SVG charts, spacing,
borders, radii — by a single uniform factor, so every proportion DDR-001
established is preserved. No design tokens, component styles, or chart constants
are changed; DDR-001 remains the single source of truth for the *relative*
design, and DDR-002 sets the *absolute* display scale.

`zoom` is chosen over `transform: scale(0.75)` because `zoom` participates in
normal layout (it reflows and resizes the layout box), so sticky/fixed elements
(the sticky `SiteHeader`, the fixed assistant FAB and chat panel), dialogs,
scrolling regions, and the responsive media queries all continue to behave
correctly. `transform: scale` would leave the original box size, causing overflow
and misplaced fixed elements.

## Consequences

Benefits:

* The whole app renders at the preferred density from one line; no per-screen or
  per-component edits, and no risk of drifting from DDR-001's recorded px values.
* Trivially reversible and tunable — change or remove the one declaration.
* Faithful to what the owner actually saw and approved (literal 75% zoom).

Tradeoffs:

* Effective base body text drops from ~16px to ~12px. Still legible, but at the
  small end of comfortable; this is the reason the change is recorded as a design
  decision rather than a silent tweak.
* The portfolio "fit-to-viewport" charts derive their height from the unzoomed
  `window.innerHeight` (`useChartHeight`), so the page now renders shorter than
  the viewport (some empty space below) instead of filling it exactly. Cosmetic;
  not corrected here to avoid coupling chart code to the global scale.
* Users who preferred the 100% scale now see a denser UI. Mitigated by browser
  zoom (see below).

Risks:

* `zoom` is widely supported across current Chrome, Edge, Firefox (126+), and
  Safari, but is a non-standard (though now broadly implemented) CSS property. If
  a target browser ever lacks it, the app simply renders at 100% — a graceful
  degradation, not a breakage.

Accessibility:

* `zoom` does **not** disable user zoom; a user's own browser zoom multiplies on
  top, so text remains resizable well beyond 200% — WCAG 1.4.4 (Resize text) is
  preserved.
* Colour contrast is scale-invariant, so the WCAG 2.1 AA baseline from DDR-001 §4
  and ADR-008 is unaffected.
* Focus outlines, the skip link, `.sr-only` labels, and `prefers-reduced-motion`
  handling are unchanged.

## Alternatives Considered

### Option A — Root `zoom: 0.75` (chosen)

Uniform global scale, one declaration, reflows normally, preserves all DDR-001
proportions and fixed/sticky behaviour. Tradeoff: small effective font size.

### Option B — Re-scale the design tokens to 75%

Multiply the type scale, the 4px spacing scale, the container gutter, header
height, coin rail, thumbnails, and the chart TS constants throughout
`globals.css` and the chart layout module. Rejected: invasive, rewrites the exact
px values DDR-001 deliberately records, touches many files, risks visual drift,
and needs far broader re-verification — for an outcome visually equivalent to the
one-line zoom.

### Option C — Leave at 100%, document Ctrl+0 / browser zoom

Do nothing in code; tell users to zoom their browser. Rejected: the owner wants
the preferred density to be the product default, not a per-user manual step.

## References

* docs/design-decisions/DDR-001-figma-ui-redesign.md — the design system this
  scales (tokens, typography, spacing, px geometry)
* docs/decisions/ADR-008-ui-embellishment.md — the accessibility baseline
* CLAUDE.md — UI / Design system + accessibility conventions
* docs/roadmap.md — Additional Settings milestone (a future "night mode" /
  display-preferences pass could expose this scale as a user setting)
