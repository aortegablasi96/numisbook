# ADR-014-Internationalization (i18n)

Status: Accepted

Date: 2026-07-03

## Context

NumisBook is live in production and the active milestone is **Additional
Settings** (`roadmap.md`). ADR-013 shipped its foundation (profile, account
deletion, base-currency home). This ADR covers the **second pass**:
**internationalization** — a translatable interface and a per-user language
preference chosen in `/settings`. Coin collecting is a strongly international
hobby (large European and Asian markets), and the app is currently English-only,
so a non-English collector cannot use it comfortably.

The MVP ships **seven locales**: English (`en`, default) plus Spanish (`es`),
German (`de`), French (`fr`), Italian (`it`), Chinese Simplified (`zh`), and
Russian (`ru`). Only **static UI text** is translated; user-generated content
(coin categories, notes, collection names) and the AI assistant's generated
replies are out of scope (the model already answers in the user's language).
Dark mode — the milestone's remaining pass — is unrelated and blocked on a DDR
superseding DDR-001; it is not covered here.

Three facts about the existing code shape this decision:

- **No i18n exists today.** Every one of the ~16 components and 7 pages holds
  literal English strings; there is no message catalog, locale resolution, or
  `<html lang>` beyond the hardcoded `"en"`.
- **The settings preference pattern already exists.** `users.baseCurrency`
  (ADR-007/013) + `setBaseCurrency` + a Server-Component `<select>` with a
  server action is the template a language preference slots straight into.
- **The project is deliberately dependency-averse.** `CLAUDE.md` forbids CSS/UI
  frameworks and asks for justification before any new dependency; the design
  system is hand-rolled in `globals.css`. The string surface here is small.

The non-trivial decisions are **(a)** how translation is delivered (a library vs.
a custom catalog), **(b)** how locale is routed and resolved, and **(c)** how a
non-Latin script (`zh`) is rendered given the current `next/font` setup.

## Decision

Build a **minimal custom i18n layer** — no new dependency — with a **cookie +
per-user preference** locale model (no URL-based locale routing).

1. **Locale library** lives in `src/lib/i18n/`:
   - `locales.ts` — the supported `Locale` union (`en | es | de | fr | it | zh |
     ru`), the default (`en`), and endonym display labels.
   - `messages/{locale}.ts` — flat/namespaced key→string catalogs. `en` is the
     canonical, complete set and every other locale **falls back to `en`
     per-key** at runtime. Key parity is guarded by a test.
   - `resolve.ts` — resolution precedence: **user `locale` → `NEXT_LOCALE`
     cookie → `Accept-Language` → `en`**. Works on signed-out/SSR paths (no
     session/DB required).
   - `t(locale, key, params?)` for Server Components; a client `LocaleProvider`
     (seeded from the server-resolved locale + messages in the root layout) with
     a `useT()` hook for Client Components. Resolving once on the server and
     seeding the client avoids hydration mismatch.

2. **Persistence** mirrors base currency exactly: a nullable `users.locale`
   column (Database Review approved), `userRepository.updateLocale`,
   `user.service.setLocale` validated by a Zod `localeSchema`, and a
   `NEXT_LOCALE` cookie written by the settings server action so SSR and
   signed-out visits agree with the stored preference. `NULL` = "not chosen".

3. **No URL locale routing.** The app lives behind auth and carries a per-user
   preference; a cookie/preference model is simpler than `/es/…` segment routing
   and needs no middleware rewrite.

4. **Fonts / non-Latin scripts.** The Google builds of DM Sans and Fraunces
   cover Latin/Latin-ext only — **no Cyrillic or CJK**. So both Russian
   (Cyrillic) and Chinese render via the platform's **system font fallback** for
   those scripts in the MVP — an accepted, documented tradeoff (no web-font
   dependency added for two locales; a CJK/Cyrillic web font can be layered in
   later behind the same seam).

### Delivery: shell first

The interface is localized in passes. The **first pass localizes the app
"shell"** — global chrome (header/nav), the home dashboard, settings, and the
entry/error pages (`not-found`, the in-layout error boundary, the auth-error
page) — and ships all seven locales for it. The **deep domain screens**
(coins / collections / valuations / assistant / analytics) are extracted in a
**follow-up pass** using the exact same machinery; until then they render in
English via the per-key fallback. `global-error` stays English by necessity — it
renders its own `<html>` outside the `LocaleProvider` (the DB-outage path).

`userId` always comes from the authenticated session (`currentUser()`), never
client input — the tenant-isolation invariant is unchanged.

## Alternatives Considered

### Option A — Custom lightweight catalog, cookie + preference (chosen)

Pros:
* Zero new dependencies; consistent with the project's dependency-free ethos and
  the hand-rolled design system.
* Full control over delivery, fallback, and SSR seeding; small, testable surface
  proportional to the ~16-component/7-page footprint.
* No middleware or routing changes.

Cons:
* We hand-roll interpolation and (if ever needed) pluralization via
  `Intl.PluralRules`; ICU features are not free.
* Translation completeness is our responsibility — mitigated by a typed key set
  and a parity test plus per-key `en` fallback.

### Option B — `next-intl` library

Pros:
* Battle-tested App Router i18n: SSR-safe delivery, ICU messages, pluralization,
  and `Intl` formatting out of the box.

Cons:
* A new cross-cutting dependency for a small string surface, against the
  project's stated preference.
* Opinionated around locale-segment routing; using it purely cookie-based fights
  its conventions.

### Option C — URL-based locale routing (`/en/…`, `/es/…`)

Pros:
* Shareable, locale-explicit URLs; SEO-friendly.

Cons:
* Requires middleware rewrites and touches every route/link; no benefit for an
  auth-gated app whose locale is a saved per-user preference.

## Consequences

Positive:
* The Additional Settings milestone gains multi-language support and completes
  its "Add languages" / "Select language" items with **one additive, nullable
  column** and no new dependency.
* A single, reusable i18n primitive (`t` / `useT` + catalogs) that future
  features and additional languages plug into as **data-only** changes.
* Locale resolves consistently across SSR, client, and signed-out pages.

Negative:
* Extracting literals touches nearly every component/page — a large but
  mechanical, behavior-preserving sweep (Refactoring Reviewer to sanity-check).
* No ICU/plural machinery until we build it; acceptable for the current
  mostly-static copy.
* `zh` depends on system CJK fonts, so glyph rendering varies by platform until a
  future pass adds a CJK web font if warranted.

## Related Documents

* docs/architecture.md
* docs/database.md
* docs/design-decisions/DDR-001-figma-ui-redesign.md
* docs/decisions/ADR-007-portfolio-analytics-upgrade.md
* docs/decisions/ADR-013-account-settings-and-deletion.md
* docs/roadmap.md
