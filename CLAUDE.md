# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NumisBook is a SaaS platform for coin collectors: collection management, coin
inventory (per-coin images + PDF invoices), valuation tracking, portfolio
analytics, and an OpenAI-backed collection assistant. See `docs/product.md` for
requirements and `docs/roadmap.md` for status.

Out of scope for now: marketplace/trading, mobile apps, auction monitoring,
AI-assisted coin identification.

## Stack

* **Node ≥ 20** (pinned by `.nvmrc`), **npm** (lockfile committed)
* **TypeScript** + **Next.js 15** (App Router) + **React 19**
* **Drizzle ORM** over **PostgreSQL** (migrations via `drizzle-kit` → `drizzle/`)
* **Zod** for input validation at the API boundary
* **OpenAI** (`openai`, gpt-4o-mini) for the collection assistant only
* **sharp** for on-the-fly image resizing (coin thumbnail API)

## Commands

```bash
npm run dev            # start the dev server (http://localhost:3000)
npm run build          # production build
npm run lint           # eslint CLI, flat config (eslint.config.mjs → next/core-web-vitals)
npm run typecheck      # tsc --noEmit — same check CI runs
npm test               # run unit tests once (Vitest)
npm run test:watch     # tests in watch mode

# Database (Drizzle + PostgreSQL); requires DATABASE_URL in .env
npm run db:generate    # generate a SQL migration from src/db/schema into drizzle/
npm run db:migrate     # apply pending migrations
npm run db:push        # push schema directly to the DB (dev convenience)
npm run db:studio      # open Drizzle Studio
npm run db:export-demo # regenerate demo fixtures + assets from the source demo account
npm run db:seed-demo   # seed the read-only public demo tenant (ADR-016)
```

Run a single test file: `npx vitest run path/to/file.test.ts`.

CI (`.github/workflows/ci.yml`, ADR-010) gates every PR and push to `main` on
`npm run lint` + `npm run typecheck` + `npm test` — run all three locally before
pushing. On `main`, a second job applies pending migrations against production
(ADR-012 / `docs/deployment.md`).

Local setup: copy `.env.example` to `.env`, set `DATABASE_URL` (and the Auth.js
vars to enable sign-in), then `npm install` → `npm run db:generate` →
`npm run db:migrate` → `npm run dev`.

### MCP servers

Wired up via the committed `.mcp.json`:

* **`postgres`** — read-only access to the dev database, for ad-hoc inspection.
  Reads only — never a substitute for the repository layer.
* **`context7`** — current docs for libraries/frameworks. Prefer it over training
  memory or web search for library/API/CLI usage.
* **`playwright`** — drives a real browser; end-to-end checks of the running app
  and screenshots.
* **`filesystem`** — fallback file operations (the built-in file tools usually suffice).

## Architecture Rules

Dependencies point **downward only**:

```
src/app  →  src/services  →  src/repositories  →  src/db  →  PostgreSQL
```

* **API routes are thin** (`src/app/api/**/route.ts`): validate input → call a
  service → shape the response. No business logic, no DB access. Shared helpers
  live in `src/app/api/_lib.ts`: `currentUser()` (resolve session → domain user),
  `unauthorized()`, `errorResponse()` (maps `ZodError` → 400, `AppError` → its
  status, anything else → 500), and `csvResponse()`.
* **Business logic belongs in services** (`src/services`). Services are
  framework-agnostic (no `Request`/`Response`, no React) and access data only
  through repositories.
* **Database access belongs in repositories** (`src/repositories`) — the only
  layer that imports `src/db` / runs Drizzle queries. Repositories expose
  intention-revealing methods and return domain-shaped data. Enforced by an
  ESLint `no-restricted-imports` guard: importing `@/db` / `@/db/**` outside
  `src/repositories` (plus `src/db` itself and `src/auth.ts`, the Auth.js
  adapter) fails `npm run lint`.
* **Tenant isolation.** Every user is a tenant; data must never leak across
  users. Repository methods for user-owned entities take the owner's `userId`
  and scope every read/write by it (`WHERE … AND user_id = userId`). The
  `userId` always comes from the authenticated session (`currentUser()`), never
  from client input. Mutations that match no row raise `NotFoundError` (404)
  rather than revealing another tenant's data. Coins are scoped indirectly — via
  a subquery of the user's `collectionId`s — because `coins` has no `userId`
  column. Exception: `fx_rates` / `fxRateRepository` are global reference data,
  intentionally **not** tenant-scoped.
