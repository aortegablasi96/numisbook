# DDR-004 Theme sun/moon toggle (drop the "System" theme option)

Status: Accepted

Date: 2026-07-06

> **Amends DDR-003 §3 (Preference model).** DDR-003's two-token-set architecture,
> `--on-gold` seam, `users.theme` column, `THEME` cookie, and no-flash
> system-follow **all stand**. This DDR narrows only DDR-003's *Settings control*:
> the three-way **System default / Light / Dark** `<select>` is replaced by a
> binary **sun/moon** switch, and **"System" is no longer user-selectable**.

## Context

DDR-003 shipped the theme preference as a Settings `<select>` with three options —
**System default / Light / Dark** — mirroring the locale and base-currency
controls. The user asked for a more direct, familiar control: a **toggle** that
flips between light (sun) and dark (moon) on a single click, rather than a
dropdown + "Apply" button.

A sun/moon toggle is inherently **binary**, so it cannot express the third,
"follow the OS" state. The product decision (confirmed with the user) is to
**drop "System" from the UI** in favour of the simpler switch.

## Decision

Replace the theme `<select>` with a binary switch (`<ThemeToggle>`,
`src/components/settings/ThemeToggle.tsx`):

- A `role="switch"` button (`aria-checked` = dark) styled as a `.theme-toggle`
  pill in `globals.css`: a gold thumb slides under the active icon, which flips
  to `--on-gold` so it reads on the gold fill (AA in both schemes, per DDR-003).
- Clicking flips to the other scheme, sets `<html data-theme>` **immediately**
  for instant feedback, then persists via the existing `updateTheme` server
  action (now typed to take a `Theme`, no longer `FormData`), which writes
  `users.theme`, syncs the `THEME` cookie, and revalidates the layout.
- **"System" is dropped from Settings.** The underlying model is unchanged: the
  toggle only ever submits `light`/`dark`, so a stored preference is now always
  explicit. `resolveTheme`'s `system` fallback **still exists** and still governs
  a user who has **never** chosen a theme (`users.theme = NULL`) — CSS resolves
  it at paint time exactly as before. For that null-preference user the switch
  reads the OS scheme on mount (`matchMedia`) so it shows the currently-rendered
  theme; the first click then writes an explicit preference. What's removed is
  only the ability to *return to* "follow the OS" from the UI.
- The `settings.theme.system` message key is removed from all 7 locales and the
  `MessageKey` union; the `settings.theme.help` string drops its "System default
  follows your device" sentence.

## Alternatives Considered

### Option A — Binary sun/moon toggle, drop "System" (chosen)

Pros:
* The control the user asked for: one click, no "Apply", instantly obvious state.
* Keeps DDR-003's model, cookie sync, and no-flash SSR intact — a UI swap, not a
  re-architecture.

Cons:
* "Follow the OS" is no longer reachable once any explicit choice is made.
  Accepted: it remains the default for untouched accounts, and an explicit
  light/dark is what most users want anyway.

### Option B — Keep "System" via a separate reset control beside the toggle

Pros:
* Preserves full DDR-003 behaviour (OS-follow stays reachable).

Cons:
* Reintroduces the complexity the toggle was meant to remove; two controls for
  one preference. Rejected by the product decision.

### Option C — Three-state toggle (Light → Dark → System cycle)

Pros:
* Keeps all three states in one control.

Cons:
* A tri-state switch is a weaker affordance than a binary one; the third state is
  not discoverable from a sun/moon metaphor. Rejected.

## Consequences

Benefits:
* A direct, conventional theme switch with instant feedback.
* Less surface: one fewer message key per locale; a `FormData`-free server action.

Tradeoffs:
* Users can no longer opt back into OS-follow from Settings once they pick a
  scheme (they could clear it only by resetting the preference at the data
  layer). Accepted per the product decision.

Risks:
* The `system` fallback path in `resolveTheme` is now reachable only for
  never-chosen accounts — kept deliberately (do not delete it), as it still
  drives first-visit and signed-out rendering.

## Related Documents

* docs/design-decisions/DDR-003-dark-mode.md (amended: §3 preference control)
* docs/design-decisions/DDR-001-figma-ui-redesign.md
* docs/decisions/ADR-013-account-settings-and-deletion.md
* docs/decisions/ADR-014-internationalization.md
