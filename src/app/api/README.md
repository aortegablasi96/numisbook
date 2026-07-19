# `src/app/api` — HTTP API route handlers

One folder per resource, each with a `route.ts` exporting the HTTP methods.

```
api/
  coins/
    route.ts              # GET (list)
    facets/route.ts       # GET (facet values)
    export/route.ts       # GET (CSV)
    [id]/route.ts         # GET, PATCH, DELETE
    [id]/images/route.ts  # GET (list), POST (upload)
```

## Rules

- **Thin**: validate input → call a service → return a response.
- No business logic and no direct database/repository access.
- Validation happens here, at the boundary — see `src/lib/validation/README.md`.

## Shared helpers (`_lib.ts`)

- `currentUser()` — resolve session → domain user. **The authenticated `userId`
  always comes from here, never from client input.**
- `unauthorized()` — 401 response.
- `errorResponse()` — maps `ZodError` → 400, `AppError` → its own status,
  anything else → 500 with a correlation `errorId` via `captureException`.
- `csvResponse()` — CSV download response.
- `assertWritable(user)` — re-exported from `@/lib/demo`.

## Write guard (ADR-016)

**Every mutating route must call `assertWritable(user)`** so the read-only demo
tenant cannot write. `write-guard.test.ts` fails the build if a mutating route
omits it. Reads do not call it — the demo tenant keeps them, CSV export included.

## Testing

Mock `@/auth`, `@/services/auth.service`, and the called service module — but use
**real** Zod validation. Cover 401 unauthenticated, 400 invalid input, the
success status, and `AppError` → status mapping. Pattern:
`collections/route.test.ts`.

```ts
vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/services/auth.service", () => ({ resolveCurrentUser: vi.fn() }));
vi.mock("@/services/collection.service", () => ({ listCollections: vi.fn() }));
```
