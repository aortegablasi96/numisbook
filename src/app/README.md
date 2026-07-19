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

Route handlers, the `_lib.ts` helpers, the demo write guard, and the route
testing pattern are covered in [`api/README.md`](api/README.md).

## Server Actions

**Every mutating Server Action must call `assertWritable(user)`** (ADR-016), the
same as an API route — e.g. `demo-actions.ts`.

## Error UIs

`error.tsx`, `global-error.tsx` (root-layout throws, e.g. a DB outage; renders
its own `<html>`), and `not-found.tsx` surface Next's `error.digest` as a
quotable reference. They are **client components**, so they must **not** call
`captureException` — it imports `node:crypto`.

`auth/error/page.tsx` runs during auth failures, so it must not call `auth()`
or hit the database.