* **React components** (`src/components`) must not contain database queries or
  import repositories; data comes via props, Server Components, or the API.
  Organized by domain (`collections`, `coins`, `valuations`, `assistant`,
  `analytics`, `settings`, `demo`, `i18n`); shared primitives in `ui/`; shell in
  `layout/`. Each data domain has a client-side "manager" that owns its view and
  talks to the API (`CollectionsManager`, `CoinsManager`, `ValuationsManager`).
* **Drizzle schema** lives in `src/db/schema`; migrations are generated into
  `drizzle/` and are **not** hand-edited. `src/db/schema/index.ts` re-exports all
  table definitions.
* **Imports use the `@/*` alias** (`@/* → ./src/*`, see `tsconfig.json`).
  `src/db/index.ts` exports the singleton Drizzle client and throws at import
  time if no connection string is set — in production it reads
  `PROD_DATABASE_URL` (falling back to `DATABASE_URL`), locally `DATABASE_URL`
  (ADR-012).
* **Cross-cutting helpers** live in `src/lib`: typed errors, formatting,
  per-domain Zod schemas (`validation/`), the swappable `FxRateProvider` (`fx`,
  frankfurter.app — ADR-007), client-side fetch helpers (`http.ts` — `readError`,
  `NETWORK_ERROR`, used by the manager components for consistent API error
  messaging), and the observability primitives `logger` + `observability`.

A new feature is built as a vertical slice:
`schema → repository → service (+ tests) → API route → UI`.

Each `src/*` layer has a short `README.md` restating its rule — read it when
working inside one.

## Errors

`src/lib/errors.ts` defines the typed error hierarchy used across services:

```
AppError(message, status)       — base; carries an HTTP status
  ValidationError(message)      — 400; domain invariant violations
  NotFoundError(message)        — 404; missing or invisible resource
  ForbiddenError(message)       — 403; authenticated but not allowed (demo writes)
```

Services throw these; `errorResponse()` in `_lib.ts` maps them to JSON
responses. Never throw raw `Error` from a service for a known domain failure.
Unexpected errors (not `AppError`/`ZodError`) are reported via
`captureException` and returned as a 500 with a correlation `errorId`.

## Observability

ADR-011.

* **Log through `logger`** (`src/lib/logger`), never `console.*` — JSON in prod,
  pretty in dev; `LOG_LEVEL` / `LOG_FORMAT` override the `NODE_ENV` defaults.
* **`captureException`** (`src/lib/observability`) records an unexpected error
  and returns an `errorId`. The API boundary calls it; a hosted monitor (Sentry)
  would be wired in behind this seam, not at call sites.
* **`GET /api/health`** is public/unauthenticated (uptime + deploy checks):
  `health.service` + `health.repository` (`SELECT 1`); 200 `ok` / 503 `degraded`.
* **Branded error UIs** surface Next's `error.digest` as a quotable reference:
  `src/app/error.tsx`, `global-error.tsx` (root-layout throws — DB-outage path;
  renders its own `<html>`), `not-found.tsx`. These are client components, so
  they must **not** call `captureException` (it imports `node:crypto`).

## Repository types

Repositories export inferred Drizzle types (`$inferSelect`, `$inferInsert`) as
the canonical domain types re-used by services, API routes, and components:

```ts
export type Coin = typeof coins.$inferSelect;
export type NewCoin = typeof coins.$inferInsert;
```

Import domain types from repositories, not from `@/db/schema` directly.

## Authentication

Auth.js v5 (`next-auth@5`) with the Drizzle adapter and **database** sessions
(no JWTs). Google is the only provider. ADR-003.

* Config lives in `src/auth.ts` (exports `handlers`, `auth`, `signIn`,
  `signOut`); `src/app/api/auth/[...nextauth]/route.ts` re-exports `handlers`.
* Auth.js reads `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` from the
  environment automatically (generate the secret with `npx auth secret`).
* Auth tables live in `src/db/schema/auth.ts` and `users.ts`.
* The architecture rules still apply: call the Next-specific `auth()` in a route
  or Server Component, then pass the plain session into a service.
  `src/services/auth.service.ts` (`resolveCurrentUser`) takes an `AuthSession`
  shape rather than touching `auth()` or Drizzle directly.
* OAuth failures route to a branded page (`pages.error` →
  `src/app/auth/error/page.tsx`; maps `?error=` via `src/lib/auth-errors.ts`).
  It runs during auth failures, so it must not call `auth()` or hit the DB.

