# `src/components` — React UI components

Presentational and interactive UI.

## Rules

- **No database queries and no repository imports.** Components receive data
  via props, Server Components, or API calls.
- No business logic — delegate to services (server-side) or call the API.
- Keep components focused; prefer composition over large components.
