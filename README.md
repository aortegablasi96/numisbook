# NumisBook

A SaaS platform for coin collectors: collection management, coin inventory
(per-coin images + PDF invoices), valuation tracking, portfolio analytics, and
an OpenAI-backed collection assistant.

Out of scope for now: marketplace/trading, mobile apps, auction monitoring,
AI-assisted coin identification.

## Stack

* **Node ≥ 20** (pinned by `.nvmrc`), **npm** (lockfile committed)
* **TypeScript** + **Next.js 15** (App Router) + **React 19**
* **Drizzle ORM** over **PostgreSQL** (migrations via `drizzle-kit` → `drizzle/`)
* **Zod** for input validation at the API boundary
* **OpenAI** (`openai`, gpt-4o-mini) for the collection assistant only
* **sharp** for on-the-fly image resizing (coin thumbnail API)

No CSS framework and no component library — the design system is plain CSS in
`src/app/globals.css`.

## Setup

```bash
cp .env.example .env      # then set DATABASE_URL (+ the Auth.js vars for sign-in)
npm install
npm run db:generate
npm run db:migrate
npm run dev               # http://localhost:3000
```

`.env.example` documents every variable. Only `DATABASE_URL` is required to
boot; the rest degrade gracefully — without `OPENAI_API_KEY` the assistant
returns 503 and the rest of the app works, and without the `R2_*` vars image
bytes fall back to local filesystem storage under `./.storage`.

## Commands

```bash
npm run dev            # start the dev server
npm run build          # production build
npm run lint           # eslint CLI, flat config
npm run typecheck      # tsc --noEmit — same check CI runs
npm test               # run unit tests once (Vitest)
npm run test:watch     # tests in watch mode

npm run db:generate    # generate a SQL migration from src/db/schema into drizzle/
npm run db:migrate     # apply pending migrations
npm run db:push        # push schema directly to the DB (dev convenience)
npm run db:studio      # open Drizzle Studio
npm run db:export-demo # regenerate demo fixtures + assets from the demo account
npm run db:seed-demo   # seed the read-only public demo tenant
```

Run a single test file: `npx vitest run path/to/file.test.ts`.

CI gates every PR and push to `main` on `npm run lint` + `npm run typecheck` +
`npm test` — run all three locally before pushing. On `main`, a second job
applies pending migrations against production.

## Architecture

Dependencies point **downward only**:

```
src/app  →  src/services  →  src/repositories  →  src/db  →  PostgreSQL
```

| Layer | Responsibility |
| --- | --- |
| `src/app` | Routes, pages, thin API handlers |
| `src/services` | Business logic, framework-agnostic |
| `src/repositories` | The only layer that touches the database |
| `src/db` | Drizzle client + schema |
| `src/components` | React UI; no DB access |
| `src/lib` | Cross-cutting helpers (errors, i18n, storage, validation, fx) |

Every layer has its own `README.md` restating its rule — read it when working
inside one. A new feature is built as a vertical slice:
`schema → repository → service (+ tests) → API route → UI`.

**Every user is a tenant.** Repository methods for user-owned entities take the
owner's `userId` and scope every read and write by it. The `userId` always comes
from the authenticated session, never from client input.

## Documentation

`docs/` holds the product requirements, roadmap, history, architecture,
database design, and deployment runbook — start at [`docs/README.md`](docs/README.md).
Significant decisions are recorded as ADRs ([`docs/decisions/`](docs/decisions/))
and DDRs ([`docs/design-decisions/`](docs/design-decisions/)).

`CLAUDE.md` carries the working rules and invariants for Claude Code.