## Public demo account

A visitor can enter a seeded, **read-only** demo tenant without Google (ADR-016,
DDR-007). The demo user is an ordinary tenant (`users.is_demo`) — its id comes
from the session and every query is scoped by it — so tenant isolation is
unchanged. Its session is minted directly (a `sessions` row + the Auth.js cookie,
which `src/auth.ts` names explicitly) because Auth.js cannot issue one without a
provider. Entry point: the `startDemo` Server Action in `src/app/demo-actions.ts`.

**Every mutating API route and Server Action must call `assertWritable(user)`**
(`src/lib/demo.ts`, re-exported from `api/_lib.ts`);
`src/app/api/write-guard.test.ts` fails the build if a mutating route omits it.
Seed with `npm run db:seed-demo`; the seed/fixture tooling lives in `scripts/`.

## Collection Assistant

`src/services/assistant.service.ts` → `/api/assistant` runs a manual agentic
loop: OpenAI `gpt-4o-mini` with function calling over the domain services (read +
write + delete). **Tenant-isolation invariant:** the acting `userId` comes from
the session and is injected server-side into every tool handler — it is never a
model-supplied argument — so the model can only touch the signed-in user's data.
Requires `OPENAI_API_KEY`; without it the route returns 503 and the rest of the
app works.

There is no `/assistant` page: the only UI surface is `AssistantWidget`, a
floating widget rendered in the root layout when a user is signed in.

## Coin images

Image **bytes live in object storage**, not Postgres. The `coin_images` table
holds only metadata — `mime_type`, `size_bytes`, `storage_key` (separate table so
coin listings stay lean; cascades on coin delete). Multiple images per coin; the
UI shows a carousel.

The backend is an abstraction in `src/lib/storage` (an `ObjectStorage` interface
with `put`/`get`/`delete`). `objectStorage` auto-selects from the environment: an
S3-compatible client (`S3Storage`, AWS SDK; targets Cloudflare R2) when the `R2_*`
vars are set, otherwise a local-filesystem fallback (`FsStorage`, under
`./.storage`, gitignored) so dev/test run with no cloud credentials. Swapping
providers is a one-file change (ADR-004, ADR-005). The `coinImage.repository` is
the only layer that composes the DB row with the stored object; it deletes the
object on row delete and cleans up on a failed insert so no orphans are left.

Routes live under `/api/coins/[id]/images` (+ `/[imageId]`); `/api/coins/[id]/image`
is a legacy alias serving the first image. The `?w=<px>` thumbnail path resizes to
fit within `w×w` (max 2000 px), converts to WebP at quality 82, and returns
`Cache-Control: public, immutable` (UUID-stable IDs never change). The no-`?w`
path returns the original with `Cache-Control: private, no-cache`. Constraints:
PNG/JPEG/WebP/GIF, max 5 MB (`src/lib/images.ts`).

## Coin invoices

Auction/seller **invoices** (PDF receipts) per coin reuse the coin-images pattern
end to end — metadata in `coin_invoices`, bytes in object storage, the
`coinInvoice.repository` the only composing layer. PDF-only, max 15 MB
(`src/lib/invoices.ts`). Routes mirror images under `/api/coins/[id]/invoices`
(GET serves the PDF inline; `?download=1` forces a download). Renamed from
"bills" (table `coin_bills`, migration `0004`). See ADR-009.

## Coin search and filtering

Coins are searchable on **two** surfaces, which share one contract (ADR-015):

* `GET /api/collections/[id]/coins` (+ `/facets`) — coins in one collection.
* `GET /api/coins` (+ `/facets`) — the user's coins across **every** collection.

Coins have no `user_id`, so both scope indirectly through `collections.user_id`.
**The facets query is scoped identically** — an unscoped `SELECT DISTINCT` would
leak another tenant's data through a filter dropdown.

Multi-value filters are **repeated query params** (`?metal=Silver&metal=Gold`),
read with `getAll`: **OR within a field, AND across fields**. Filterable: `q`,
`metal`, `category`, `denomination`, `mint`, `grade`, plus a `yearFrom`/`yearTo`
**range** (signed; negative = BC). `q` matches category, issuing authority,
denomination, mint, and catalogue references. Also `page`, `sortBy`, `sortDir`;
page size 20 (`COINS_PAGE_SIZE`). Response: `{ coins, total, page, pageSize }`.

