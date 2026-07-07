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

* **Node ≥ 20**, **npm** (lockfile committed) — Next 15 + React 19
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
npm run lint           # eslint (next/core-web-vitals) — note: `next lint` is removed in Next 16; see roadmap backlog "Migrate off deprecated next lint"
npm run typecheck      # tsc --noEmit (no build output) — same check CI runs
npm test               # run unit tests once (Vitest)
npm run test:watch     # tests in watch mode

# Database (Drizzle + PostgreSQL); requires DATABASE_URL in .env
npm run db:generate    # generate a SQL migration from src/db/schema into drizzle/
npm run db:migrate     # apply pending migrations
npm run db:push        # push schema directly to the DB (dev convenience)
npm run db:studio      # open Drizzle Studio
```

Run a single test file: `npx vitest run path/to/file.test.ts`.

### MCP servers

These MCP servers are wired up via the committed `.mcp.json` and available in
this environment for working on the project:

* **`postgres`** — read-only access to the dev database, for ad-hoc inspection
  (e.g. checking rows while debugging). Reads only — never a substitute for the
  repository layer.
* **`context7`** — fetches current docs for libraries/frameworks (Next, React,
  Drizzle, Zod, etc.). Prefer it over training memory or web search for
  library/API/CLI usage.
* **`playwright`** — drives a real browser; use for end-to-end checks of the
  running app (`npm run dev`) and screenshots.
* **`filesystem`** — file operations within allowed directories (the built-in
  file tools are usually sufficient; this is a fallback).

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
  because `coins` has no `userId` column. Exception: `fx_rates` /
  `fxRateRepository` are global reference data, intentionally **not**
  tenant-scoped.
* **React components** (`src/components`) must not contain database queries or
  import repositories; data comes via props, Server Components, or the API.
  Components are organized by domain: `src/components/{collections,coins,
  valuations,assistant,analytics}/`; shared primitives in `src/components/ui/`;
  shell in `src/components/layout/`. (`analytics/TrendChart` and
  `analytics/CostBreakdownChart` are dependency-free SVG charts rendered by the
  server `/portfolio` page.) Each domain has a client-side "manager" that owns its
  view and talks to the API: `CollectionsManager`, `CoinsManager` (+ the
  `CoinDetailsCard` / `CoinImage` / `CoinInvoices` detail views), `ValuationsManager`, and
  `AssistantWidget`; `SiteHeader` (layout; a Server Component that delegates the
  active-state primary nav to the client `HeaderNav`) and `ConfirmButton` (ui)
  are the shared shell/primitive.
* **Drizzle schema** lives in `src/db/schema`; migrations are generated into
  `drizzle/` and are **not** hand-edited. `src/db/schema/index.ts` re-exports
  all table definitions.
* **Imports use the `@/*` alias** (`@/* → ./src/*`, see `tsconfig.json`), e.g.
  `import { db } from "@/db"`. `src/db/index.ts` exports the singleton Drizzle
  client and throws at import time if no connection string is set — in production
  it reads `PROD_DATABASE_URL` (falling back to `DATABASE_URL`), locally it uses
  `DATABASE_URL` (see ADR-012).
* **Cross-cutting helpers** live in `src/lib`: typed errors, formatting,
  per-domain Zod schemas (`src/lib/validation/`), the swappable
  `FxRateProvider` (`src/lib/fx`, frankfurter.app — see ADR-007), the
  client-side fetch helpers in `src/lib/http.ts` (`readError`, `NETWORK_ERROR`)
  used by the domain "manager" components for consistent API error messaging, and
  the observability primitives `src/lib/logger` + `src/lib/observability`
  (see Observability, ADR-011).

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
Unexpected errors (not `AppError`/`ZodError`) are reported via
`captureException` (see Observability) and returned as a 500 with a correlation
`errorId` in the body.

## Observability

Structured logging, error reporting, and a health check (ADR-011):

* **Log through `logger`** (`src/lib/logger`), never `console.*` — JSON in prod,
  pretty in dev; `LOG_LEVEL` / `LOG_FORMAT` override the `NODE_ENV` defaults.
* **`captureException`** (`src/lib/observability`) records an unexpected error
  and returns an `errorId`. The API boundary calls it; a hosted monitor (Sentry)
  would be wired in behind this seam, not at call sites.
* **`GET /api/health`** is public/unauthenticated (uptime + deploy checks):
  `health.service` + `health.repository` (`SELECT 1`); 200 `ok` / 503 `degraded`.
* **Branded error UIs** surface Next's `error.digest` as a quotable reference:
  `src/app/error.tsx` (in-layout boundary), `global-error.tsx` (root-layout
  throws — DB-outage path; renders its own `<html>`), `not-found.tsx`. These are
  client components, so they must **not** call `captureException` (it imports
  `node:crypto`).

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
* OAuth failures route to a branded page (`pages.error` →
  `src/app/auth/error/page.tsx`; maps `?error=` via `src/lib/auth-errors.ts`).
  It runs during auth failures, so it must not call `auth()` or hit the DB.

## Collection Assistant

The `/assistant` chatbot (`src/services/assistant.service.ts` → `/api/assistant`)
runs a manual agentic loop: OpenAI `gpt-4o-mini` with function calling over the
domain services (read + write + delete). **Tenant-isolation invariant:** the
acting `userId` comes from the session and is injected server-side into every
tool handler — it is never a model-supplied argument — so the model can only
touch the signed-in user's data. Requires `OPENAI_API_KEY`; without it the route
returns 503 and the rest of the app works.

The assistant is rendered as a floating widget (`AssistantWidget`) injected into
the root layout, auth-gated by a Server Component wrapper (`FloatingAssistant`,
defined inline in `src/app/layout.tsx`).

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

## Coin invoices

Auction/seller **invoices** (PDF receipts) per coin reuse the coin-images pattern
end to end — metadata in `coin_invoices`, bytes in object storage, the
`coinInvoice.repository` the only composing layer. PDF-only, max 15 MB
(`src/lib/invoices.ts`). Routes mirror images: `GET`/`POST /api/coins/[id]/invoices`,
`GET`/`DELETE /api/coins/[id]/invoices/[invoiceId]` (GET serves the PDF inline;
`?download=1` forces a download). Renamed from "bills" (table `coin_bills`,
migration `0004`). See ADR-009.

## Coin search and filtering

`GET /api/collections/[id]/coins` accepts query params: `q` (matches `category`
/ `issuing_authority` — coins have no name), `metal`, `category`, `year`, `page`,
`sortBy` (category | metal | denomination | year | createdAt), `sortDir` (asc |
desc). Page size is 20
(`COINS_PAGE_SIZE` in `src/services/coin.service.ts`). Response:
`{ coins, total, page, pageSize }`.

`GET /api/collections/[id]/coins/facets` returns `{ metals: string[], categories: string[] }` — distinct non-null values for filter dropdowns.

Coins have no `name` column (removed in the Data Model Reform, ADR-006). The
display title is **derived** from attributes by `formatCoinTitle`
(`src/lib/coin-format.ts`) — the single source of truth for a coin's title;
search/sort operate on the underlying attributes, not a stored name.

## UI / Design system

The app uses a **dependency-free CSS design system** defined entirely in
`src/app/globals.css`, themed to the "stone & gold" Figma spec (DDR-001). It
provides:

* CSS custom-property theme tokens with a **light + dark** pair (DDR-003; the
  dark set overrides the same token names under `[data-theme="dark"]`, plus a
  `prefers-color-scheme` block for the "system" preference): palette (`--bg`,
  `--surface`, `--text`, `--muted`, `--border`, the golds `--gold`/`--accent`,
  `--primary`, `--on-gold`, `--ink`), `--radius-*`, and the font variables
  `--font-display` (Fraunces), `--font-body` (DM Sans), `--font-micro` (DM Mono,
  the `.mono-label` utility). Fonts load via `next/font` in `layout.tsx`.
* Utility component classes: `.card`, `.row`, `.badge`, `.chip`, `.alert`,
  `.mono-label`, `.crumbs`, `.analytics-bar`, and themed buttons/inputs/tables.

Gold (`--gold #B8871E`) is for **fills only**; gold **text** uses the deeper
`--accent`, and text/icons on a gold fill use `--on-gold` (white on light, dark
ink on dark) — all for WCAG AA in both schemes (see DDR-001, DDR-003). The active
theme is a per-user preference (`users.theme`, Light/Dark/System) applied as
`<html data-theme>` in the root layout (`src/lib/theme`); "system" renders no
attribute and CSS follows the OS — no theme script, no flash.

The whole app is rendered at **75% density** via `zoom: 0.75` on `html` — a global
display scale on top of the design system, so all token/px values stay nominal
(see DDR-002).

Do not introduce a CSS-in-JS library or a component framework (e.g. Tailwind,
shadcn, MUI) — extend `globals.css` instead.

**Accessibility conventions** (in `globals.css`; preserve when adding UI): theme
tokens meet WCAG AA contrast, `:focus-visible` outlines cover links/buttons/inputs,
a skip-to-content link targets `#main-content`, animations/transitions honour
`prefers-reduced-motion`, and `.sr-only` labels icon-only/empty controls. Wrap
wide data tables in `.table-wrap` (scrolls in-region on mobile). Verify with axe
(no violations) in both colour schemes.

**Destructive actions** use `<ConfirmButton>` (`src/components/ui/ConfirmButton.tsx`),
a reusable `<dialog>`-based confirmation prompt. Use it for deletes instead of
`window.confirm`.

**UI state persistence**: client-side preferences use `localStorage`. Current
key: `numisbook:coin-columns-v4` stores column visibility + order as
`ColState[]` for the coin list table. Use a versioned key whenever the shape
changes.

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
  locale — `messages.test.ts` enforces parity. Placeholders are `{name}`,
  interpolated by `t`/`useT`.

Mirrors the theme preference (`src/lib/theme`, DDR-003): both are per-user,
cookie-applied, no flash.

## Account settings

`/settings` (`src/app/settings/page.tsx`, ADR-013): profile edits and
self-service account deletion. Profile/locale/theme mutations are **app-owned**
(`user.service`), distinct from the Auth.js-owned `users` identity columns.
Deletion (`account.service`) cascades in the DB and purges the user's
object-storage bytes. UI: `src/components/settings/` (`ProfileForm`,
`DeleteAccountSection` — deletion uses `<ConfirmButton>`).

## Testing

### Service tests (primary target)

Mock all repositories with `vi.mock()`; test business logic in isolation.
`describe` / `it` / `expect` are global (Vitest `globals: true`). Tests are
colocated next to their source as `*.test.ts`.

There is **no DOM environment** — `vitest.config.ts` runs `environment: "node"`,
so components are not rendered in tests (no `@testing-library/react`). Test
component logic by extracting it into pure helpers and testing those (e.g.
`src/components/analytics/chart-utils.test.ts`, `src/lib/coin-format.test.ts`).

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
* Keep `CLAUDE.md` lean. It carries rules, conventions, invariants, and
  *pointers* — not material an ADR or `docs/` already covers. When a feature
  needs documenting, put the detail in `docs/` (or an ADR) and link to it from
  here; do not duplicate it into CLAUDE.md, which is always-on context. Prefer a
  one-line breadcrumb to a paragraph.
* Prefer documenting significant decisions rather than rediscovering them.

## Before Implementing Any Feature

For any non-trivial feature:

1. Follow the Development Workflow.
2. Produce the required planning artifacts.
3. Obtain an approved Implementation Plan.
4. Execute using the appropriate execution skills.
5. Validate the implementation with the Testing skill.

Small bug fixes may skip planning artifacts when no product, design,
architecture, or database decisions are affected.

## Development Workflow

NumisBook follows an artifact-driven development workflow.

The workflow separates **planning**, **implementation**, and **verification**.

Every workflow skill produces a well-defined artifact that becomes the input for
subsequent steps.

Not every feature requires every planning role, but every non-trivial feature
must produce the appropriate planning artifacts before implementation begins.

```
Planning

Product Manager
        │
        ▼
Product Review
        │
        ├─────────────┐
        ▼             ▼
UI Designer      Architect
        │             │
        ▼             ▼
UI Review    Architecture Review
        │             │
        │             ▼
        │      Database Designer (optional)
        │             │
        │             ▼
        │      Database Review
        │
        ├──────────────┐
        ▼              ▼
Design Recorder     ADR Writer
(optional)          (optional)
        │              │
        ▼              ▼
      DDR             ADR

               ▼
        Issue Writer
               │
               ▼
        GitHub Issues
               │
               ▼
Implementation Engineer
        │
        ▼
Implementation Plan
        │
        ▼
Execution Skills
        │
        ▼
Testing
        │
        ▼
Testing Report
```

Small bug fixes may skip planning artifacts when no product, design,
architecture, or database decisions are affected.

## Workflow Artifacts

Workflow skills communicate through planning artifacts rather than directly.

Each artifact has a single owner and a clearly defined purpose.

### Product Review

Produced by: Product Manager

Defines:

- user problem
- user story
- acceptance criteria
- MVP scope
- roadmap alignment

### UI Review

Produced by: UI Designer

Defines:

- layouts
- interactions
- accessibility
- responsive behaviour
- visual consistency

### Architecture Review

Produced by: Architect

Defines:

- affected domains
- affected layers
- implementation strategy
- risks

### Database Review

Produced by: Database Designer

Defines:

- schema changes
- migrations
- indexes
- integrity constraints

### GitHub Issues

Produced by: Issue Writer

Defines:

- Epics / User Stories / Bugs for the approved work
- suggested labels (per `docs/github-issues.md`)
- references to the planning artifacts and ADRs / DDRs

Created after the planning artifacts (Product, UI, Architecture, Database
reviews) and any ADRs / DDRs exist, before implementation begins.

### Implementation Plan

Produced by: Implementation Engineer

Defines:

- implementation order
- affected files
- execution skills
- testing strategy

### Testing Report

Produced by: Testing

Defines:

- executed tests
- regressions
- accessibility verification
- remaining issues

### Architecture Decision Record (ADR)

Produced by: ADR Writer

Documents significant architectural decisions for long-term project consistency.

### Design Decision Record (DDR)

Produced by: Design Recorder

Documents significant UI/UX decisions for long-term design consistency.

## Claude Skills

Project skills live in:

`.claude/skills/`

They are organized into three categories.

### Workflow Skills

Workflow skills analyse requirements and produce planning artifacts.

Core workflow skills:

- product-manager
- ui-designer
- architect
- database-designer
- implementation-engineer
- testing

### Governance Skills

Governance skills preserve long-term project consistency.

They document or review significant decisions without implementing them.

Current governance skills:

- adr-writer
- design-recorder
- refactoring-reviewer

### Execution Skills

Execution skills implement approved plans.

Execution skills consume the approved Implementation Plan together with any
relevant ADRs and DDRs.

They implement approved decisions rather than redefining them.

Current execution skills (each maps to a layer of the vertical slice):

- feature-implementer — coordinate a full vertical slice across the layers below.
- api-builder — expose services through thin Next.js API routes.
- repository-builder — implement/modify repositories (the only Drizzle layer).
- service-builder — implement/modify framework-agnostic business services.
- ui-builder — implement React UI using the design system and approved UX.
- storage-builder — implement features backed by the object-storage abstraction.
- assistant-builder — implement the AI assistant: tools, function-calling, and the orchestration loop over domain services.

Additional execution skills may be added as the project evolves.

### Project-Management Skills

Project-management skills turn work into GitHub-tracked issues; they create
tracking artifacts only and never design or implement features. They follow the
repository issue templates (`.github/ISSUE_TEMPLATE/` — `epic.md`,
`user-story.md`, `bug.md`) and the conventions in `docs/github-issues.md`
(issue types Epic / User Story / Bug; the `epic`/`story`/`bug`, `priority:*`,
and `area:*` label sets). Do not invent new labels or issue structures.

- issue-writer — create Epics / User Stories / Bugs for new, approved work.
- project-historian — reconstruct already-completed work as historical issues
  from `docs/history.md`, the ADRs/DDRs, and the roadmap.

## Documentation

* Architecture: `docs/architecture.md`
* Deployment runbook: `docs/deployment.md` (Vercel + Neon; ADR-012)
* Database design: `docs/database.md`
* Product requirements: `docs/product.md`
* Roadmap (planned work): `docs/roadmap.md`
* History (completed milestones, by phase): `docs/history.md`
* GitHub issue conventions (types, labels, titles): `docs/github-issues.md`
* Architecture decisions (ADRs): `docs/decisions/`
* Design decisions (DDRs): `docs/design-decisions/`

Each `src/*` layer also has a short `README.md` (`src/services`, `src/repositories`,
`src/app`, `src/app/api`, `src/components`, `src/db/schema`, `src/lib`) restating
the rule for that layer — read it when working inside one.

## Documentation Hierarchy

When making decisions, consult documentation in the following order:

1. docs/decisions/
2. docs/design-decisions/
3. docs/product.md
4. docs/roadmap.md
5. docs/architecture.md
6. docs/database.md
7. docs/history.md

Workflow artifacts are transient planning outputs.

Long-term architectural and design decisions must be recorded as ADRs or Design
Decision Records (DDRs).

If documentation conflicts:

1. Identify the conflict.
2. Explain the tradeoffs.
3. Request clarification or propose a new ADR.

Do not silently choose one source over another.

## Decision Records

Accepted architectural decisions are stored in `docs/decisions/`:

* `ADR-001-nextjs-monolith` — Next.js monolith
* `ADR-002-drizzle-over-prisma` — Drizzle ORM over Prisma
* `ADR-003-authjs-google-oauth` — Auth.js + Google OAuth
* `ADR-004-s3-storage-abstraction` — S3-compatible storage abstraction
* `ADR-005-cloudflare-r2-initial-provider` — Cloudflare R2 as initial provider
* `ADR-006-coin-and-valuation-attribute-rework` — Coin & valuation attribute rework
* `ADR-007-portfolio-analytics-upgrade` — Portfolio analytics upgrade (multi-currency + ECB FX)
* `ADR-008-ui-embellishment` — UI embellishment (overview aggregates, error surfacing, a11y baseline)
* `ADR-009-ux-and-feature-refinement` — UX & feature refinement (tax partition, card grids, coin invoices)
* `ADR-010-ci-pipeline-github-actions` — CI on GitHub Actions (lint + type-check + test gates on PRs / `main`)
* `ADR-011-observability` — Observability (structured logger, `ErrorReporter` seam, `/api/health`)
* `ADR-012-production-deployment` — Production deployment (Vercel + Neon; migrations via a gated CI `migrate` job). Runbook: `docs/deployment.md`
* `ADR-013-account-settings-and-deletion` — Account settings & self-service account deletion (`/settings`; app-owned profile mutations; DB cascade + object-storage purge)
* `ADR-014-internationalization` — Internationalization (custom no-dependency i18n; cookie + per-user `locale` preference, no URL routing; 7 locales; `zh` via system CJK fallback)

(`template.md` is the scaffold for new ADRs.)

Accepted **design** decisions are stored in `docs/design-decisions/`:

* `DDR-001-figma-ui-redesign` — Figma "stone & gold" re-skin (visual-only; originally an ADR, relocated to the DDRs). Its light-only stance is **superseded by DDR-003**.
* `DDR-002-global-display-density` — global `zoom: 0.75` on `html` (renders the whole app at 75% density; builds on, does not supersede, DDR-001)
* `DDR-003-dark-mode` — warm dark theme + per-user Light/Dark/System `theme` preference (supersedes DDR-001's light-only decision; adds the `--on-gold` token). Its Settings control is **amended by DDR-004**.
* `DDR-004-theme-toggle` — replace the Settings theme `<select>` with a binary sun/moon toggle; drop the user-selectable "System" option (amends DDR-003 §3; the `system` fallback still governs never-chosen accounts)

(`docs/design-decisions/template.md` is the scaffold for new DDRs.)

These decisions take precedence over generated suggestions.

If a task conflicts with an accepted decision:

* identify the conflict
* explain the tradeoffs
* propose a new ADR

Do not silently override accepted decisions.

## Current Priority

Before starting new work:

1. Review the active milestone in `docs/roadmap.md`.
2. Review completed work in `docs/history.md`.
3. Follow the Development Workflow.
4. Record significant architectural or design decisions as ADRs or DDRs.

Do not implement backlog items unless they have been promoted into the active
milestone.