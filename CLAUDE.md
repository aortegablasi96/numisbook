# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NumisBook is a SaaS platform for coin collectors.

Built features (see `docs/roadmap.md` for status):

* Collection management
* Coin inventory (with per-coin images; bytes in object storage, metadata in Postgres)
* Valuation tracking (value history per coin)
* Portfolio analytics (aggregate value, allocation, trend)
* Collection assistant — an OpenAI-backed chatbot over the domain services

Out of scope for now: marketplace/trading, mobile apps, auction monitoring,
AI-assisted coin identification.

## Stack

* **TypeScript** + **Next.js** (App Router) + **React**
* **Drizzle ORM** over **PostgreSQL** (migrations via `drizzle-kit` → `drizzle/`)
* **Zod** for input validation at the API boundary
* **OpenAI** (`openai`, gpt-4o-mini) for the collection assistant only
* **sharp** for on-the-fly image resizing (coin thumbnail API)

## Commands

```bash
npm install            # install dependencies
npm run dev            # start the dev server (http://localhost:3000)
npm run build          # production build
npm start              # run the production build
npm run lint           # eslint (next/core-web-vitals)
npm test               # run unit tests once (Vitest)
npm run test:watch     # tests in watch mode

# Database (Drizzle + PostgreSQL); requires DATABASE_URL in .env
npm run db:generate    # generate a SQL migration from src/db/schema into drizzle/
npm run db:migrate     # apply pending migrations
npm run db:push        # push schema directly to the DB (dev convenience)
npm run db:studio      # open Drizzle Studio
```

Run a single test file: `npx vitest run path/to/file.test.ts`.

Local setup: copy `.env.example` to `.env`, set `DATABASE_URL` (and the Auth.js
vars below to enable sign-in), then
`npm install` → `npm run db:generate` → `npm run db:migrate` → `npm run dev`.

## Architecture Rules

Dependencies point **downward only**:

```
src/app  →  src/services  →  src/repositories  →  src/db  →  PostgreSQL
```

* **API routes are thin** (`src/app/api/**/route.ts`): validate input → call a
  service → shape the response. No business logic, no DB access. Shared helpers
  live in `src/app/api/_lib.ts`: `currentUser()` (resolve session → domain user),
  `unauthorized()`, and `errorResponse()` (maps `ZodError` → 400, `AppError` →
  its status, anything else → 500).
* **Business logic belongs in services** (`src/services`). Services are
  framework-agnostic (no `Request`/`Response`, no React) and access data only
  through repositories.
* **Database access belongs in repositories** (`src/repositories`) — the only
  layer that imports `src/db` / runs Drizzle queries. Repositories expose
  intention-revealing methods and return domain-shaped data. This is enforced by
  an ESLint `no-restricted-imports` guard: importing `@/db` / `@/db/**` outside
  `src/repositories` (plus `src/db` itself and `src/auth.ts`, the Auth.js
  adapter) fails `npm run lint`.
* **Tenant isolation.** Every user is a tenant; data must never leak across
  users. Repository methods for user-owned entities take the owner's `userId`
  and scope every read/write by it (`WHERE … AND user_id = userId`). The
  `userId` always comes from the authenticated session (`currentUser()` in
  `src/app/api/_lib.ts`), never from client input. Mutations that match no row
  raise `NotFoundError` (404) rather than revealing another tenant's data.
  Coins are scoped indirectly — via a subquery of the user's `collectionId`s —
  because `coins` has no `userId` column.
* **React components** (`src/components`) must not contain database queries or
  import repositories; data comes via props, Server Components, or the API.
  Components are organized by domain: `src/components/{collections,coins,
  valuations,assistant}/`; shared primitives in `src/components/ui/`; shell in
  `src/components/layout/`.
* **Drizzle schema** lives in `src/db/schema`; migrations are generated into
  `drizzle/` and are **not** hand-edited. `src/db/schema/index.ts` re-exports
  all table definitions.