The query contract is defined **once** in `coinSearchParamsSchema`
(`src/lib/validation/coin.ts`) and the SQL conditions **once** in
`buildCoinConditions` (`coin.repository`) — both surfaces compose them, so they
cannot drift. Add a filter in those two places, not per-route.

`issuing_authority` is searchable but deliberately **not faceted**
(high-cardinality free text). `CoinFilters` is shared by both surfaces (DDR-005);
`/coins` is read-only — coins are created inside a collection.

Coins have no `name` column (removed in the Data Model Reform, ADR-006). The
display title is **derived** from attributes by `formatCoinTitle`
(`src/lib/coin-format.ts`) — the single source of truth for a coin's title;
search/sort operate on the underlying attributes, not a stored name.

## Coin CSV export

`Export CSV` on both coin surfaces downloads the coins matching the **current
filter/search/sort** — not the page in view (ADR-017). Routes mirror `/facets`:
`GET /api/coins/export` and `GET /api/collections/[id]/coins/export`; both parse
`coinSearchParamsSchema` and ignore `page`.

Invariants worth knowing before touching it:

* The column contract is defined **once** in `src/lib/coin-export.ts` (CSV import
  will read it back). A compile-time check in `coin-export.test.ts` **fails the
  build** if a new `coins` column is neither exported nor listed in
  `COIN_EXPORT_OMITTED` — decide deliberately, don't silence it.
* Values are written **as stored**: signed years (negative = BC), ISO dates,
  prices in the coin's own currency (**never** FX-converted). `title` is derived
  and read-only.
* Formula-injection escaping is applied **by column type** (text only). Do not
  "fix" this into a blanket rule — it would rewrite `-44` (44 BC) to `'-44`.
* Export is a **read**: no `assertWritable`, and the demo tenant keeps it.

## Home dashboard

`/` (`src/app/page.tsx`) is a Server Component with no client manager: signed-out
it renders the marketing/sign-in view; signed-in it composes services directly —
portfolio stat tiles (`analytics.service`), collection shortcuts
(`collection.service`), and recent acquisitions (`coin.service`
`listRecentAcquisitions`, which converts each price into the user's base currency
via the FX converter, falling back to the original currency when no rate applies).

## UI / Design system

A **dependency-free CSS design system** defined entirely in `src/app/globals.css`,
themed to the "stone & gold" Figma spec (DDR-001). Do not introduce a CSS-in-JS
library or a component framework (e.g. Tailwind, shadcn, MUI) — extend
`globals.css` instead.

* **Theme tokens** are CSS custom properties with a **light + dark** pair (DDR-003;
  the dark set overrides the same token names under `[data-theme="dark"]`, plus a
  `prefers-color-scheme` block for "system"): palette (`--bg`, `--surface`,
  `--text`, `--muted`, `--border`, the golds `--gold`/`--accent`, `--primary`,
  `--on-gold`, `--ink`), `--radius-*`, and the fonts `--font-display` (Fraunces),
  `--font-body` (DM Sans), `--font-micro` (DM Mono, the `.mono-label` utility).
  Fonts load via `next/font` in `layout.tsx`.
* **Utility classes**: `.card`, `.row`, `.badge`, `.chip`, `.alert`,
  `.mono-label`, `.crumbs`, `.analytics-bar`, plus themed buttons/inputs/tables.

**Gold** (`--gold #B8871E`) is for **fills only**; gold **text** uses the deeper
`--accent`, and text/icons on a gold fill use `--on-gold` (white on light, dark
ink on dark) — all for WCAG AA in both schemes. Check gold text on an
`--accent-weak` tint against **`--bg`**, not just `--surface` — the tint
composites darker off-card, which is what pushed `--accent` below AA and deepened
it to `#7f5612` (DDR-005 §7). The active theme is a per-user preference
(`users.theme`) applied as `<html data-theme>` in the root layout
(`src/lib/theme`); "system" renders no attribute and CSS follows the OS — no theme
script, no flash.

**Density**: the app renders at 75% via `zoom: 0.75` on `html` — a display scale
on top of the design system, so all token/px values stay nominal (DDR-002). It is
**desktop only**; at and below the tablet stop the app renders at 100% (DDR-006).
`chart-layout.ts` reads that same scale at runtime (`currentZoom`), so the CSS and
it must change together.

