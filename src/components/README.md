# `src/components` — React UI components

Presentational and interactive UI.

## Rules

- **No database queries and no repository imports.** Components receive data
  via props, Server Components, or API calls.
- No business logic — delegate to services (server-side) or call the API.
- Keep components focused; prefer composition over large components.

## Organization

By domain — `collections`, `coins`, `valuations`, `assistant`, `analytics`,
`settings`, `demo`, `i18n` — plus shared primitives in `ui/` and the app shell
in `layout/`.

Each data domain has a client-side **manager** that owns its view and talks to
the API: `CollectionsManager`, `CoinsManager`, `ValuationsManager`. Managers use
the fetch helpers in `@/lib/http` (`readError`, `NETWORK_ERROR`) so API error
messaging stays consistent.

## Conventions

- **Styling** is the dependency-free design system in `src/app/globals.css`. No
  CSS-in-JS, no component framework — extend `globals.css` (DDR-001).
- **Icons** are inline SVG, no icon library. Reuse `ui/icons.tsx` before
  hand-rolling a new `<svg>`.
- **Destructive actions** use `<ConfirmButton>` (`ui/ConfirmButton.tsx`), a
  `<dialog>`-based prompt — never `window.confirm`.
- **Client preferences** persist to `localStorage` under a **versioned** key;
  bump the version whenever the stored shape changes.
- **Accessibility**: wrap wide tables in `.table-wrap`, label icon-only
  controls with `.sr-only`, and preserve the `:focus-visible` outlines.

## Testing

There is **no DOM environment** — Vitest runs `environment: "node"`, so
components are not rendered in tests. Test component logic by extracting it into
pure helpers and testing those (e.g. `analytics/chart-utils.test.ts`).
