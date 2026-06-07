# NumisBook — Roadmap

> Guiding principle (from `CLAUDE.md`): **Build the MVP before introducing
> advanced automation or optimization.**

## Phase 0 — Foundation

- [x] Define stack (Next.js + Drizzle + PostgreSQL).
- [x] Define folder structure and layering rules.
- [x] Write architecture, database, and product docs.
- [x] Add initial Claude Code skills.
- [x] **Review checkpoint** — scaffold approved; cleared to write app code.

## Phase 1 — Project setup

- [x] Initialize Next.js + TypeScript project (`package.json`, configs).
- [x] Add Drizzle, drizzle-kit, `drizzle.config.ts`, `src/db/index.ts`.
- [x] Add tooling: linting (ESLint) and test runner (Vitest).
- [x] Define schema: `User`, `Collection`, `Coin`, `Valuation`.
- [x] `.env.example` + env handling.
- [x] **Run locally**: `npm install` (385 pkgs), Postgres via Docker
      (`numisbook-pg`, `postgres:16` on `localhost:5432`), `npm run db:generate`
      (→ `drizzle/0000_clammy_lily_hollister.sql`) + `npm run db:migrate` applied.

## Phase 2 — MVP features *(complete)*

- [x] **Auth / Users** — Auth.js v5 + Google OAuth, DB sessions via the Drizzle
      adapter (`users`/`accounts`/`sessions`/`verification_tokens`). Sign in/out
      UI; `auth.service` resolves session → domain user (unit-tested).
- [x] **Collections** — create, list, rename, delete. Vertical slice:
      `collection.repository` → `collection.service` (+ tests, ownership-scoped)
      → `/api/collections` (+ `/[id]`) → `/collections` UI.
- [x] **Coins / Inventory** — add coin to collection, edit, list, delete.
      Vertical slice: `coin.repository` (writes scoped to the owner via the
      collection) → `coin.service` (+ tests) → `/api/collections/[id]/coins`
      and `/api/coins/[id]` → `/collections/[id]` UI. Tenant isolation verified
      against real Postgres with two users.
- [x] **Valuations** — record a valuation, view value history per coin.
      Vertical slice: `valuation.repository` → `valuation.service` (+ tests,
      ownership via the coin) → `/api/coins/[id]/valuations` → `/coins/[id]` UI
      (history + record form, latest-value summary). Tenant isolation verified
      against real Postgres.
- [x] Basic UI for the above — `/collections`, `/collections/[id]` (coins),
      `/coins/[id]` (valuations), linked together and from the home page.

Each feature follows the same vertical slice:
`schema → repository → service (+ tests) → API route → UI`.

## Phase 3 — Post-MVP *(complete)*

- [x] Portfolio analytics (aggregate value, trends, allocation). Read-model
      slice: `analytics.repository` (user-scoped joins) → `analytics.service`
      (+ tests; latest-valuation-per-coin, totals per currency, allocation by
      metal/collection, value-over-time trend) → `/api/portfolio` → `/portfolio`
      UI. Totals are per-currency; allocation/trend use the primary (largest)
      currency. Verified against real Postgres incl. tenant isolation.
- [x] Collection assistant (chatbot). OpenAI gpt-4o-mini with function calling
      over the domain services via a manual agentic loop: `assistant.service`
      (+ tests) → `/api/assistant` → `/assistant` chat UI. Full management
      (read + write + delete); the acting user's id is injected into every tool
      handler so the model can only touch the signed-in user's data. Needs
      `OPENAI_API_KEY`.
- [x] Coin images. One image per coin stored in Postgres (`coin_images`, bytea)
      behind `coinImage.repository` → `coinImage.service` (+ tests; type/size
      validation, owner-scoped) → `GET/POST/DELETE /api/coins/[id]/image` →
      upload/display/remove on the coin page + list thumbnails. bytea round-trip
      and tenant isolation verified against real Postgres. Storage is abstracted
      behind the repository so it can move to S3/R2 later.
- [x] UI/UX polish. Dependency-free design system in `globals.css` (theme tokens
      with light/dark, typography, themed buttons/inputs/tables, component
      classes: cards, rows, badges, alerts, analytics bars, chat bubbles). App
      shell via `SiteHeader` (brand + global nav + sign in/out) in the root
      layout, replacing the scattered per-page nav links. Home is now a dashboard
      of feature cards; collections/coins/valuations use cards + bordered rows;
      portfolio uses themed bars; the assistant uses chat bubbles; coin photos
      are framed and thumbnails are styled. No new dependencies.
## Phase 4 — Improvements 1

