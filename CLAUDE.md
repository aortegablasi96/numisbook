# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NumisBook is a SaaS platform for coin collectors: collection management, coin
inventory (per-coin images + PDF invoices), valuation tracking, portfolio
analytics, and an OpenAI-backed collection assistant.

Out of scope for now: marketplace/trading, mobile apps, auction monitoring,
AI-assisted coin identification.

`README.md` covers the stack, setup, and the full command list. `docs/product.md`
has the requirements, `docs/roadmap.md` the status.

## Commands

```bash
npm run lint           # eslint CLI, flat config
npm run typecheck      # tsc --noEmit
npm test               # run unit tests once (Vitest)
```

**CI gates every PR and push to `main` on all three — run them locally before
pushing** (ADR-010). On `main`, a second job applies pending migrations against
production (ADR-012 / `docs/deployment.md`).

Run a single test file: `npx vitest run path/to/file.test.ts`.
Dev server, build, and the `db:*` commands are in `README.md`.

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

* **API routes are thin** — validate input → call a service → shape the
  response. No business logic, no DB access.
* **Business logic belongs in services**, which are framework-agnostic and
  reach data only through repositories.
* **Database access belongs in repositories** — the only layer that imports
  `src/db`. Enforced by an ESLint `no-restricted-imports` guard, so a stray
  `@/db` import fails `npm run lint`.
* **React components** must not query the database or import repositories.
* **Imports use the `@/*` alias** (`@/* → ./src/*`).

**Each layer has a `README.md` restating its own rules, conventions, and testing
pattern — read it when working inside that layer.** They cover the `_lib.ts`
helpers, the error hierarchy, domain types, storage, i18n, and validation.

A new feature is built as a vertical slice:
`schema → repository → service (+ tests) → API route → UI`.

### Tenant isolation

**Every user is a tenant; data must never leak across users.** This is the
invariant to protect above all others:

* Repository methods for user-owned entities take the owner's `userId` and scope
  every read and write by it. The `userId` **always** comes from the
  authenticated session (`currentUser()`), **never** from client input.
* Mutations that match no row raise `NotFoundError` (404) rather than revealing
  another tenant's data.
* **Coins are scoped indirectly** — via a subquery of the user's `collectionId`s
  — because `coins` has no `userId` column.
* **Facet queries are scoped identically.** An unscoped `SELECT DISTINCT` leaks
  another tenant's data through a filter dropdown.
* Two exceptions, both **intentionally not** tenant-scoped: `fx_rates` /
  `fxRateRepository` (global reference data), and `assistant_usage` /
  `assistantUsageRepository` (operational spend accounting, scoped by an opaque
  `subjectKey` instead — polymorphic, so it carries no `userId` FK, which is why
  account deletion purges it explicitly; ADR-018).

## Errors and observability

Services throw the typed errors from `src/lib/errors.ts` (`AppError` →
`ValidationError` 400, `NotFoundError` 404, `ForbiddenError` 403); the API
boundary maps them to responses. **Never throw a raw `Error` for a known domain
failure.** Details in `src/services/README.md`.

**Log through `logger`** (`src/lib/logger`), never `console.*`. `captureException`
(`src/lib/observability`) records an unexpected error and returns a correlation
`errorId`; a hosted monitor would be wired in behind that seam, not at call
sites. `GET /api/health` is public/unauthenticated for uptime checks. ADR-011.

## Authentication

Auth.js v5 with the Drizzle adapter and **database** sessions (no JWTs). Google
is the only provider. ADR-003.

* Config lives in `src/auth.ts`; Auth.js reads `AUTH_SECRET`, `AUTH_GOOGLE_ID`,
  `AUTH_GOOGLE_SECRET` from the environment automatically.
* The layering still applies: call the Next-specific `auth()` in a route or
  Server Component, then pass the plain session into a service.
  `auth.service.ts` (`resolveCurrentUser`) takes an `AuthSession` shape rather
  than touching `auth()` or Drizzle directly.

## Public demo account

A visitor can enter a seeded, **read-only** demo tenant without Google (ADR-016,
DDR-007). The demo user is an ordinary tenant (`users.is_demo`) — its id comes
from the session and every query is scoped by it — so tenant isolation is
unchanged. Its session is minted directly because Auth.js cannot issue one
without a provider. Entry point: the `startDemo` Server Action in
`src/app/demo-actions.ts`.