**Responsive layout** (DDR-006) uses a three-stop scale — **phone** `≤ 640px`,
**tablet** `≤ 1024px`, **desktop** (default), plus **wide** `≥ 1440px` for
enhancements. These are the only widths any media query may use; do not add a
fourth. Below `desktop` the zoom is 1, so media queries and layout boxes share one
coordinate space — above it the layout is 1.333× the media-query width. On a phone
the coin table is restyled into cards (same DOM, so `ColState` still drives the
columns) and the facet popovers expand in place rather than floating.

**Accessibility** (in `globals.css`; preserve when adding UI): theme tokens meet
WCAG AA contrast, `:focus-visible` outlines cover links/buttons/inputs, a
skip-to-content link targets `#main-content`, animations honour
`prefers-reduced-motion`, and `.sr-only` labels icon-only/empty controls. Wrap
wide data tables in `.table-wrap`. Verify with axe (no violations) in both schemes.

**Destructive actions** use `<ConfirmButton>` (`src/components/ui/ConfirmButton.tsx`),
a `<dialog>`-based confirmation prompt — not `window.confirm`.

**Icons** are inline SVG, no icon library. Shared ones live in
`src/components/ui/icons.tsx`; reuse them before hand-rolling a new `<svg>`.

**UI state persistence**: client-side preferences use `localStorage`. Both current
keys store column visibility + order as `ColState[]` for a coin table
(`CoinTable.tsx`): `numisbook:coin-columns-v4` (per-collection list) and
`numisbook:all-coin-columns-v1` (cross-collection `/coins` list). The two surfaces
keep **separate** keys — their column sets differ, so sharing one would let each
corrupt the other's layout (DDR-005). Use a versioned key whenever the shape changes.

## Internationalization

Custom, dependency-free i18n (ADR-014); no URL routing. The active locale comes
from a cookie plus a per-user `users.locale` preference; 7 locales, `zh` via
system CJK fallback. Code lives in `src/lib/i18n`:

* **Server** — `import { t } from "@/lib/i18n"` and call `t(locale, key, params)`
  in Server Components / routes; resolve the request locale via `@/lib/i18n/server`
  (which uses `next/headers`, so it is server-only — never import it from client
  code; the `@/lib/i18n` barrel is client-safe).
* **Client** — get `useT()` from `LocaleProvider`
  (`src/components/i18n/LocaleProvider.tsx`, mounted in the root layout).
* **Messages** are typed catalogs in `src/lib/i18n/messages/<locale>.ts`; `en.ts`
  defines the `MessageKey` union (the source of truth). Add a key to **every**
  locale — `messages.test.ts` enforces parity. Placeholders are `{name}`.

Mirrors the theme preference (`src/lib/theme`, DDR-003): both are per-user,
cookie-applied, no flash.

## Account settings

`/settings` (ADR-013): profile edits and self-service account deletion.
Profile/locale/theme mutations are **app-owned** (`user.service`), distinct from
the Auth.js-owned `users` identity columns. Deletion (`account.service`) cascades
in the DB and purges the user's object-storage bytes.

## Testing

Tests are colocated next to their source as `*.test.ts`.

**Service tests are the primary target**: mock all repositories with `vi.mock()`
and test business logic in isolation.

**Import `describe` / `it` / `expect` from `vitest` in every test file.** Vitest
runs with `globals: true`, so they resolve at runtime — but `tsconfig.json` does
not pull in `vitest/globals`, so omitting the import passes `npm test` and then
fails `npm run typecheck`, which is a CI gate.

There is **no DOM environment** — `vitest.config.ts` runs `environment: "node"`,
so components are not rendered in tests (no `@testing-library/react`). Test
component logic by extracting it into pure helpers and testing those (e.g.
`src/components/analytics/chart-utils.test.ts`, `src/lib/coin-format.test.ts`).

**API route tests**: mock `@/auth`, `@/services/auth.service`, and the called
service module; use **real** Zod validation (do not mock it). Pattern from
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
* Keep `CLAUDE.md` lean. It carries rules, conventions, invariants, and
  *pointers* — not material an ADR or `docs/` already covers. When a feature
  needs documenting, put the detail in `docs/` (or an ADR) and link to it from
  here; do not duplicate it into CLAUDE.md, which is always-on context. Prefer a
  one-line breadcrumb to a paragraph.
* Prefer documenting significant decisions rather than rediscovering them.

## Development Workflow

NumisBook is artifact-driven: planning, implementation, and verification are
separate, and each workflow skill produces an artifact that feeds the next.

