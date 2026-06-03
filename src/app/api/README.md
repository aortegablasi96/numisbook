# `src/app/api` — HTTP API route handlers

One folder per resource, each with a `route.ts` exporting the HTTP methods.

## Rules

- Thin: validate input → call a service → return a response.
- No business logic and no direct database/repository access.
- Validation (e.g. with Zod) happens here, at the boundary.

Example shape (created later, during implementation):

```
api/
  coins/
    route.ts          # GET (list), POST (create)
    [id]/route.ts     # GET, PATCH, DELETE
```
