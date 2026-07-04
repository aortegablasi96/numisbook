# DDR-001-Figma UI Redesign

Status: Accepted (light-only decision **superseded by DDR-003**)

Date: 2026-06-16

> **Update (2026-07-03):** the **light-only** stance below (a single `:root`
> scheme, no dark variant) is **superseded by DDR-003 (Dark Mode)**, which adds a
> warm dark theme driven by the same tokens. Everything else in DDR-001 — the
> "stone & gold" palette intent, typography, spacing scale, geometry, and the
> gold-for-fills / AA-gold-for-text contrast rules — **still stands** and is
> extended (not replaced) by DDR-003's `--on-gold` seam.

> Relocated from the architecture decisions (it was originally an ADR) to the
> Design Decision Records: this is a visual/UX decision (no route, service,
> repository, API, or data-model change), so it belongs with the DDRs. Its
> former ADR number was reused for the UX & Feature Refinement ADR once the gap
> was closed, so this record is now **DDR-001**. Section numbering (§1–§5) and
> addenda are unchanged; references elsewhere now point to **DDR-001**.

## Context

The **Figma UI Redesign** milestone (`roadmap.md`) re-skins NumisBook to the
agreed "stone & gold" design — a warm, editorial look with serif display type —
captured in the Figma Make file *Coin Collection Management SaaS*
(`fileKey 3whQq5SMmW1rjEn4ZwOc0G`). It is a **visual** redesign only: the
App-Router routes, the `app → services → repositories → db` flow, the data model
(derived coin title, price-paid + valuations, multi-currency base currency) and
the API are unchanged. Every screen the Figma covers already exists.

The Figma source is built in **Tailwind + shadcn/ui + recharts + lucide-react**.
ADR-001/008 and `CLAUDE.md` forbid adopting that stack: the project's UI is a
**dependency-free design system in `src/app/globals.css`** with hand-rolled SVG
charts. So the decision is *how* to translate the Figma's visual language into
that system without importing its stack, plus two unavoidable judgement calls the
roadmap flagged: **dark mode** and **gold contrast**.

## Decision

### 1. Translate the visual language into `globals.css`; do not adopt the Figma stack

The Figma code is a **reference for look-and-feel and tokens, not a component
library to import.** The re-skin is delivered by re-mapping the existing
design-system tokens and utility classes, so the change cascades to every screen
that already consumes `.card`, `.data-table`, `.btn-primary`, `.chip`, the chart
classes, etc. No Tailwind, shadcn, recharts, lucide, or CSS-in-JS is added; the
dependency-free SVG charts (`TrendChart`, `CostBreakdownChart`) are re-skinned in
place via their existing CSS hooks rather than replaced with recharts.

The token re-map (light scheme):

* background `#ECEAE5`, surface/card `#FFFFFF`, muted/secondary `#F4F1EC`,
  foreground `#1C1917`, border `rgba(28,25,23,0.10)`.
* brand gold `#B8871E` (`--gold`); destructive `#DC2626`.
* radii on a `0.625rem` base with sm/md/lg/xl steps; cards use `xl`.
* chart palette `#B8871E, #5A8A6A, #4A7A9B, #8A4A3A, #6A4A8A`; the cost-breakdown
  segments are gold (hammer) / muted (premium) / light-stone `#C4BFB8` (shipping).
* a dark ink surface (`--ink #1C1917`) for the assistant header + FAB.

### 2. Typography via `next/font`, exposed as CSS variables

Fonts are **self-hosted with `next/font/google`** (Fraunces, DM Sans, DM Mono) in
`src/app/layout.tsx`, exposed as the CSS variables `--font-serif` / `--font-sans`
/ `--font-mono` and consumed by `globals.css` (`--font-display`, `--font-body`,
`--font-micro`). `next/font` is built into Next 15 (no new dependency), fetches
at build time (not per request), and eliminates layout shift. Roles:

* **Fraunces** (serif, light weight) — `h1–h3` and large display numerals
  (stat-card values, the portfolio total).
* **DM Sans** — body and UI.
* **DM Mono** — the uppercase letter-spaced micro-labels (the new `.mono-label`
  utility: stat captions, table headers, field labels, chart axes).

### 3. Dark mode — drop it; ship light-only

The Figma is light-only (its `.dark` tokens duplicate the light ones). The app
previously themed via `prefers-color-scheme`. **We remove the dark-mode media
block and ship a single light scheme** (`color-scheme: light`), matching the
design source's own decision. This is faithful and halves the accessibility
surface (axe need only pass in one scheme). Deriving a bespoke dark "stone & gold"
variant would be net-new design the Figma does not specify; deferred unless a
future milestone calls for it.