For any non-trivial feature, produce the planning artifacts and get an approved
Implementation Plan **before** implementing. Not every feature needs every role.
Small bug fixes may skip planning artifacts when no product, design,
architecture, or database decision is affected.

```
Product Manager → Product Review
      ├→ UI Designer  → UI Review
      └→ Architect    → Architecture Review
                            └→ Database Designer → Database Review  (optional)
   (optional) Design Recorder → DDR      ADR Writer → ADR
                        ↓
              Issue Writer → GitHub Issues
                        ↓
     Implementation Engineer → Implementation Plan
                        ↓
              Execution Skills → Testing → Testing Report
```

Before starting new work: review the active milestone in `docs/roadmap.md` and
completed work in `docs/history.md`. Do not implement backlog items unless they
have been promoted into the active milestone. Record significant architectural or
design decisions as ADRs or DDRs.

Testing Reports land in `docs/testing/<milestone>-testing-report.md`. Workflow
artifacts are transient planning outputs — only ADRs and DDRs are long-term.

## Claude Skills

Project skills live in `.claude/skills/`, grouped into category directories. Each
skill's `SKILL.md` defines its own responsibilities and the artifact it owns —
**read that file** rather than relying on the summary here. (The category nesting
means these are not registered as slash-invocable skills; open the `SKILL.md`
directly.)

* **Workflow** (`workflow-skills/`) — analyse requirements, produce planning
  artifacts: `product-manager`, `ui-designer`, `architect`, `database-designer`,
  `implementation-engineer`, `testing`.
* **Governance** (`governance-skills/`) — document or review significant
  decisions without implementing them: `adr-writer`, `design-recorder`,
  `refactoring-reviewer`.
* **Execution** (`execution-skills/`) — implement an approved plan (they execute
  approved decisions rather than redefining them); each maps to a layer of the
  vertical slice: `feature-implementer` (coordinates a full slice),
  `repository-builder`, `service-builder`, `api-builder`, `ui-builder`,
  `storage-builder`, `assistant-builder`.
* **Project management** (`project-management/`) — tracking artifacts only, never
  design or implementation: `issue-writer` (new approved work),
  `project-historian` (reconstruct completed work as historical issues). Both
  follow `.github/ISSUE_TEMPLATE/` and `docs/github-issues.md` — do not invent new
  labels or issue structures.

## Documentation

* Product requirements: `docs/product.md`
* Roadmap (planned work): `docs/roadmap.md`
* History (completed milestones, by phase): `docs/history.md`
* Architecture: `docs/architecture.md`
* Database design: `docs/database.md`
* Deployment runbook: `docs/deployment.md` (Vercel + Neon; ADR-012)
* GitHub issue conventions (types, labels, titles): `docs/github-issues.md`
* Testing reports (one per milestone): `docs/testing/`
* Architecture decisions (ADRs): `docs/decisions/`
* Design decisions (DDRs): `docs/design-decisions/`

When making decisions, consult in this order: `docs/decisions/` →
`docs/design-decisions/` → `docs/product.md` → `docs/roadmap.md` →
`docs/architecture.md` → `docs/database.md` → `docs/history.md`.

If documentation conflicts, or a task conflicts with an accepted decision:
identify the conflict, explain the tradeoffs, then request clarification or
propose a new ADR. Do not silently choose one source over another, and do not
silently override an accepted decision — these decisions take precedence over
generated suggestions.

## Decision Records

ADR filenames in `docs/decisions/` are self-describing (`ADR-001-nextjs-monolith`
… `ADR-017-data-portability-contract`); read the file for the decision. Likewise
`docs/design-decisions/` (`DDR-001` … `DDR-007`). Both directories hold a
`template.md` scaffold for new records.

What you cannot see from the filenames — the supersessions and amendments:

* **ADR-016** (public demo account) **departs from ADR-003** (Google as the only
  way to obtain a session).
* **DDR-003** (dark mode) **supersedes DDR-001**'s light-only stance and adds the
  `--on-gold` token.
* **DDR-004** (theme toggle) **amends DDR-003 §3**: the user-selectable "System"
  option is dropped, but the `system` fallback still governs never-chosen accounts.
* **DDR-005 §7** **amends DDR-001**: light-mode `--accent` deepened to `#7f5612`
  (gold text failed AA on its own tint off-card).
* **DDR-006** (responsive layout) **amends DDR-002**: `zoom: 0.75` is desktop-only.
* **DDR-002** builds on, and does not supersede, DDR-001.
