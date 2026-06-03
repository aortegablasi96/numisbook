# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NumisBook is a SaaS platform for coin collectors.

Core features:

* Collection management
* Coin inventory
* Valuation tracking
* Auction monitoring (post-MVP)
* AI-assisted research (post-MVP)
* Portfolio analytics (post-MVP)

## Stack

* **TypeScript** + **Next.js** (App Router) + **React**
* **Drizzle ORM** over **PostgreSQL** (migrations via `drizzle-kit` → `drizzle/`)
* **Zod** for input validation at the API boundary

> Status: scaffold (folders + docs + skills) is in place; application code is
> **not yet implemented**. There is no `package.json` yet, so build/lint/test
> commands are defined in `docs/roadmap.md` Phase 1, not here. Update this
> section with the real commands once the project is initialized.

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
  intention-revealing methods and return domain-shaped data.
* **React components** (`src/components`) must not contain database queries or
  import repositories; data comes via props, Server Components, or the API.
* **Drizzle schema** lives in `src/db/schema`; migrations are generated into
  `drizzle/` and are **not** hand-edited.

A new feature is built as a vertical slice:
`schema → repository → service (+ tests) → API route → UI`.

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

Build the MVP before introducing advanced automation or optimization.
See `docs/roadmap.md`.
