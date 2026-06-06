# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NumisBook is a SaaS platform for coin collectors.

Built features (see `docs/roadmap.md` for status):

* Collection management
* Coin inventory (with per-coin images stored in Postgres)
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
  service → shape the response. No business logic, no DB access.
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
* **React components** (`src/components`) must not contain database queries or
  import repositories; data comes via props, Server Components, or the API.
* **Drizzle schema** lives in `src/db/schema`; migrations are generated into
  `drizzle/` and are **not** hand-edited.
* **Imports use the `@/*` alias** (`@/* → ./src/*`, see `tsconfig.json`), e.g.
  `import { db } from "@/db"`. `src/db/index.ts` exports the singleton Drizzle
  client and throws at import time if `DATABASE_URL` is unset.
* **Cross-cutting helpers** (Zod validation schemas, typed errors, formatting)
  live in `src/lib`.

A new feature is built as a vertical slice:
`schema → repository → service (+ tests) → API route → UI`.

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

## Development Principles

* Simplicity over complexity.
* Prefer existing patterns over creating new ones.
* Do not introduce new dependencies without justification.
* Keep files under 300 lines when practical.
* Generate tests for all business logic (services are the primary test target;
  mock repositories).
* Vitest runs with `globals: true` (see `vitest.config.ts`), so `describe`,
  `it`, and `expect` are available in test files without importing them.

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

The MVP and post-MVP features (Phases 0–3) are complete. Work is now on Phase 4
"Improvements" and the backlog in `docs/roadmap.md` — check it for the current
focus before starting new work.
