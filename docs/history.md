# NumisBook — Project History

This document records completed milestones and major architectural achievements.

For planned work and prioritization, see `roadmap.md`.

---

# Phase 0 — Foundation

Status: Complete

## Achievements

- Established Next.js + Drizzle + PostgreSQL stack
- Defined project architecture and layering rules
- Created initial documentation:
  - architecture.md
  - database.md
  - product.md
- Created initial Claude Code workflow
- Created initial Claude Code skills

---

# Phase 1 — Project Setup

Status: Complete

## Achievements

- Next.js + TypeScript project scaffolded
- Drizzle ORM configured
- drizzle-kit configured
- ESLint configured
- Vitest configured
- Initial database schema created:
  - User
  - Collection
  - Coin
  - Valuation
- Environment template added
- First migration executed against Docker PostgreSQL

---

# Phase 2 — MVP Features

Status: Complete

## Authentication

- Auth.js v5
- Google OAuth
- Drizzle adapter
- Framework-agnostic auth service

## Collections

- Create collections
- List collections
- Rename collections
- Delete collections

## Coins

- Add coins
- Edit coins
- List coins
- Delete coins

## Valuations

- Record valuations
- Historical valuation tracking

## UI

- Collection pages
- Coin pages
- Navigation

---

# Phase 3 — Post-MVP Features

Status: Complete

## Portfolio Analytics

Implemented:

- Portfolio totals
- Allocation analysis
- Value-over-time trends

## Collection Assistant

Implemented:

- OpenAI integration
- Function calling
- Tool execution
- Tenant-safe user context injection

## Coin Images

Implemented:

- Image uploads
- Image storage abstraction

## UI Improvements

Implemented:

- Design system
- Application shell
- Dashboard

---

# Phase 4 — Usability & Scalability Improvements

Status: Complete

## Collection Management

Implemented:

- Search
- Filtering
- Sorting
- Pagination

## User Experience

Implemented:

- ConfirmButton component
- Inline editing
- Improved destructive actions

## Testing

Implemented:

- API route tests
- Auth coverage
- Validation coverage

## Assistant

Implemented:

- Floating assistant widget
- Multi-turn image persistence

## Coin Management

Implemented:

- Coin detail page
- Full editing workflow
- Multi-image support
- Image carousel

## Performance

Implemented:

- WebP thumbnail generation
- Object storage migration
- Cloudflare R2 integration
- S3-compatible storage abstraction

## Data Tables

Implemented:

- Reusable table layouts
- Column customization
- Drag-and-drop ordering
- LocalStorage persistence

---

# Phase 5 — Data Model Reform

Status: Complete

Reformed the coin and valuation data models to capture collectors' data
accurately before building richer analytics on them.

## Coin Attributes

Implemented:

- Reformed attribute schema (year as a range, grade `pgEnum`, weight, diameter,
  obverse/reverse descriptions, observations, catalogue references, auction
  acquisition fields)
- Removed the free-text `name`; coin title is now derived from attributes
  (`formatCoinTitle`); search/sort repointed off `name`
- Added `pedigree` (free-text provenance)
- Added price paid — hammer / premium / shipping partition with a computed
  `final_price` (or direct entry) and `price_currency` — distinct from valuations

## Valuation Attributes

Implemented:

- Added `source_url` link to the sale/hammer page

## Detail Page

Implemented:

- Reworked coin detail page: derived title, characteristics line, and the
  roadmap-defined element order

## Migrations

Implemented:

- Squashed migrations to a fresh baseline (pre-deployment DB reset)

---

# Major Architectural Decisions

See:

- `docs/decisions/001-nextjs-monolith.md`
- `docs/decisions/002-drizzle-over-prisma.md`
- `docs/decisions/003-authjs-google-oauth.md`
- `docs/decisions/004-s3-storage-abstraction.md`
- `docs/decisions/005-cloudflare-r2-initial-provider.md`
- `docs/decisions/006-coin-and-valuation-attribute-rework.md`

---

# Current Architecture Snapshot

Current stack:

## Frontend

- Next.js App Router
- React
- TypeScript
- Tailwind CSS

## Backend

- Next.js Route Handlers
- Service Layer
- Repository Layer

## Database

- PostgreSQL
- Drizzle ORM

## Authentication

- Auth.js
- Google OAuth

## AI

- OpenAI
- Function Calling
- Tool-based Assistant

## Storage

- Cloudflare R2
- S3-compatible abstraction

---

# Historical Notes

This document intentionally records completed work only.

Future plans, priorities, and backlog items belong in `roadmap.md`.