### 4. Gold contrast — keep the bright gold for fills; use accessible variants for text

Brand gold `#B8871E` fails WCAG AA as text on light surfaces (≈3.2:1 for white
on gold; ≈4.0:1 for the gold itself on white). Accessibility is a standing
constraint (ADR-008 §3), so:

* `--gold #B8871E` is reserved for **fills/decoration** — primary-button
  background, active chip/tag tints, the circular "N" logo, focus ring, chart
  series, the area-chart fill.
* `--accent #8a5f15` (a deeper gold, ≈5.6:1 on white) carries **gold text** —
  links, badges, `.mono-label`s shown in gold, active chip text.
* primary actions use the bright gold fill with **ink text** (`--primary-text
  #1C1917`, ≈5.5:1) rather than the Figma's white-on-gold (≈3.2:1, fails). This
  applies uniformly to `.btn-primary`, the assistant send button, and the user
  chat bubble.
* `--muted` (secondary text) is darkened from the Figma's `#78716C` to `#6a635d`,
  because `#78716C` is only ≈4.0:1 on the stone background — under AA for body
  text. `#6a635d` clears AA on both the stone background and white cards.

The visible "gold" therefore stays faithful to the Figma; only text-bearing gold
and muted text are nudged for contrast. Verified **axe-clean** (WCAG 2.1 AA) on
the dashboard, portfolio, and coin-detail pages in the shipped light scheme.

### 5. Shell specifics

A small client component `HeaderNav` (`usePathname`) renders the primary nav with
an **active-state pill** (coin/collection-detail routes keep "Collections"
active); the surrounding `SiteHeader` stays a Server Component for the session and
sign in/out server actions. The back-link "crumbs" become proper **chevron
breadcrumbs with gold links** (Collections › collection › coin title); the
coin-detail page fetches the owning collection's name (owner-scoped, cheap) for
the middle crumb.

## Alternatives Considered

### Adopt the Figma's Tailwind + shadcn + recharts stack

Pros: copy components verbatim; fastest path to pixel parity.
Cons: contradicts ADR-001/008 and the design-system rule; adds heavy
dependencies (Tailwind toolchain, Radix, recharts) for a re-skin of an app that
already renders these screens with ~1.4k lines of CSS and SVG charts. Rejected.

### Load fonts via a `<link>` to Google Fonts

Pros: no build-time font fetch.
Cons: runtime request, FOUT/layout shift, not self-hosted, an external dependency
on every page load. Rejected in favour of `next/font` (self-hosting, no shift).

### Keep / derive dark mode

Pros: retains the existing `prefers-color-scheme` behaviour.
Cons: the Figma specifies no dark palette, so a credible dark "stone & gold" would
be invented design plus a doubled accessibility-verification burden, for a
milestone scoped as "re-skin to the agreed design". Rejected (see §3).

### Use the Figma's white-on-gold buttons as drawn

Pros: exact colour match.
Cons: ≈3.2:1 contrast fails AA for button labels. Rejected in favour of ink-on-gold
(§4), a small, documented deviation that preserves the gold while meeting AA.

## Consequences

Positive:

* The whole app re-skins by re-mapping tokens + utility classes; screens that use
  the shared classes inherit the new look with little or no per-component change,
  and the SVG charts re-skin through their existing CSS hooks.
* No new runtime UI dependency; the build, the 121-test suite, and lint stay green.
* One light scheme to design and verify; axe-clean confirmed against the new
  tokens, honouring the ADR-008 accessibility baseline.
* Routes, services, repositories, API, and the data model are untouched — the
  redesign carries no behavioural or tenant-isolation risk.

Negative / tradeoffs:

* Dropping dark mode is a visible change for users who preferred the OS-dark
  theme; they now see the warm light theme. Reversible only by the deferred work
  in §3.
* The shipped palette deviates from the Figma in three accessibility-driven spots
  (button/bubble text colour, the deeper gold for text, the darkened muted) —
  intentional and recorded here so it is not "corrected" back to the failing
  values later.
* `next/font` adds a build-time font fetch; offline builds fall back to the
  serif/sans/mono stacks declared alongside each variable.

## Addendum — design-system consolidation (2026-06-16)

After the initial re-skin shipped, a consolidation pass turned the still-ad-hoc
styling into an explicit token system and propagated it across **every** screen
(the redesign brief: the whole app should read as one product, not one updated
page). No routes, services, repositories, API, or data-model changes — UI layer
only.