* **Imports use the `@/*` alias** (`@/* → ./src/*`, see `tsconfig.json`), e.g.
  `import { db } from "@/db"`. `src/db/index.ts` exports the singleton Drizzle
  client and throws at import time if `DATABASE_URL` is unset.
* **Cross-cutting helpers** (Zod validation schemas, typed errors, formatting)
  live in `src/lib`.

A new feature is built as a vertical slice:
`schema → repository → service (+ tests) → API route → UI`.

## Errors

`src/lib/errors.ts` defines the typed error hierarchy used across services:

```
AppError(message, status)       — base; carries an HTTP status
  ValidationError(message)      — 400; domain invariant violations
  NotFoundError(message)        — 404; missing or invisible resource
```

Services throw these; `errorResponse()` in `_lib.ts` maps them to JSON
responses. Never throw raw `Error` from a service for a known domain failure.

## Repository types

Repositories export inferred Drizzle types (`$inferSelect`, `$inferInsert`)
as the canonical domain types re-used by services, API routes, and components:

```ts
export type Coin = typeof coins.$inferSelect;
export type NewCoin = typeof coins.$inferInsert;
```

Import domain types from repositories, not from `@/db/schema` directly.

## Authentication

Auth.js v5 (`next-auth@5`) with the Drizzle adapter and **database** sessions
(no JWTs). Google is the only provider.

* Config lives in `src/auth.ts`, which exports `handlers`, `auth`, `signIn`,
  and `signOut`. The catch-all route `src/app/api/auth/[...nextauth]/route.ts`
  re-exports `handlers` as `GET`/`POST`.
* Auth.js reads `AUTH_SECRET`, `AUTH_GOOGLE_ID`, and `AUTH_GOOGLE_SECRET` from
  the environment automatically (generate the secret with `npx auth secret`).
* Auth tables (`users`, `accounts`, `sessions`, `verificationTokens`) live in
  `src/db/schema/auth.ts` and `users.ts`.
* The architecture rules still apply: call the Next-specific `auth()` in a route
  or Server Component, then pass the plain session into a service. Services stay
  framework-agnostic — `src/services/auth.service.ts` (`resolveCurrentUser`)
  takes an `AuthSession` shape rather than touching `auth()` or Drizzle directly.

## Collection Assistant

The `/assistant` chatbot (`src/services/assistant.service.ts` → `/api/assistant`)
runs a manual agentic loop: OpenAI `gpt-4o-mini` with function calling over the
domain services (read + write + delete). **Tenant-isolation invariant:** the
acting `userId` comes from the session and is injected server-side into every
tool handler — it is never a model-supplied argument — so the model can only
touch the signed-in user's data. Requires `OPENAI_API_KEY`; without it the route
returns 503 and the rest of the app works.

The assistant is rendered as a floating widget (`AssistantWidget`) injected into
the root layout, auth-gated by a Server Component wrapper (`FloatingAssistant`).

## Coin images

Image **bytes live in object storage**, not Postgres. The `coin_images` table
holds only metadata — `mime_type`, `size_bytes`, and a `storage_key` reference
(separate table so coin listings stay lean; cascades on coin delete). Multiple
images per coin; the UI shows a carousel.

The object-storage backend is an abstraction in `src/lib/storage` (an
`ObjectStorage` interface with `put`/`get`/`delete`). `objectStorage`
auto-selects the backend from the environment: an **S3-compatible** client
(`S3Storage`, AWS SDK; targets Cloudflare R2) when the `R2_*` vars are set,
otherwise a local-filesystem fallback (`FsStorage`, under `./.storage`,
gitignored) so dev/test run with no cloud credentials. Swapping providers is a
one-file change in `src/lib/storage`. The `coinImage.repository` is the only
layer that composes the DB row with the stored object; it deletes the object on
row delete and cleans up on a failed insert so no orphans are left.

Image API routes:

