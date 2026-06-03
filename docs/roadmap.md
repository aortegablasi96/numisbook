# NumisBook — Roadmap

> Guiding principle (from `CLAUDE.md`): **Build the MVP before introducing
> advanced automation or optimization.**

## Phase 0 — Foundation *(current)*

- [x] Define stack (Next.js + Drizzle + PostgreSQL).
- [x] Define folder structure and layering rules.
- [x] Write architecture, database, and product docs.
- [x] Add initial Claude Code skills.
- [ ] **Review checkpoint** — approve scaffold before writing app code.

## Phase 1 — Project setup

- [ ] Initialize Next.js + TypeScript project (`package.json`, configs).
- [ ] Add Drizzle, drizzle-kit, `drizzle.config.ts`, `src/db/index.ts`.
- [ ] Add tooling: linting, formatting, test runner.
- [ ] Local Postgres (Docker or hosted) + `.env` handling.
- [ ] First migration: `User`, `Collection`, `Coin`, `Valuation`.

## Phase 2 — MVP features

- [ ] **Auth / Users** — sign up, sign in, session.
- [ ] **Collections** — create, list, rename, delete.
- [ ] **Coins / Inventory** — add coin to collection, edit, list, delete.
- [ ] **Valuations** — record a valuation, view value history per coin.
- [ ] Basic UI for the above.

Each feature follows the same vertical slice:
`schema → repository → service (+ tests) → API route → UI`.

## Phase 3 — Post-MVP

- [ ] Portfolio analytics (aggregate value, trends, allocation).
- [ ] Auction monitoring.
- [ ] AI-assisted research / coin identification.

## Out of Scope (for now)

- Marketplace / user-to-user trading.
- Mobile apps.

See also: [`product.md`](./product.md), [`architecture.md`](./architecture.md).