**Every mutating API route and Server Action must call `assertWritable(user)`**
(`src/lib/demo.ts`, re-exported from `api/_lib.ts`);
`src/app/api/write-guard.test.ts` fails the build if a mutating route omits it.
Seed tooling lives in `scripts/`.

## Collection Assistant

`src/services/assistant.service.ts` → `/api/assistant` runs a manual agentic
loop: OpenAI `gpt-4o-mini` with function calling over the domain services (read +
write + delete). **Tenant-isolation invariant:** the acting `userId` comes from
the session and is injected server-side into every tool handler — it is never a
model-supplied argument — so the model can only touch the signed-in user's data.
Without `OPENAI_API_KEY` the route returns 503 and the rest of the app works.

There is no `/assistant` page: the only UI surface is `AssistantWidget`, a
floating widget rendered in the root layout when a user is signed in.

## Coin images and invoices

Binary **bytes live in object storage, never in Postgres** — `coin_images` and
`coin_invoices` hold only metadata (`mime_type`, `size_bytes`, `storage_key`),
in separate tables so coin listings stay lean. The `coinImage` / `coinInvoice`
repositories are the only layers that compose a row with its stored object; they
delete the object on row delete and clean up on a failed insert, so no orphans
are left. Backend details: `src/lib/storage/README.md` (ADR-004, ADR-005).

* **Images** — multiple per coin (carousel UI). Routes under
  `/api/coins/[id]/images` (+ `/[imageId]`); `/api/coins/[id]/image` is a legacy
  alias serving the first image. The `?w=<px>` thumbnail path resizes to fit
  within `w×w` (max 2000 px), converts to WebP at quality 82, and returns
  `Cache-Control: public, immutable` (UUID-stable IDs never change); the no-`?w`
  path returns the original as `private, no-cache`. PNG/JPEG/WebP/GIF, max 5 MB
  (`src/lib/images.ts`).
* **Invoices** — auction/seller PDF receipts, mirroring the image routes under
  `/api/coins/[id]/invoices` (GET serves inline; `?download=1` forces a
  download). PDF-only, max 15 MB (`src/lib/invoices.ts`). Renamed from "bills"
  (table `coin_bills`, migration `0004`). ADR-009.

## Coin search and filtering

Coins are searchable on **two** surfaces sharing one contract (ADR-015):
`GET /api/collections/[id]/coins` (one collection) and `GET /api/coins` (across
every collection), each with a `/facets` sibling. Both scope indirectly through
`collections.user_id`.

Multi-value filters are **repeated query params** (`?metal=Silver&metal=Gold`),
read with `getAll`: **OR within a field, AND across fields**. Filterable: `q`,
`metal`, `category`, `denomination`, `mint`, `grade`, plus a `yearFrom`/`yearTo`
**range** (signed; negative = BC). `q` matches category, issuing authority,
denomination, mint, and catalogue references. Also `page`, `sortBy`, `sortDir`;
page size 20 (`COINS_PAGE_SIZE`). Response: `{ coins, total, page, pageSize }`.

The query contract is defined **once** in `coinSearchParamsSchema`
(`src/lib/validation/coin.ts`) and the SQL conditions **once** in
`buildCoinConditions` (`coin.repository`) — both surfaces compose them, so they
cannot drift. **Add a filter in those two places, not per-route.**

`issuing_authority` is searchable but deliberately **not faceted**
(high-cardinality free text). `CoinFilters` is shared by both surfaces (DDR-005);
`/coins` is read-only — coins are created inside a collection.

Coins have no `name` column (removed in the Data Model Reform, ADR-006). The
display title is **derived** by `formatCoinTitle` (`src/lib/coin-format.ts`) —
the single source of truth; search and sort operate on the underlying
attributes, not a stored name.

## Coin CSV import / export

One CSV column contract, two directions (ADR-017 + its CSV import addendum).

**Export** downloads the coins matching the **current filter/search/sort** — not
the page in view. Routes mirror `/facets`: `GET /api/coins/export` and
`GET /api/collections/[id]/coins/export`; both parse `coinSearchParamsSchema`
and ignore `page`.