* **Token scales added to `globals.css`** beyond colour/radius/font: a 4px
  **spacing scale** (`--space-1 … --space-16`), an **elevation scale**
  (`--shadow-sm … --shadow-xl`, warm-ink tinted), and **motion tokens**
  (`--ease`, `--dur-fast`/`--dur`/`--dur-slow`). Shared components were moved
  onto these instead of ad-hoc rem/px and a single flat shadow: cards sit at
  `--shadow`, the column-picker/dialog at `--shadow-lg`, the chat panel at
  `--shadow-xl`; button/nav/chip/card transitions use the motion tokens.
* **Coin-detail screen** aligned to the Figma's **attribute-tile grid**
  (`.attr-grid` / `.attr-tile`): key attributes (metal, denomination, category,
  year, mint, condition, weight, diameter) render as compact muted tiles, and
  the free-text characteristics line was retired in favour of them.
* **Spacing / consistency fixes** (the remaining issues): container widened
  1200 → **1320px** so desktop layouts use the screen; the dashboard feature-card
  grid switched from `auto-fill` (which left empty phantom tracks, squashing the
  cards left) to `auto-fit`; the coin-list thumb column now hugs its images with
  the **title column absorbing the slack** (Figma's `Name = 1fr`) so columns
  stop floating mid-row; card padding normalised onto the scale; page rhythm set
  to the Figma's `pt-10`/`pb-16`; a thin custom scrollbar added; and the
  portfolio "total paid" inline-collision spacing bug fixed.

The **1320px** container is a deliberate, documented deviation from the Figma's
1200px (the design source's width left too much desktop margin for this content).

## Addendum — match the Figma layout exactly (2026-06-17)

The initial re-skin (and the 1320px-container consolidation above) read as too
narrow on desktop — a centred column with wide empty margins. Rather than keep
re-interpreting "wider", the shell and dashboard were aligned **directly to the
revised Figma Make source's exact spacing values**. This addendum supersedes the
**1320px max-width container** decision in the previous addendum (and the
1200→1320 reasoning behind it). UI layer only — no routes, services, repositories,
API, or data-model changes. Verified against the running app (Playwright); the
computed values below match the Figma to the pixel.

* **`.container` is full-width with a flat 48px gutter** (`width: 100%;
  padding-inline: 3rem`, no `max-width`), per the Figma's `w-full px-[48px]` on the
  nav and every page; the gutter narrows to 20px below 768px where 48px would be
  too much. The header bar and page content share the one `.container`, so both
  align to the same gutter.
* **Dashboard restructured to the Figma's block layout.** The home page is no
  longer a uniform `.stack`; it mirrors the Figma: a **header block** (`.dash-head`
  — title + subtitle + "signed in" line, grouped, `margin-bottom: 32px`), then the
  **stat row** (`.stats`, `gap: 16px`, `margin-bottom: 24px`), then the **feature
  row** (`.cards`, `gap: 16px`). This fixed the real "no spacing between components"
  bug — `.stats`/`.cards` reset their own `margin: 0`, which had silently collapsed
  the stat row and feature row to ~0px apart.
* **Stat cards gained the Figma's top-right icons.** Each stat card has a header
  row (mono caption left, a muted 16px glyph right — folder / coins / trend) above
  the numeral (`.stat-head` / `.stat-icon`), so the wide cards don't read as empty.
* **Header is opaque.** `.site-header` drops the translucent `color-mix` background
  and `backdrop-filter` blur for a solid `--surface` fill, matching the Figma's
  flat `bg-card` nav (still sticky, still a hairline bottom border).
* **Stat numeral sizing split.** The dashboard money stat renders at a smaller
  serif size (`.stat-value.is-money`, ~1.6rem ≈ the Figma's 26px) than the count
  stats (2.5rem ≈ 40px), so the long currency string sits on the same baseline row.
* **Other gaps aligned to the Figma:** the coin-detail two-column split is
  `minmax(0, 1fr) 360px` with a `40px` gap (`gap-[40px]`, fixed 360px image rail,
  collapses ≤760px); the portfolio chart row gap is `20px` (`gap-[20px]`).
* **Row-action icons (rename/delete).** The list rows gained the Figma's
  `Pencil` / `Trash2` glyphs on their action buttons — `✎ Rename` + `🗑 Delete` on
  the collections list (`CollectionsManager`) and `✎ Edit` + `🗑 Delete` on the
  coin list (`CoinsManager`, including the `ConfirmButton` delete trigger). The
  icons are a new dependency-free shared primitive, `components/ui/icons.tsx`
  (`IconPencil` / `IconTrash` — lucide-style inline SVG, `currentColor` stroke,
  `size` prop; **no `lucide-react`**, per the design-system rule), aligned with the
  label by a `.btn-icon` utility (`inline-flex` + gap). Labels are **kept**
  alongside the glyphs (not icon-only), so the controls stay accessible without
  extra `aria-label`s.

The palette, radii, typography, chart colours, and component vocabulary are
**unchanged** from the sections above — this rework is shell geometry, the
dashboard block restructure, the stat-card icons, and the row-action icons.
Verified (Playwright) at desktop (1680px) and mobile (390px): side gutter **48px**,
header→stats **32px**, stats→features **24px**, card gaps **16px** — matching the
Figma.

## Addendum — primary button, create bar, and hover-reveal actions (2026-06-17)

A second pass aligning the collections "New collection" control to the Figma,
plus two interaction details. UI layer only.

* **Primary button colour — white text on the *deeper* gold.** The Figma's
  default button is `bg-primary (#B8871E) text-white`, which is only ~3.2:1 and
  **fails WCAG AA**. §4 above had resolved this with ink-on-gold; this pass instead
  keeps the Figma's **white-on-gold look** but moves the *fill* to the deeper gold
  `--accent` (`#8a5f15`, ~5.6:1 with white) so it clears AA. `.btn-primary` is now
  `background: var(--accent); color: #fff` (hover darkens `--accent`). The bright
  `--primary`/`--gold` stays reserved for fills, tints, borders, charts, and the
  logo. This **revises** the "ink on gold" choice in §4 (the contrast problem is
  still solved; the chosen resolution changed). Applied wherever the gold carried
  foreground content: the shared `.btn-primary`, plus the assistant's
  `.chat-send-btn` (white send glyph) and `.msg-user` chat bubble (white text).
  The now-unused `--primary-text` ink token was removed.
* **"New collection" placement + Plus glyph.** The toolbar now left-groups the
  filter input and the button with a 12px gap (Figma `flex items-center gap-[12px]`)
  instead of pushing the button to the far right with `space-between`. The button
  carries the Figma's `Plus` glyph (`IconPlus`).
* **Inline create bar.** Clicking "New collection" reveals a card-surface row with
  a faint gold hairline (`.create-bar` — `border: color-mix(--primary 30%)`,
  `radius-xl`, `padding: 14px 20px`, `gap: 10px`), a growing input, a `Check`+
  "Create" confirm, and a ghost-`X` cancel (Figma's inline create row). New shared
  glyphs `IconCheck` / `IconX` in `components/ui/icons.tsx`; new `.btn-ghost`
  variant (no chrome until hover). The ghost cancel is icon-only, so it carries an
  `aria-label`.
* **Row actions reveal on hover.** The rename/delete (and coin edit/delete) action
  group is `opacity: 0` until the row is hovered (`.row-actions`, matching the
  Figma's `group-hover:opacity-100`). It also reveals on `:focus-within` (so the
  controls stay reachable by keyboard `Tab`) and stays visible under
  `@media (hover: none)` (touch devices have no hover). Verified via Playwright on
  both the collections and coin lists.

Tooling note: `docs/` was added to `tsconfig.json`'s `exclude` so reference
snippets pasted under `docs/` (e.g. the Figma `*.tsx` dump, which imports
`recharts`/`lucide-react`) don't break `tsc --noEmit`.

## Addendum — coin-detail page alignment (2026-06-17)

A pass bringing the coin-detail page (`/coins/[id]`) in line with the Figma's
`CoinDetailPage`. UI layer only — no data, route, or service changes.

* **Left column is a stack of cards, not one monolithic panel.** The Figma puts
  the title and attribute chips directly on the page surface, then gives **each**
  notes section and the valuations **its own card**. `CoinDetailsCard` no longer
  wraps everything in a single `.card`: in view mode the title + `.attr-grid`
  render on the page surface, each notes block (`buildBlocks` — Obverse, Reverse,
  Catalogue references, Observations, Pedigree, Price paid, Obtained from) is a
  `.coin-note` card, and the embedded valuations sit in their own `.coin-valuations`
  card. The edit form keeps a single `.card` (the Figma has no edit state).
* **Coin title sized down.** A new `.coin-detail-title` renders the derived title
  at Fraunces 24px / `font-weight: 300` (Figma `text-[24px] font-light`), smaller
  than the page hero so the breadcrumb + chips read as the focus.
* **Attribute chips are borderless.** `.attr-tile` drops its `1px` border for a
  plain `--surface-2` fill, matching the Figma's `bg-muted` chips.
* **Edit is icon-only.** The view-mode "Edit" text button is now a pencil
  (`IconPencil`, `.btn-sm .btn-icon`), consistent with the list-row actions; it
  carries `aria-label="Edit coin"` + `title` since it is icon-only. (The coin-list
  Edit/Delete row actions were likewise reduced to icons in the same pass.)
* **Columns top-align instead of stretching.** `.coin-overview` switches from
  `align-items: stretch` to `align-items: start` (Figma `items-start`), so the
  image rail sizes to its own content rather than stretching to the left column's
  height.
* **Image rail matches the Figma's square, borderless treatment.** `CoinImage`
  drops its outer `.card` chrome; `.coin-image-card` is now a plain column and
  `.coin-photo-wrap` is a fixed `aspect-ratio: 1 / 1` square with `border-radius:
  16px` and a muted fill (Figma `aspect-square rounded-[16px] bg-muted`), instead
  of a `flex: 1` panel that grew vertically. The carousel, upload, remove, and
  lightbox behaviour are retained — the Figma's static obverse/reverse toggle is a
  mock simplification, so the richer multi-image rail is kept deliberately.

Accessibility is preserved: the icon-only edit button has an accessible name,
chip/heading contrast is unchanged, and the notes-card headings reuse the
`.mono-label` utility.

## Addendum — coin-detail rail, header & page spacing (2026-06-18)

A post-redesign polish pass over the coin-detail page (`/coins/[id]`), the global
header, and the page gutter. It **supersedes the relevant points of the
2026-06-17 "coin-detail page alignment" addendum** (which kept a prev/next
carousel, a letterboxed photo, the Figma's literal 360px rail, a 24px title, a
bordered icon edit, and a flat 48px gutter). It was reached through several rounds
of side-by-side comparison against the Figma screenshot; the values below are the
**settled final state** — intermediate iterations are not recorded. UI layer only:
no data, route, service, or API change; image endpoints (incl. the `?w=` thumbnail
resize) are unchanged.

**Coin-detail image rail — a gallery, not a carousel.**

* **Photo fills the rounded square.** `.coin-photo` uses `object-fit: cover`
  (Figma `object-cover`) instead of `contain`, which had letterboxed non-square
  photos and made the coin read small. The **lightbox still shows the full image
  uncropped**, so no detail is lost.
* **Selectable thumbnail strip** replaces the prev/next overlay arrows + counter
  (their CSS and chevron icons were removed). Below the photo, a wrapping grid of
  equal square thumbnails (`.coin-thumbs`, `repeat(auto-fill, minmax(72px, 1fr))`)
  lets the collector choose a picture; the active one carries a **gold 2px
  outline**. The strip shows only with two or more images.
* **"Picture N of M" caption — no obverse/reverse.** A `.coin-photo-caption`
  (`.mono-label`) reads `Picture {n}` (`of {total}` when several). NumisBook coins
  have an arbitrary number of images with no fixed roles, so the Figma's static
  "Obverse/Reverse" toggle is deliberately not adopted — pictures are numbered.
* **Larger photo via a wider rail.** `.coin-overview` is flexbox
  (`display: flex; align-items: flex-start`) — `flex: 1` left column +
  fixed-width image rail — spanning the full gutter-to-gutter width (no max-width
  cap). The rail is **520px**, a deliberate deviation from the Figma's `w-[360px]`:
  the Figma frame is only ~1524px wide, so its 360px image is ~24% of the canvas
  and reads large there, but on real wide monitors 360px reads small. The column
  **gap is 52px** (Figma `gap-[40px]`, widened for separation). Below **1160px**
  the columns stack (the wide rail would otherwise squeeze the left column); the
  stacked image is capped at 520px.
* **Title and edit affordance.** `.coin-detail-title` is **30px** (`1.875rem`,
  Fraunces 300), up from the 24px the 2026-06-17 pass had set. The title-row edit
  pencil (`.coin-edit-btn`) is a borderless icon, enlarged to a **20px** glyph; on
  hover it does **not** paint a background chip — the glyph thickens
  (`stroke-width` 2 → 2.75) and shifts to the accent gold.
* **Larger attribute tiles.** The key-attribute grid (`.attr-grid`) moved from
  small auto-fitting `132px` tiles to a **fixed 4-column** layout with roomier
  tiles (padding `--space-3`/`--space-4`, label 0.72rem, value 1.05rem) so the
  attributes read at a comfortable size, echoing the Figma's larger chips. It
  steps down responsively — 3 columns ≤900px, 2 ≤640px, 1 ≤400px.

**Global header — more presence.** `.site-header .bar` `min-height` is **84px**
(was 56px), with the brand wordmark at **1.35rem** and the nav links at **1.05rem**
to suit the taller bar.

**Page gutter — viewport-scaled, supersedes the flat 48px.** `.container`
`padding-inline` moved from a flat 48px (Figma `px-[48px]`) to
`clamp(2rem, 2.6vw, 5.5rem)`. The flat value read as a thin margin on wide
monitors (48px is ~3% of the Figma's ~1524px frame but a far smaller fraction of a
1920/2560px screen); the clamp keeps tight margins on small screens (**32px** min)
and grows on large ones (**~88px** cap), shell-wide so the header and page content
stay gutter-aligned. Phones still drop to 20px (the `≤768px` media query).

Accessibility preserved: each thumbnail is a `<button>` with
`aria-label="Show picture N"` and `aria-current` on the active one (selection
isn't signalled by colour alone), keyboard-focusable with the standard
`:focus-visible` outline; the icon-only edit button keeps its accessible name;
upload, remove, and the lightbox are retained. Verified via Playwright at 1024 /
1512 / 2560px.

## Addendum — portfolio page alignment (2026-06-18)

A pass bringing the portfolio page (`/portfolio`) in line with the Figma's
`PortfolioPage` block layout. UI layer only — no data, route, service, or API
change; the dependency-free SVG charts (`TrendChart`, `CostBreakdownChart`) are
unchanged, and the **per-coin thumbnails crowning the cost-breakdown columns are
kept** (a deliberate enrichment over the Figma's recharts bars, which carry no
images).

* **Single "Total paid" summary card** mirroring the Figma: a header row with the
  `Total paid` mono caption on the left and the base-currency control on the
  right, then the large serif total (`.portfolio-total`, Fraunces 32px / weight
  300 / line-height 1) sitting inline with its `of which hammer … converted to
  <currency> using ECB rates` note, then the `N of M coins priced` mono line
  closing the card (`.portfolio-summary` / `.portfolio-summary-head` /
  `.portfolio-total-row` / `.portfolio-priced`).
* **Priced-count moved into the card.** The `N of M coins priced` figure was a
  muted span in the page-header `.spread`; it is now the closing mono line of the
  summary card (Figma), so the page header is just the Fraunces `h1`.
* **Base-currency control relocated and de-emphasised.** It was a prominent bare
  `.row` form at the top of the page. The Figma mock omits a base-currency
  selector, but the feature is required for multi-currency portfolios, so it moves
  into the summary-card header (right-aligned, `.base-currency`, mono `Base
  currency` label, compact `Apply`), discoverable without dominating. In the
  empty (no-prices) state it stays above the empty note so the currency can still
  be set.

The charts row already used the Figma's two-equal-column `gap-[20px]`
(`.analytics-grid`) and is unchanged. Verified via Playwright at desktop (1440px)
and mobile (390px) — the summary header wraps cleanly on small screens; the
palette, radii, typography, and chart colours are unchanged from the sections
above.

## Addendum — scrollable portfolio charts + hover tooltip (2026-06-18)

A follow-up reworking how the two portfolio SVG charts (`TrendChart`,
`CostBreakdownChart`) lay out and behave, so a long acquisition history reads as
an evolution over time. Still dependency-free SVG (no recharts) — UI layer only;
the analytics service, routes, and the `?w=` thumbnail endpoint are unchanged. A
new shared `components/analytics/chart-layout.ts` holds the layout constants
(`CHART_H`, `AXIS_W`, `SLOT`, `PAD`), the `plotWidth` helper, and a
`useMeasuredWidth` ResizeObserver hook.

* **Equal, fixed height.** Both charts previously scaled their `viewBox` to the
  column width (so their plot heights drifted apart as the header content above
  differed). They now render at one **fixed pixel height** (`CHART_H = 280`) in
  real coordinates, so the two graphs are the same height side by side. (Real
  pixels, not `viewBox` scaling, because a stretched `viewBox` would distort the
  SVG text.)
* **Horizontal scroll for the history.** Each plot is laid out at a fixed slot
  width per element (`SLOT`, one per coin column / trend point) inside an
  `overflow-x: auto` region (`.chart-scroll`); the plot fills its viewport when
  there are few items and **scrolls** once the history outgrows it, instead of
  squeezing columns/points together. `useMeasuredWidth` measures the viewport so
  `plotWidth = max(viewport, count × SLOT)`.
* **Frozen y-axis (always-visible cost labels).** The cost (y-axis) tick labels
  move into a **separate, fixed `.chart-yaxis` SVG** to the left of the scroll
  region, so they stay visible while the plot scrolls; the gridlines span the full
  plot width and the axis SVG shares the plot's y-scale so they line up. `AXIS_W`
  (78px) is wide enough for grouped currency labels (e.g. `DKK 60,000`).
* **Floating hover tooltip on the cost breakdown (Figma `BreakdownTooltip`).**
  Hovering a column raises a card-surface popover (`.chart-tooltip`,
  `pointer-events: none`, positioned from the cursor relative to the `.chart-plot`
  and clamped to stay in view) listing the coin title, collection · date, each
  present segment with its swatch / value / share, and the total — replacing the
  native SVG `<title>` tooltip. A full-slot transparent hit-rect makes the whole
  column hoverable.
* **Coin thumbnails always shown.** With a fixed comfortable `SLOT`, the
  per-column coin thumbnail (the explicitly-kept enrichment over the Figma's
  image-less bars) now always crowns its column rather than being dropped when
  columns got too narrow.

Accessibility preserved: the scrolling plot SVG keeps its descriptive
`aria-label`; the frozen axis is `aria-hidden` decoration (its values are in the
plot's label); the tooltip is a non-focusable `pointer-events: none` visual aid.
Verified via Playwright at desktop (1440px) and mobile (390px) — equal heights,
the frozen axis staying put while the plot scrolls to reveal the latest coins,
and the tooltip rendering the per-coin split.

## Addendum — taller charts, trimmed trend filters, compact slots (2026-06-18)

A follow-up refinement of the two portfolio charts, building on the scrollable
rework above. UI layer only; the analytics service, routes, and the data model
are unchanged.

* **Viewport-filling height.** The shared fixed `CHART_H = 280` constant was
  replaced by a `useChartHeight()` hook (in `chart-layout.ts`) that derives the
  height from the viewport — `clamp(window.innerHeight − chrome, 360, 820)`,
  recomputed on resize. Both charts call the same hook, so they stay **equal
  height** while filling most of the screen instead of sitting at a short fixed
  size. (Still real pixel coordinates, not `viewBox` scaling — same text-fidelity
  reason as before.)
* **Trend chart filters removed.** The `Acquisition cost over time` chart's
  per-dimension multi-select filters (metal / category / collection / year /
  currency) and the acquisition-count line were dropped; only the **date-range
  presets (3M / 6M / 1Y / All)** remain. This deletes the `FilterGroup`
  sub-component and the `DIMENSIONS` / `Selection` machinery from `TrendChart`,
  and the now-unused `.filters` / `.filter-group` / `.filter-label` rules from
  `globals.css`. (The filters can return later if needed; removed "for now" per
  the request to simplify.)
* **Compact slots.** `SLOT` narrowed `76 → 56` px so coin columns / trend points
  sit closer together; with more items than fit, the plot simply scrolls
  (behaviour unchanged — `plotWidth = max(viewport, count × SLOT)`), so a coin set
  that overflows the available width shows what fits and scrolls horizontally
  rather than squeezing.

Verified: `tsc`, `npm run lint`, and 121 tests pass; Playwright confirmed both
charts share one viewport-derived height (e.g. 420px at an 800px-tall window),
the trend chart shows only the range presets, and the breakdown plot scrolls when
its content (count × SLOT) exceeds the viewport.

## Addendum — chart legibility + true equal-height alignment (2026-06-18)

A ui-designer pass over the two portfolio charts after the rework above: the
cost-breakdown imagery/bars were too small to read, and the two cards did not
line up. UI layer only.

* **Equal height — root cause fixed.** Measurement showed both *plots* were
  already identical (520px), but the cost-breakdown **card** was 41px taller
  because it carries a `.legend-top` row (coin count + colour legend) the trend
  card lacked, so its plot started 41px lower and its card ended 41px lower. Rather
  than a CSS height hack, the trend card gains a matching single-line caption row
  (`N acquisitions · cumulative`, mirroring the breakdown's `N coins · oldest
  first`). Both cards now have identical child structure under `.stack`, so they
  share the same vertical rhythm — verified equal: card tops, bottoms, heights
  (681px) and plot tops (463px) all match exactly at 1440px.
* **Bigger, legible cost breakdown.** Coin thumbnail diameter **44 → 64px**
  (served at `?w=192` for crispness), the per-element `SLOT` widened **56 → 92px**
  so columns and their bars are larger (`barW` cap **48 → 60px**), and the in-bar
  text scaled up: total label `0.62 → 0.8rem`, segment-share label `0.55 →
  0.72rem`, axis labels `0.56 → 0.72rem` (with `AXIS_W` **78 → 90px** to fit).
* **Larger chart titles.** The chart card headings moved off the muted 1rem `h3`
  default to a `.chart-title` class — **1.25rem** in the `--text` colour — so each
  chart reads as a titled panel.
* **Scroll preserved.** Wider slots mean fewer coins fit before overflow; the
  existing horizontal scroll handles it — verified the breakdown plot scrolls to
  its max once `count × SLOT` exceeds the viewport (552 > 358px at a narrow width).

Supersedes the previous addendum's fixed `CHART_H = 280` (now the viewport-derived
`useChartHeight()`, min 400 / max 880). `tsc`, lint, and 121 tests pass;
Playwright-verified at desktop and narrow widths (equal heights, bigger
bars/avatars/titles, working tooltip and scroll).

## Addendum — denser portfolio header + larger breakdown coins (2026-06-18)

A space/legibility tweak following the pass above. UI layer only.

* **Single-line summary hero.** The "Total paid" card previously stacked three
  rows (mono caption → total + note → priced count). It is now **one line**: the
  `mono-label` caption, the serif total, and a merged muted note (`of which hammer
  … · N of M coins priced`) sit inline on the left with the base-currency control
  pushed right; it wraps only when the viewport is too narrow. Drops the
  `.portfolio-summary-head` / `.portfolio-total-row` / `.portfolio-priced` rows in
  favour of `.portfolio-summary` (a single flex row) + `.portfolio-summary-line`.
* **Tighter page top.** The portfolio page gains a `.portfolio-page` class that
  reduces `main`'s top padding from `--space-10` (40px) to `--space-6` (24px), so
  the "Portfolio" title and the charts sit higher in the viewport. Scoped to this
  page; other pages keep the standard rhythm.
* **Larger, closer breakdown coins.** Coin thumbnail diameter **64 → 80px**
  (served at `?w=224`), and the columns sit closer: `SLOT` **92 → 88px** with a
  wider bar (`barW` factor 0.6→0.72, cap 60→72px) so the inter-bar gap tightens
  (~37 → ~25px) while the bars themselves grow.

Equal-height alignment preserved (cards measured 671/671 at 1440px) and the
single-line summary confirmed not to wrap. `tsc`, lint, and 121 tests pass;
Playwright-verified.

## Addendum — fit the portfolio to the viewport (2026-06-18)

A density tweak so the whole `/portfolio` page fits on screen without scrolling.
UI layer only.

* **Charts shortened to fit.** Measurement showed the page overran the viewport by
  a constant ~98px at every height (the plot scales linearly with the viewport, so
  the overrun is height-independent). The fixed page chrome (nav, title, summary,
  chart header, padding) totals ~458px, so `useChartHeight`'s `CHART_CHROME` was
  raised `360 → 472` (with `CHART_MIN_H` 400→320, `CHART_MAX_H` 880→760) so the
  plot fills exactly the leftover height and the page fits with a small margin —
  verified `scrollHeight ≤ innerHeight` at 900 / 940 / 1080px tall viewports, both
  cards still equal (e.g. 609/609 at 940px).
* **Title nudged up.** `.portfolio-page` top padding `--space-6 → --space-4`
  (24→16px), lifting the "Portfolio" title and charts slightly.
* **Bigger breakdown coins.** Thumbnail diameter `80 → 88px` (served at `?w=256`);
  `SLOT` `88 → 94px` to keep a small gap between the larger avatars while the bars
  stay compact (`barW` cap 72px, gap ~26px).

`tsc`, lint, and 121 tests pass; Playwright-verified that the page fits the
viewport without scrolling while the two charts remain equal height.

## Related Documents

* docs/roadmap.md — Figma UI Redesign milestone (now complete)
* docs/history.md — Phase 8
* CLAUDE.md — UI / Design system + accessibility conventions
* docs/architecture.md — layering rules (unchanged by this milestone)
* ADR-001 — Next.js monolith (no extra UI stack)
* ADR-007 — portfolio analytics (the SVG charts being re-skinned)
* ADR-008 — UI Embellishment (the accessibility/design-system baseline this
  milestone re-verifies against the new tokens)
