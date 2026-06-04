# NumisBook — Architecture

> Status: **Scaffold defined; application code not yet implemented.**

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

## Domains (planned)

- **Users / Auth** — accounts, ownership, sessions.
- **Collections** — named groupings of coins owned by a user.
- **Coins / Inventory** — individual coins and their attributes.
- **Valuations** — point-in-time values for a coin.

Later (post-MVP): Auction monitoring, AI-assisted research, Portfolio analytics.

## Cross-Cutting Concerns

- **Authentication & authorization** — Auth.js v5 (NextAuth) with the Drizzle
  adapter and Google OAuth; database session strategy. Config in `src/auth.ts`,
  route handler at `src/app/api/auth/[...nextauth]/route.ts`. Server Components /
  routes call `auth()` and pass the session to `auth.service` to resolve the
  domain user (keeping services framework-agnostic).
- **Validation** — Zod schemas in `src/lib` / at the route boundary.
- **Error handling** — typed errors in `src/lib`, mapped to HTTP at the boundary.
- **Logging / observability** — TODO.

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
