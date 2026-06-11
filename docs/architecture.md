# NumisBook — Architecture

> Status: **Implemented.** Phases 0–4 of the [roadmap](./roadmap.md) are
> complete. The layering and conventions below are enforced in code (the
> repository/DB boundary is also enforced by an ESLint `no-restricted-imports`
> guard).

## Stack

| Concern | Choice |
| --- | --- |
| Language | TypeScript |
| Framework | Next.js (App Router) |
| UI | React (Server + Client Components) |
| Data access | Drizzle ORM |
| Database | PostgreSQL |
| Migrations | drizzle-kit (output in `drizzle/`) |
| Validation | Zod (at the API boundary) |

## Layering

The codebase is split into strict layers. Dependencies point **downward only**.

```
Request
  → src/app            (routes / thin API handlers, React Server Components)
    → src/services     (business logic)
      → src/repositories (data access, Repository pattern)
        → src/db        (Drizzle client + schema)
          → PostgreSQL
```

### Layer responsibilities

| Layer | Path | Responsibility | Must NOT |
| --- | --- | --- | --- |
| Routes / UI | `src/app`, `src/components` | HTTP handling, rendering, input validation | Contain business logic or DB/repository access |
| Services | `src/services` | Business rules, use-case orchestration | Import `src/db` or run queries |
| Repositories | `src/repositories` | All database access via Drizzle | Contain business logic |
| DB | `src/db` | Drizzle client + schema definitions | Be imported outside repositories |

### Key conventions

- **API routes are thin.** Validate → call service → respond.
- **Services are framework-agnostic.** No `Request`/`Response`, no React imports.
  Unit-tested by mocking repositories.
- **Repositories are the only DB boundary.** They expose intention-revealing
  methods and return domain-shaped data, never raw Drizzle query builders.
- **Components never query the database.** Data arrives via props, Server
  Components, or API calls.

## Domains (built)

- **Users / Auth** — accounts, ownership, sessions.
- **Collections** — named groupings of coins owned by a user.
- **Coins / Inventory** — individual coins and their attributes, with
  search/filter/sort/pagination.
- **Coin images** — one or more images per coin (bytes in S3-compatible object
  storage behind `src/lib/storage`; metadata in Postgres; on-the-fly WebP
  thumbnails via `sharp`).
- **Valuations** — point-in-time values for a coin.
- **Portfolio analytics** — a read-model over coins' **price paid** (hammer and
  final price). Figures (total paid, allocation, acquisition-cost trend) are
  converted into the user's base currency via FX conversion; native per-currency
  spend is still reported for reference. Valuation-based value and gain/loss are
  a later stage.
- **Currency conversion** — ECB reference rates behind an `FxRateProvider`
  interface (`src/lib/fx`, mirroring the storage abstraction), cached in
  `fx_rates`. `fx.service` orchestrates cache-or-fetch and exposes a converter to
  the analytics service. See ADR-007.
- **Collection assistant** — an OpenAI-backed chatbot with function calling over
  the domain services (see `CLAUDE.md`).

Out of scope (for now): auction monitoring, AI-assisted research / coin
identification, marketplace/trading, mobile apps.

## Cross-Cutting Concerns

- **Authentication & authorization** — Auth.js v5 (NextAuth) with the Drizzle
  adapter and Google OAuth; database session strategy. Config in `src/auth.ts`,
  route handler at `src/app/api/auth/[...nextauth]/route.ts`. Server Components /
  routes call `auth()` and pass the session to `auth.service` to resolve the
  domain user (keeping services framework-agnostic).
- **Validation** — Zod schemas in `src/lib` / at the route boundary.
- **Error handling** — typed errors in `src/lib`, mapped to HTTP at the boundary.
- **AI assistant** — `src/services/assistant.service.ts` runs a manual agentic
  loop (OpenAI `gpt-4o-mini`); the acting `userId` is injected server-side into
  every tool handler, never model-supplied, preserving tenant isolation.
- **Logging / observability** — TODO (see roadmap backlog).

## Folder Map

```
src/
  app/            # Next.js routes, pages, layouts
    api/          # thin HTTP route handlers
  components/     # React UI (no DB access)
  services/       # business logic
  repositories/   # data access (Repository pattern, Drizzle)
  db/
    schema/       # Drizzle table definitions
  lib/            # shared utilities (validation, errors, formatting)
drizzle/          # generated SQL migrations
docs/             # architecture, database, product, roadmap
.claude/skills/   # project-specific Claude Code skills
```

See also: [`database.md`](./database.md), [`product.md`](./product.md),
[`roadmap.md`](./roadmap.md).

## Dependency Rules

Allowed:

Service
→ Repository

Service
→ Storage Abstraction

Service
→ AI Service

Service
→ Other Services (only when justified)

Forbidden:

Service
→ Database

Service
→ Drizzle

Service
→ React

Service
→ Request / Response

Service
→ Cloudflare R2 SDK directly