- [x] Search & filtering — search coins by name and filter by metal/category/year
      with pagination (server-side: `coin.repository.searchInCollection` →
      `coin.service.searchCoins` (+ tests) → `/api/collections/[id]/coins` query
      params → query-driven `CoinsManager` UI); plus a client-side name filter on
      the collections list. Search SQL verified against real Postgres.
- [x] Replace `window.prompt`/`confirm` with inline UI — reusable `ConfirmButton`
      (styled `<dialog>`) for deletes (collections, coins, coin images) and
      inline rename editing for collections.
- [x] API route / integration tests — handler tests for `/api/collections` and
      `/api/collections/[id]` covering auth guards (401), real validation → 400,
      success status codes (200/201/204), and typed-error → status mapping (404).
- [x] Assistant as floating widget — collection chatbot moved from a dedicated
      `/assistant` page + nav link to a fixed bottom-right floating button
      (`AssistantWidget`). Toggling opens a compact chat panel overlaid on any
      page. Auth-gated server wrapper (`FloatingAssistant`) in the root layout
      keeps the widget invisible to signed-out users. Old `AssistantChat`
      component and `/assistant` route removed.
- [x] Coin detail page — display all coin attributes (metal, denomination, year
      with BC/AD, mint, grade, category, issuing authority, added date) in a
      details card; null fields are omitted. Coin photo is clickable and opens
      in a fullscreen `<dialog>` lightbox; clicking the backdrop closes it.
- [x] Assistant image persistence fix — attached photo was lost if the model
      asked for more details before calling `add_coin`. Image is now held in
      client state and re-sent silently on every subsequent turn until the
      assistant confirms "Saved coin photo" in its actions.
- [x] UI layout polish — full-width layout (removed max-width cap; container
      uses responsive horizontal padding only); nav bar horizontal padding
      restored (specificity fix on `.site-header .bar`); coin detail page
      redesigned as two matched-height cards (`2fr 1fr` grid): left card holds
      coin name + attributes + valuations in a single border, right card holds
      the photo filling the full card height via `flex: 1`; photo expand button
      is a fixed-size `2rem × 2rem` overlay in the bottom-right corner; file
      input replaced with a styled dashed "Add photo / Replace photo" button
      with accent-gold hover.
- [x] Table layout for collections and coin lists — collections page and
      collection detail page both replaced from card-lists to styled
      `data-table` components. Collections table shows name + rename/delete
      actions. Coins table shows thumbnail, name, metal, denomination, and
      edit/delete actions. Add forms for both are hidden behind a toggleable
      "+ New collection" / "+ Add coin" button; clicking it reveals the form
      inline without a page navigation.
- [x] Inline coin editing — Edit button on the coin detail page toggles the
      left card into a 2-column form (name, metal, year, denomination, mint,
      grade, category, issuing authority). Save PATCHes `/api/coins/[id]` and
      updates the view in place; Cancel discards. No new API routes needed.
- [x] Thumbnail generation — `GET /api/coins/[id]/images/[imageId]?w=<px>`
      resizes on the fly with `sharp` and returns WebP at the requested width
      (capped at 2000px). Response carries `Cache-Control: immutable` so the
      browser never re-fetches the same thumbnail. `CoinThumb` now requests
      `?w=320` (2× the 160 CSS px for Retina sharpness) instead of the full
      image. The coin detail card continues to fetch the original full-resolution
      image with no `?w=` param.
- [x] Multi-image per coin — `coin_images` schema migrated: `id` UUID PK,
      `created_at`; old `coin_id`-as-PK row replaced with a proper FK so
      multiple images can be stored per coin. Repository rewritten with
      `insert`/`listByCoinId`/`getById`/`getFirstByCoinId`/`deleteById`;
      service exposes `addCoinImage`, `listCoinImages`, `getCoinImage`,
      `getFirstCoinImage`, `removeCoinImage`, plus a backward-compat
      `setCoinImage` wrapper for the assistant. Two new API routes:
      `GET/POST /api/coins/[id]/images` (list + upload) and
      `GET/DELETE /api/coins/[id]/images/[imageId]` (serve + remove).
      Old `GET /api/coins/[id]/image` kept as a thumbnail alias. `CoinImage`
      component rewritten as a carousel: prev/next arrows only visible when
      >1 photo, `1 / N` counter, upload and per-image remove controls.

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
- **Coin images → object storage**
  - _Problem:_ images are stored as Postgres `bytea`; large collections will
    bloat the DB and increase backup times. Thumbnails are now generated on the
    fly (see Phase 4), but the source bytes still live in Postgres.
  - _Fix:_ move bytes to S3/R2 — `coinImage.repository` is already the only
    layer that touches storage, so swapping the backend only requires changing
    that file and adding the SDK + env vars.
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