**Import** is `POST /api/collections/[id]/coins/import` (multipart: `file`, plus
`commit` — **defaults to false, so a request that omits it previews**). One
route, two phases: preview reports counts + per-row errors and writes nothing;
commit re-validates and inserts. Collection surface only.

Invariants worth knowing before touching either:

* The column contract is defined **once** in `src/lib/coin-export.ts`, which
  serves **both** directions despite the name — export writes through it, import
  reads back through it. **Never add a `coin-import.ts` with its own column list**;
  drift between the two sides silently corrupts data on re-import, which ADR-017
  calls the milestone's highest-severity risk. Two compile-time checks in
  `coin-export.test.ts` **fail the build** if a new `coins` column is neither
  exported nor in `COIN_EXPORT_OMITTED`, or is exported but never read back.
* Values are written **as stored**: signed years (negative = BC), ISO dates,
  prices in the coin's own currency (**never** FX-converted, in either direction).
* Formula-injection escaping is applied **by column type** (text only). Do not
  "fix" this into a blanket rule — it would rewrite `-44` (44 BC) to `'-44`.
  `escapeCell`/`unescapeCell` are an inverse pair: change one, change both.
* **Import is additive.** The contract carries no coin id by design, so import
  cannot recognise a row it has seen: re-importing an export duplicates it. The
  preview's counted button ("Add 37 coins") discloses this; it cannot prevent it.
* The `collection` and `title` columns are **advisory** — import ignores both.
  `collections.name` has no unique constraint, so it cannot route.
* Import reuses `createCoinSchema` and `toCoinRow`, so it holds no second opinion
  on what a valid coin is, or on the price partition (`finalPrice` is recomputed
  from its components when any are present — ADR-009).
* Export is a **read** (no `assertWritable`; the demo tenant keeps it). Import
  **writes**, so it calls `assertWritable` and the demo tenant does not get it.
* `parseCsv` (`src/lib/csv.ts`) is a character state machine. **Never rewrite it
  as a line split** — a quoted field may contain a newline, and a split silently
  tears one coin into two malformed rows.

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
library or a component framework (Tailwind, shadcn, MUI) — extend `globals.css`.

**Theme tokens** are CSS custom properties with a **light + dark** pair (DDR-003;
the dark set overrides the same names under `[data-theme="dark"]`, plus a
`prefers-color-scheme` block): palette (`--bg`, `--surface`, `--text`, `--muted`,
`--border`, the golds `--gold`/`--accent`, `--primary`, `--on-gold`, `--ink`),
`--radius-*`, and the fonts `--font-display` (Fraunces), `--font-body` (DM Sans),
`--font-micro` (DM Mono). The active theme is a per-user preference
(`users.theme`) applied as `<html data-theme>`; "system" renders no attribute and
CSS follows the OS — no theme script, no flash.

**Gold** (`--gold #B8871E`) is for **fills only**; gold **text** uses the deeper
`--accent`, and text/icons on a gold fill use `--on-gold` — all for WCAG AA in
both schemes. Check gold text on an `--accent-weak` tint against **`--bg`**, not
just `--surface` — the tint composites darker off-card, which is what pushed
`--accent` below AA and deepened it to `#7f5612` (DDR-005 §7).

**Density**: the app renders at 75% via `zoom: 0.75` on `html`, so all token/px
values stay nominal (DDR-002). It is **desktop only** (DDR-006).
`chart-layout.ts` reads that same scale at runtime (`currentZoom`), **so the CSS
and it must change together.**

**Responsive layout** (DDR-006) uses a three-stop scale — **phone** `≤ 640px`,
**tablet** `≤ 1024px`, **desktop** (default), plus **wide** `≥ 1440px` for
enhancements. **These are the only widths any media query may use; do not add a
fourth.** Below `desktop` the zoom is 1, so media queries and layout boxes share
one coordinate space — above it the layout is 1.333× the media-query width. On a
phone the coin table is restyled into cards (same DOM, so `ColState` still drives
the columns) and the facet popovers expand in place rather than floating.

**Accessibility** (preserve when adding UI): tokens meet WCAG AA,
`:focus-visible` outlines cover links/buttons/inputs, a skip link targets
`#main-content`, animations honour `prefers-reduced-motion`, and `.sr-only`
labels icon-only controls. Wrap wide tables in `.table-wrap`. Verify with axe (no
violations) in both schemes.