```
GET    /api/coins/[id]/images              → { images: [{ id }] }  (metadata only)
POST   /api/coins/[id]/images              → { id }  (multipart/form-data, field "file")
GET    /api/coins/[id]/images/[imageId]    → raw image (or ?w=<px> → WebP resize via sharp)
DELETE /api/coins/[id]/images/[imageId]    → 204
GET    /api/coins/[id]/image               → legacy alias: serves the first image
```

The `?w=<px>` thumbnail path resizes to fit within `w×w` (max 2000 px),
converts to WebP at quality 82, and returns `Cache-Control: public, immutable`
(UUID-stable IDs never change). The no-`?w` path returns the original with
`Cache-Control: private, no-cache`. Constraints: PNG/JPEG/WebP/GIF, max 5 MB
(defined in `src/lib/images.ts`).

## Coin search and filtering

`GET /api/collections/[id]/coins` accepts query params: `q` (name substring),
`metal`, `category`, `year`, `page`, `sortBy` (name | category | metal |
denomination | year | createdAt), `sortDir` (asc | desc). Page size is 20
(`COINS_PAGE_SIZE` in `src/services/coin.service.ts`). Response:
`{ coins, total, page, pageSize }`.

`GET /api/collections/[id]/coins/facets` returns `{ metals: string[], categories: string[] }` — distinct non-null values for filter dropdowns.

## UI / Design system

The app uses a **dependency-free CSS design system** defined entirely in
`src/app/globals.css`. It provides:

* CSS custom-property theme tokens (light/dark via `prefers-color-scheme`):
  `--color-*`, `--radius-*`, `--font-*`, etc.
* Utility component classes: `.card`, `.row`, `.badge`, `.alert`,
  `.analytics-bar`, `.chat-bubble`, and themed buttons/inputs/tables.

Do not introduce a CSS-in-JS library or a component framework (e.g. Tailwind,
shadcn, MUI) — extend `globals.css` instead.

**Destructive actions** use `<ConfirmButton>` (`src/components/ui/ConfirmButton.tsx`),
a reusable `<dialog>`-based confirmation prompt. Use it for deletes instead of
`window.confirm`.

**UI state persistence**: client-side preferences use `localStorage`. Current
key: `numisbook:coin-columns-v2` stores column visibility + order as
`ColState[]` for the coin list table. Use a versioned key whenever the shape
changes.

## Testing

### Service tests (primary target)

Mock all repositories with `vi.mock()`; test business logic in isolation.
`describe` / `it` / `expect` are global (Vitest `globals: true`).

### API route tests

Mock `@/auth`, `@/services/auth.service`, and the called service module; use
**real** Zod validation (do not mock it). Pattern from
`src/app/api/collections/route.test.ts`:

```ts
vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/services/auth.service", () => ({ resolveCurrentUser: vi.fn() }));
vi.mock("@/services/collection.service", () => ({ listCollections: vi.fn() }));
```

Cover: 401 when unauthenticated, 400 on invalid input (let Zod reject it),
success status codes (200/201/204), and AppError → status mapping (404, etc.).

## Development Principles

* Simplicity over complexity.
* Prefer existing patterns over creating new ones.
* Do not introduce new dependencies without justification.
* Keep files under 300 lines when practical.
* Generate tests for all business logic (services are the primary test target;
  mock repositories).

## Before Implementing Any Feature

1. Review existing architecture (`docs/architecture.md`).
2. Identify affected domains.
3. Check for reusable components.
4. Produce a short implementation plan.

## Skills

Project-specific Claude Code skills live in `.claude/skills/`:

* `new-domain` — scaffold a full vertical slice for a new domain.
* `new-repository` — scaffold a repository following the data-access rules.
* `new-service` — scaffold a service (+ test) following the business-logic rules.

## Documentation

* Architecture: `docs/architecture.md`
* Database design: `docs/database.md`
* Product requirements: `docs/product.md`
* Roadmap: `docs/roadmap.md`

## Current Priority

Phases 0–4 are complete (see `docs/roadmap.md`). Work is now on the backlog
items at the bottom of that file — check it before starting anything new.
