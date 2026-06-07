# NumisBook — Roadmap

> Guiding principle (from `CLAUDE.md`): **Build the MVP before introducing
> advanced automation or optimization.**

Phases 0–4 are **complete**. Each feature was built as a vertical slice —
`schema → repository → service (+ tests) → API route → UI` — and tenant
isolation was verified against real Postgres. The entries below are condensed;
the detailed implementation history lives in git. Current work is the
[backlog](#todo--backlog).

## Phase 0 — Foundation *(complete)*

- [x] Stack (Next.js + Drizzle + PostgreSQL), folder/layering rules,
      architecture/database/product docs, initial Claude Code skills; scaffold
      review checkpoint passed.

## Phase 1 — Project setup *(complete)*

- [x] Next.js + TypeScript project; Drizzle + drizzle-kit; ESLint + Vitest;
      initial schema (`User`/`Collection`/`Coin`/`Valuation`); `.env.example`;
      first migration applied against Docker Postgres (`numisbook-pg`).

## Phase 2 — MVP features *(complete)*

- [x] **Auth / Users** — Auth.js v5 + Google OAuth, DB sessions via the Drizzle
      adapter; `auth.service` resolves session → domain user (framework-agnostic).
- [x] **Collections** — create / list / rename / delete, ownership-scoped.
- [x] **Coins / Inventory** — add / edit / list / delete; writes scoped to the
      owner via the collection (coins have no `user_id`).
- [x] **Valuations** — record a valuation and view per-coin value history.
- [x] Basic UI linking `/collections`, `/collections/[id]`, `/coins/[id]`.

## Phase 3 — Post-MVP *(complete)*

- [x] **Portfolio analytics** — read-model over valuations: totals per currency,
      allocation by metal/collection, value-over-time trend (computed for the
      primary/largest currency). `/portfolio`.
- [x] **Collection assistant** — OpenAI gpt-4o-mini with function calling over
      the domain services via a manual agentic loop; the acting user's id is
      injected server-side into every tool handler (tenant isolation). Needs
      `OPENAI_API_KEY`.
- [x] **Coin images** — stored in Postgres (`coin_images`, bytea); storage
      abstracted behind `coinImage.repository` so the bytes can move to S3/R2
      later.
- [x] **UI/UX polish** — dependency-free design system in `globals.css`;
      `SiteHeader` app shell; dashboard home.

## Phase 4 — Improvements 1 *(complete)*

- [x] **Coin search / filter / sort + pagination** — server-side through the
      full slice (`searchInCollection` → `searchCoins` → query params →
      `CoinsManager`); plus a client-side name filter on the collections list.
- [x] **Inline UI for destructive actions** — reusable `ConfirmButton` (styled
      `<dialog>`) replaces `window.prompt`/`confirm`; inline collection rename.
- [x] **API route tests** — `/api/collections` (+ `/[id]`): auth guards, real
      Zod validation → 400, success codes, typed-error → status mapping.
- [x] **Assistant as a floating widget** — `AssistantWidget` overlaid on every
      page, auth-gated by `FloatingAssistant` in the root layout.
- [x] **Coin detail page + inline editing** — all attributes (year rendered
      BC/AD), clickable photo lightbox; Edit toggles a form that PATCHes
      `/api/coins/[id]` in place.
- [x] **Assistant image persistence fix** — an attached photo was lost if the
      model asked for more details before calling `add_coin`. The image is now
      held in client state and re-sent each turn until saved, so it survives
      multi-turn add flows.
- [x] **Multi-image per coin** — `coin_images` migrated to UUID PK + FK;
      carousel UI; on-the-fly WebP thumbnails via `sharp`
      (`GET …/images/[imageId]?w=<px>`, immutable cache).
- [x] **Table layouts + customisable columns** — collections and coin lists use
      `data-table`; the coin list has a column picker with drag-and-drop reorder,
      persisted as an ordered `ColState[]` in `localStorage`
      (`numisbook:coin-columns-v2`).
- [x] **Coin images → object storage** — image bytes moved out of Postgres into
      an S3-compatible store (`src/lib/storage`, targets Cloudflare R2; local-FS
      fallback for dev). `coin_images` now holds only metadata + a `storage_key`,
      keeping the DB small and backups fast. Backend is swappable in one file.

## TODO — backlog

Candidate improvements, not yet scheduled. Each notes the problem and the
proposed fix; promote items into a phase when picked up.

- **Graceful auth error page during DB outage**
  - _Problem:_ if Postgres is unavailable when a Google OAuth callback lands,
    Auth.js maps the DB error to `error=Configuration` and the `/api/auth/error`
    page itself returns 500 (it also tries to hit the DB). Users see a raw error
    instead of a friendly message.
  - _Fix:_ add a custom `src/app/api/auth/error/page.tsx` that renders a
    static "sign-in is temporarily unavailable" page without calling `auth()` or
    touching the DB.
- **Deploy to production**
  - _Problem:_ the app only runs locally against Docker Postgres; it isn't
    reachable by real users.
  - _Fix:_ host on Vercel with a managed Postgres (Neon/Supabase), set
    production Google OAuth redirect URIs and secrets, and run migrations on
    deploy.
- **CI pipeline**
  - _Problem:_ there are no automated checks, so regressions can land unnoticed.
  - _Fix:_ GitHub Actions running `npm run lint`, `tsc --noEmit`, and `vitest`
    on every pull request and push to `main`.
- **Harden the assistant**
  - _Problem:_ the chat assistant doesn't stream (replies appear all at once)
    and has no rate limit or cost cap on the OpenAI calls — open to abuse and
    runaway cost.
  - _Fix:_ stream responses, add a per-user rate limit and a per-turn/per-
    conversation cost cap, and bound conversation length.
- **Observability**
  - _Problem:_ no structured logging or error monitoring (`architecture.md`
    still lists logging as TODO); production issues would be invisible.
  - _Fix:_ add structured request/error logging and an error monitor (e.g.
    Sentry).
- **Multi-currency portfolio (+ account / base-currency preference)**
  - _Problem:_ portfolio totals are per-currency and allocation/trend only cover
    the primary currency, so a mixed-currency collection has no single total.
  - _Fix:_ add FX conversion to a user-selected base currency, stored on an
    account/profile page.
- **Collection CSV export / import**
  - _Problem:_ no way to bulk export or import collection data — a common
    collector need and a hedge against lock-in.
  - _Fix:_ CSV export of a collection's coins (and valuations), plus an import
    flow with validation.
- **Fill in `product.md`**
  - _Problem:_ `product.md` is still a stub (target users, pricing tiers, open
    questions unanswered).
  - _Fix:_ flesh out the product requirements as decisions are made.
- **Migrate off deprecated `next lint`**
  - _Problem:_ `next lint` is deprecated and removed in Next.js 16, so the lint
    step will eventually break.
  - _Fix:_ migrate to the ESLint CLI (the `next-lint-to-eslint-cli` codemod).

## Out of Scope (for now)

- Marketplace / user-to-user trading.
- Mobile apps.
- Auction monitoring.
- AI-assisted research / coin identification.

See also: [`product.md`](./product.md), [`architecture.md`](./architecture.md).