**UI state persistence**: client preferences use `localStorage` under a
**versioned** key. The two coin tables keep **separate** keys
(`numisbook:coin-columns-v4`, `numisbook:all-coin-columns-v1`) — their column
sets differ, so sharing one would let each corrupt the other's layout (DDR-005).

Component conventions (managers, icons, `<ConfirmButton>`) are in
`src/components/README.md`.

## Internationalization

Custom, dependency-free i18n (ADR-014); no URL routing. Locale comes from a
cookie plus a per-user `users.locale` preference; 7 locales. **Add a new message
key to every locale** — `messages.test.ts` enforces parity and fails the build
otherwise. `@/lib/i18n` is client-safe; `@/lib/i18n/server` uses `next/headers`
and is server-only. Full rules: `src/lib/i18n/README.md`.

## Account settings

`/settings` (ADR-013): profile edits and self-service account deletion.
Profile/locale/theme mutations are **app-owned** (`user.service`), distinct from
the Auth.js-owned `users` identity columns. Deletion (`account.service`) cascades
in the DB and purges the user's object-storage bytes.

## Testing

Tests are colocated as `*.test.ts`. **Services are the primary target** — mock
repositories with `vi.mock()` and test logic in isolation.

Two things that will bite you, both CI gates:

* **Import `describe` / `it` / `expect` from `vitest` in every test file.**
  `globals: true` resolves them at runtime, but `tsconfig.json` does not pull in
  `vitest/globals` — omitting the import passes `npm test` and then fails
  `npm run typecheck`.
* There is **no DOM environment** (`environment: "node"`), so components are not
  rendered. Test component logic by extracting pure helpers.

Per-layer patterns (route tests, service mocking) are in the layer READMEs.

## Development Principles

* Simplicity over complexity.
* Prefer existing patterns over creating new ones.
* Do not introduce new dependencies without justification.
* Keep files under 300 lines when practical.
* Generate tests for all business logic.
* Keep `CLAUDE.md` lean. It carries rules, conventions, invariants, and
  *pointers* — not material an ADR, a layer `README.md`, or `docs/` already
  covers. Put the detail there and leave a one-line breadcrumb here; this file is
  always-on context.
* Prefer documenting significant decisions rather than rediscovering them.

## Development Workflow

NumisBook is artifact-driven: planning, implementation, and verification are
separate, and each workflow skill produces an artifact that feeds the next.

**For any non-trivial feature, produce the planning artifacts and get an approved
Implementation Plan before implementing.** Not every feature needs every role;
small bug fixes may skip planning when no product, design, architecture, or
database decision is affected.

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

**Before starting new work**: review the active milestone in `docs/roadmap.md`
and completed work in `docs/history.md`. **Do not implement backlog items unless
they have been promoted into the active milestone.** Record significant decisions
as ADRs or DDRs. Workflow artifacts are transient — only ADRs and DDRs are
long-term.

## Claude Skills

Project skills live in `.claude/skills/`, grouped into four category
directories: `workflow-skills/` (planning artifacts), `governance-skills/`
(document/review decisions), `execution-skills/` (implement an approved plan,
one per layer of the vertical slice), and `project-management/` (tracking
artifacts only — follow `.github/ISSUE_TEMPLATE/` and `docs/github-issues.md`;
do not invent new labels or issue structures).

**Each skill's `SKILL.md` defines its own responsibilities and the artifact it
owns — read that file.** The category nesting means these are *not* registered
as slash-invocable skills; open the `SKILL.md` directly.

## Documentation

`docs/README.md` indexes everything and gives the consult order. In short:
`docs/decisions/` (ADRs) → `docs/design-decisions/` (DDRs) → `product.md` →
`roadmap.md` → `architecture.md` → `database.md` → `history.md`.

**If documentation conflicts, or a task conflicts with an accepted decision:
identify the conflict, explain the tradeoffs, then ask or propose a new ADR.** Do
not silently choose one source over another, and do not silently override an
accepted decision — these take precedence over generated suggestions.

Decision filenames are self-describing, but **the supersessions are not** — five
records amend or supersede an earlier one. Both index READMEs list them:
`docs/decisions/README.md` and `docs/design-decisions/README.md`. Check them
before relying on DDR-001 or DDR-002 in particular.
