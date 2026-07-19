# `src/lib/i18n` — Internationalization

Custom, dependency-free i18n (ADR-014). No URL routing — the active locale comes
from a cookie (`NEXT_LOCALE`) plus a per-user `users.locale` preference. Seven
locales: `en` `es` `de` `fr` `it` `zh` `ru` (`zh` renders via system CJK
fallback).

Mirrors the theme preference in `src/lib/theme` (DDR-003): both are per-user,
cookie-applied, and render with no flash.

## Rules

- **`index.ts` is the client-safe barrel.** `server.ts` uses `next/headers` and
  is server-only — **never import it from client code.**
- **Server**: `import { t } from "@/lib/i18n"` and call `t(locale, key, params)`
  in Server Components and route handlers; resolve the request locale via
  `@/lib/i18n/server`.
- **Client**: get `useT()` from `LocaleProvider`
  (`src/components/i18n/LocaleProvider.tsx`, mounted in the root layout).
- Placeholders are `{name}`.

## Message catalogs

Typed catalogs live in `messages/<locale>.ts`. **`en.ts` defines the
`MessageKey` union and is the source of truth**; every other catalog falls back
to it per-key.

**Add a new key to every locale** — `messages.test.ts` enforces parity and will
fail the build otherwise.

Adding a language is a data-only change: extend `LOCALES` in `locales.ts`, add
its endonym to `LOCALE_LABELS`, and add the catalog.
