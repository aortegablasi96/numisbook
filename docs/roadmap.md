# NumisBook — Roadmap

> Guiding principle (from `CLAUDE.md`): **Build the MVP before introducing
> advanced automation or optimization.**

## Phase 0 — Foundation

- [x] Define stack (Next.js + Drizzle + PostgreSQL).
- [x] Define folder structure and layering rules.
- [x] Write architecture, database, and product docs.
- [x] Add initial Claude Code skills.
- [x] **Review checkpoint** — scaffold approved; cleared to write app code.

## Phase 1 — Project setup

- [x] Initialize Next.js + TypeScript project (`package.json`, configs).
- [x] Add Drizzle, drizzle-kit, `drizzle.config.ts`, `src/db/index.ts`.
- [x] Add tooling: linting (ESLint) and test runner (Vitest).
- [x] Define schema: `User`, `Collection`, `Coin`, `Valuation`.
- [x] `.env.example` + env handling.
- [x] **Run locally**: `npm install` (385 pkgs), Postgres via Docker
      (`numisbook-pg`, `postgres:16` on `localhost:5432`), `npm run db:generate`
      (→ `drizzle/0000_clammy_lily_hollister.sql`) + `npm run db:migrate` applied.

## Phase 2 — MVP features *(complete)*

- [x] **Auth / Users** — Auth.js v5 + Google OAuth, DB sessions via the Drizzle
      adapter (`users`/`accounts`/`sessions`/`verification_tokens`). Sign in/out
      UI; `auth.service` resolves session → domain user (unit-tested).
- [x] **Collections** — create, list, rename, delete. Vertical slice:
      `collection.repository` → `collection.service` (+ tests, ownership-scoped)
      → `/api/collections` (+ `/[id]`) → `/collections` UI.
- [x] **Coins / Inventory** — add coin to collection, edit, list, delete.
      Vertical slice: `coin.repository` (writes scoped to the owner via the
      collection) → `coin.service` (+ tests) → `/api/collections/[id]/coins`
      and `/api/coins/[id]` → `/collections/[id]` UI. Tenant isolation verified
      against real Postgres with two users.
- [x] **Valuations** — record a valuation, view value history per coin.
      Vertical slice: `valuation.repository` → `valuation.service` (+ tests,
      ownership via the coin) → `/api/coins/[id]/valuations` → `/coins/[id]` UI
      (history + record form, latest-value summary). Tenant isolation verified
      against real Postgres.
- [x] Basic UI for the above — `/collections`, `/collections/[id]` (coins),
      `/coins/[id]` (valuations), linked together and from the home page.

Each feature follows the same vertical slice:
`schema → repository → service (+ tests) → API route → UI`.

## Phase 3 — Post-MVP *(complete)*

- [x] Portfolio analytics (aggregate value, trends, allocation). Read-model
      slice: `analytics.repository` (user-scoped joins) → `analytics.service`
      (+ tests; latest-valuation-per-coin, totals per currency, allocation by
      metal/collection, value-over-time trend) → `/api/portfolio` → `/portfolio`
      UI. Totals are per-currency; allocation/trend use the primary (largest)
      currency. Verified against real Postgres incl. tenant isolation.
- [x] Collection assistant (chatbot). OpenAI gpt-4o-mini with function calling
      over the domain services via a manual agentic loop: `assistant.service`
      (+ tests) → `/api/assistant` → `/assistant` chat UI. Full management
      (read + write + delete); the acting user's id is injected into every tool
      handler so the model can only touch the signed-in user's data. Needs
      `OPENAI_API_KEY`.
- [x] Coin images. One image per coin stored in Postgres (`coin_images`, bytea)
      behind `coinImage.repository` → `coinImage.service` (+ tests; type/size
      validation, owner-scoped) → `GET/POST/DELETE /api/coins/[id]/image` →
      upload/display/remove on the coin page + list thumbnails. bytea round-trip
      and tenant isolation verified against real Postgres. Storage is abstracted
      behind the repository so it can move to S3/R2 later.
- [x] UI/UX polish. Dependency-free design system in `globals.css` (theme tokens
      with light/dark, typography, themed buttons/inputs/tables, component
      classes: cards, rows, badges, alerts, analytics bars, chat bubbles). App
      shell via `SiteHeader` (brand + global nav + sign in/out) in the root
      layout, replacing the scattered per-page nav links. Home is now a dashboard
      of feature cards; collections/coins/valuations use cards + bordered rows;
      portfolio uses themed bars; the assistant uses chat bubbles; coin photos
      are framed and thumbnails are styled. No new dependencies.
## Phase 4 — Improvements 1 *(current)*

_Items to be defined._

## Out of Scope (for now)

- Marketplace / user-to-user trading.
- Mobile apps.
- Auction monitoring.
- AI-assisted research / coin identification.

See also: [`product.md`](./product.md), [`architecture.md`](./architecture.md).
