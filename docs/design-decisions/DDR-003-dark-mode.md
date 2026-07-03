# DDR-003 Dark Mode (night theme)

## Status

Accepted

## Date

2026-07-03

> **Supersedes the light-only decision of DDR-001** (the "stone & gold" Figma
> re-skin). DDR-001's palette intent, typography, spacing scale, and geometry all
> **stand**; this DDR narrows only its "single light scheme, no dark variant"
> stance — the app now ships a **light + dark** pair driven by the same design
> tokens. DDR-002 (global 75% zoom) is unaffected. See DDR-001 §Status update.

## Context

The **Additional Settings** milestone (`roadmap.md`) set out to give users control
over their account and preferences, including **interface theme (day/night)**. The
settings foundation (ADR-013) and internationalization (ADR-014) shipped; theme was
the last remaining preference and was explicitly **blocked** on this DDR, because
DDR-001 deliberately shipped a **light-only** scheme (`globals.css` defined a single
`:root` palette and `color-scheme: light`; the Figma source defined no real dark
variant).

Two facts about the existing code shape the decision:

- **The design system is 100% CSS-custom-property driven.** Every surface reads
  `var(--bg | --surface | --surface-2 | --text | --muted | --border | --gold |
  --accent | …)`; the SVG charts pick their fills from the same tokens. A second
  theme is therefore a **token override**, not a component rewrite.
- **The preferences pattern already exists.** `users.baseCurrency` (ADR-007/013)
  and `users.locale` (ADR-014) — a nullable column + repository method + Zod-
  validated service + a Settings `<select>` with a server action + a cookie for
  SSR — is the exact template a theme preference slots into.

The non-trivial decisions are **(a)** how the two schemes coexist without breaking
DDR-001's WCAG-AA gold contrast rules, **(b)** how the theme is chosen/persisted,
and **(c)** how "follow the system" works without a flash of the wrong theme (FOUC)
given SSR.

## Decision

Ship a **warm dark "night" theme** as a second token set, selected by a per-user
preference with **system-follow by default**, applied server-side with **no
JavaScript and no flash**.

### 1. Two token sets, one system

- Light stays the canonical `:root` palette (unchanged).
- Dark is a `[data-theme="dark"]` override of the **same** token names — a warm
  near-black stone palette (not pure black), preserving DDR-001's editorial warmth.
  Because the whole system reads tokens, cards, tables, inputs, badges, chips, the
  charts, and their legends all flip automatically.
- `color-scheme` is set per theme so **native controls** (selects, date/number
  inputs, scrollbars) render in the right scheme.

### 2. Resolving the gold-contrast tension (the DDR-001 constraint)

DDR-001 uses `--accent` (deep gold `#8a5f15`) for **two** roles: gold **text** on
light (needs to be dark enough for ≥4.5:1 on a light bg) **and** the **background**
of primary/CTA surfaces that carry white text (needs white to clear ≥4.5:1). On a
**dark** background these roles conflict: gold text must be *light*, but a gold
button behind white text must be *dark*.

We break the tie by decoupling the "text-on-gold" colour into a new token
**`--on-gold`** (light: `#fff`; dark: near-black ink `#211c15`). The five
gold-filled surfaces — `.btn-primary`, `.brand-logo`, `.chat-avatar`,
`.chat-send-btn`, `.msg-user` — now use `color: var(--on-gold)` instead of a
hardcoded `#fff`. In dark mode gold stays **bright** (good as text and as a fill)
and those surfaces carry **dark ink** text → AA holds in both schemes. This keeps
DDR-001's gold-for-fills / AA-gold-for-text invariant intact.

### 3. Preference model (mirrors locale/base-currency)

- A nullable `users.theme` column (`light` | `dark`; `NULL` = "system / not
  chosen"), `userRepository.updateTheme`, a Zod `themeSchema`, and
  `user.service.setTheme` — identical in shape to the locale preference.
- A `THEME` cookie keeps SSR and signed-out visits in sync with the stored
  preference (written/cleared by the Settings server action), exactly like
  `NEXT_LOCALE`.
- A **Theme** control in Settings → Preferences: **System default / Light / Dark**.
  "System default" clears the preference and the cookie.

### 4. System-follow without a flash

Resolution precedence: **user `theme` → `THEME` cookie → `system`**. The root
layout sets `data-theme` **only for an explicit** light/dark choice and **omits it**
for "system". CSS then decides:

- `[data-theme="dark"] { … }` — explicit dark, always.
- `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]):not([data-theme="dark"]) { … } }`
  — system-dark applies **only** when no explicit attribute is present.

Because the server never needs to know the OS preference (CSS resolves "system" at
paint time) there is **no inline theme script and no FOUC** — consistent with the
project's dependency-free ethos.

## Alternatives Considered

### Option A — Token override, per-user preference, CSS system-follow (chosen)

Pros:
* Zero new dependencies; a second theme is data (tokens) + one attribute.
* No flash and no client theme script — the server renders the attribute, CSS
  handles "system".
* Reuses the locale/base-currency preference machinery verbatim.

Cons:
* Two palettes to keep on the AA contrast ladder (mitigated by `--on-gold` and an
  axe pass in both schemes).

### Option B — `next-themes` (or similar) with a client theme provider

Pros:
* Turnkey `system`/`light`/`dark` with `localStorage` and an anti-FOUC script.

Cons:
* A new cross-cutting dependency against `CLAUDE.md`'s stated preference, for
  something the token system + a cookie already give us.

### Option C — Client-only toggle (localStorage + inline script), no persistence

Pros:
* Simplest; no DB change.

Cons:
* No cross-device persistence and inconsistent with the two existing preferences
  (locale, currency), which are server-persisted; needs an inline blocking script
  to avoid FOUC.

## Consequences

Benefits:
* Completes the **Additional Settings** milestone — the "Select day/night mode"
  control ships; the whole app (including the SVG charts) themes from one token
  set.
* A reusable `--on-gold` seam that keeps gold surfaces AA-correct in any scheme.
* Locale, currency, and theme now share one preference pattern.

Tradeoffs:
* Every raised-surface shadow is ink-tinted and reads faintly on dark; separation
  in dark leans on borders/`--surface-2` rather than elevation. Accepted.
* The dark palette is a hand-tuned approximation (no Figma dark source); it may be
  refined once a night-mode design pass exists.

Risks:
* Contrast regressions if a future rule hardcodes a colour instead of a token —
  mitigated by the token discipline (verify with axe in **both** schemes, per the
  `globals.css` accessibility conventions).

## Related Documents

* docs/design-decisions/DDR-001-figma-ui-redesign.md (superseded on light-only)
* docs/design-decisions/DDR-002-global-display-density.md
* docs/decisions/ADR-013-account-settings-and-deletion.md
* docs/decisions/ADR-014-internationalization.md
* docs/roadmap.md
