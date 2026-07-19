# `src/lib/validation` — Zod schemas

Per-domain input schemas used at the API boundary. One file per domain
(`coin.ts`, `collection.ts`, `valuation.ts`, `user.ts`, `assistant.ts`).

## Rules

- **Validation happens at the boundary**, in the route handler — not in
  services and not in repositories.
- A `ZodError` reaching `errorResponse()` maps to a 400 automatically; let Zod
  do the rejecting rather than hand-rolling checks.
- **Use real Zod in route tests.** Mock `@/auth`, `@/services/auth.service`, and
  the called service — never the validation.

## One contract, many surfaces

Where two routes accept the same query shape, the schema is defined **once**
here and both compose it, so they cannot drift.

`coinSearchParamsSchema` (`coin.ts`) is the canonical example: it serves the
per-collection coin list, the cross-collection `/coins` list, both `/facets`
endpoints, and both CSV export routes. Its SQL counterpart is `buildCoinConditions`
in `coin.repository`. **Add a new filter in those two places**, not per-route
(ADR-015).

`createCoinSchema` is likewise reused by CSV import, so import holds no second
opinion on what a valid coin is.
