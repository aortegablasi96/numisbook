# `src/app` — Next.js App Router

Routes, pages, layouts, and HTTP API route handlers.

## Rules

- **Keep route handlers thin.** Parse and validate input, call a **service**,
  shape the response. No business logic, no database access here.
- API route handlers live under `src/app/api/**/route.ts`.
- Server Components may call **services** directly; they must **not** import
  from `src/repositories` or `src/db`.

```
Request → app/ (route) → services/ → repositories/ → db/
```
