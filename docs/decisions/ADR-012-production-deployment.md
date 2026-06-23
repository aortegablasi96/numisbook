# ADR-012-Production Deployment (Vercel + Neon, CI-run migrations)

Status: Accepted

Date: 2026-06-23

## Context

NumisBook is functionally complete and in the **Production Readiness** milestone
(`roadmap.md`). The CI/CD (ADR-010), Observability (ADR-011), and Authentication
Resilience slices have shipped. The remaining slice is **Deployment**: get the
app running on a hosting platform, backed by a managed PostgreSQL database, with
production secrets configured and a workflow that applies schema migrations to
the production database.

The platform direction was already set by the roadmap ("Deploy to Vercel",
"Configure managed PostgreSQL"). What needed deciding — and recording — was the
managed-database provider, how migrations reach production, and how the runtime
configuration (secrets) is structured. Several constraints shape these choices:

- **Serverless runtime.** Vercel runs the Next.js app as serverless functions
  with an ephemeral, read-only filesystem. The local-filesystem storage fallback
  (`FsStorage`, `src/lib/storage`) therefore cannot persist coin image/bill bytes
  in production — object storage (Cloudflare R2, ADR-004/005) becomes **required**,
  not optional, in production.
- **Connection model.** Serverless functions open many short-lived database
  connections; a managed Postgres must front them with a pooler. Schema
  migrations (DDL, advisory locks) must instead run over a **direct, unpooled**
  connection.
- **Existing seams.** The app already reads all configuration from environment
  variables (`DATABASE_URL`, the `AUTH_*`/`R2_*`/`OPENAI_*` vars) and runs
  migrations with `drizzle-kit migrate` (`npm run db:migrate`). Deployment should
  reuse these, not introduce a parallel mechanism.

This ADR covers the **deployment architecture and the in-repo artifacts** that
make deploying turnkey (configuration, the migration workflow, the runbook). The
acts that require the owner's accounts and credentials — creating the Vercel
project, provisioning the Neon database, and entering real secret values — are
performed by the owner following `docs/deployment.md`; they are not, and cannot
be, committed to the repository.

## Decision

### 1. Hosting — Vercel

Deploy the Next.js App Router app to **Vercel** via its GitHub integration:
every push to `main` triggers a production deployment; pull requests get preview
deployments. Vercel auto-detects the Next.js framework, so the build needs no
custom configuration. A minimal `vercel.json` is committed to pin the framework
and the deployment region (which should co-locate with the database region for
latency). The build command stays the default `next build` — **migrations are
deliberately not run in the Vercel build** (see §3).

### 2. Managed database — Neon

Use **Neon** (serverless PostgreSQL) as the managed database. It fits the
serverless runtime (built-in connection pooling via a `-pooler` endpoint, plus a
separate direct endpoint for migrations), has a first-class Vercel integration,
and works with the existing `pg` + Drizzle setup unchanged — only the connection
string changes. Two connection strings are used:

- **Pooled** (`…-pooler.…`, `sslmode=require`) → the app runtime connection.
  Suits the many short-lived serverless connections.
- **Direct / unpooled** → migrations only. PgBouncer's transaction pooling
  breaks DDL and advisory locks, so `drizzle-kit migrate` must use the direct
  endpoint.

The app runtime reads the connection from **`PROD_DATABASE_URL`** in production
(falling back to `DATABASE_URL`), and from `DATABASE_URL` locally — so a
`PROD_DATABASE_URL` stashed in a developer's `.env` can never repoint local dev
at production (`src/db/index.ts`, gated on `NODE_ENV`). Migrations are
independent: `drizzle.config.ts` always reads `DATABASE_URL`, which the CI
`migrate` job supplies from `MIGRATION_DATABASE_URL`.

No driver change is required: `src/db/index.ts` keeps using `pg` `Pool`, and
SSL is requested through the connection string (`?sslmode=require`).

### 3. Production migrations — a gated CI/CD job

Apply migrations from **GitHub Actions**, extending the existing CI workflow
(`.github/workflows/ci.yml`) rather than adding a second system. A `migrate` job:

- runs **only** on `push` to `main` (`if: github.event_name == 'push' && github.ref == 'refs/heads/main'`),
- `needs: check`, so it runs **only after** lint + type-check + tests pass,
- runs in a `production` GitHub **Environment**, so the database secret is scoped
  to it and the owner can add required reviewers as a manual approval gate,
- executes `npm run db:migrate` (the same `drizzle-kit migrate` used locally)
  with `DATABASE_URL` set to the Neon **direct** connection
  (`secrets.MIGRATION_DATABASE_URL`).

This keeps migrations out of the request path and the Vercel build, makes them
auditable in the Actions log, and reuses the project's existing migration
command verbatim — "passes locally" and "applies in CI" stay identical.

**Concurrency / ordering.** Vercel's Git deploy and the Actions `migrate` job
are triggered by the same push and run in parallel — there is no built-in
ordering between "schema migrated" and "new code live". The project mitigates
this with the discipline it already follows: **additive (expand/contract)
migrations** (see migrations `0002`/`0003`, which add nullable columns/tables).
With additive changes, the brief window where new code may see the old schema
(or vice versa) is safe. Strict migrate-before-deploy ordering (disable Vercel
auto-deploy; trigger the deploy from Actions via a deploy hook after `migrate`)
is noted as a future tightening, not adopted now.

### 4. Production configuration — documented inventory, no committed secrets

A non-secret `.env.production.example` enumerates every variable a production
deployment needs, marking each **required** or **optional** and noting its
source. The full step-by-step setup (provision Neon → import to Vercel → set
env vars → first migration → verify `/api/health`) lives in `docs/deployment.md`.
Notable production-specific points captured there:

- **Object storage (R2) is required in production** — the filesystem fallback
  does not persist on Vercel's ephemeral filesystem.
- `AUTH_URL` is set to the canonical production URL and the Google OAuth client
  gets the production redirect URI (`…/api/auth/callback/google`).
- `AUTH_SECRET` is generated fresh for production (`npx auth secret`).

## Alternatives Considered

### Managed database: Neon (chosen) vs. Vercel Postgres vs. Supabase

- **Vercel Postgres** is Neon under the hood with auto-injected env vars; using
  Neon directly keeps the database portable off Vercel and gives direct control
  of the pooled/direct endpoints. Chosen.
- **Supabase** bundles auth/storage/realtime the project does not need (it has
  Auth.js and R2 already); its Postgres is fine but the extra surface is
  unjustified here.
- Any provider works because the app depends only on a `DATABASE_URL`; the
  decision is reversible.

### Migrations: CI/CD job (chosen) vs. Vercel build step vs. manual

- **Vercel build step** (migrate inside the build command) is simplest but
  couples migrations to every build/preview, runs them from Vercel's network on
  the pooled endpoint, and reruns on rollbacks — riskier for DDL. Rejected.
- **Manual only** (run `npm run db:migrate` against prod by hand) maximizes
  control but is error-prone and unaudited as the default path. Kept only as the
  documented **break-glass** procedure.
- The gated Actions job runs after the quality gates, is auditable, and reuses
  the existing GitHub Actions foundation (ADR-010). Chosen.

### Hosting: Vercel (chosen)

Pre-decided by the roadmap; Vercel is the first-party host for Next.js (zero-
config builds, preview deployments, the existing GitHub integration). Not
re-litigated here.

## Consequences

### Benefits

- A complete, reproducible path from "repo" to "running production app" — the
  owner follows `docs/deployment.md` with their own accounts; nothing about the
  process is tribal knowledge.
- Migrations are automated, gated behind green CI, scoped to a protected
  `production` Environment, and auditable — without leaving the GitHub Actions
  setup the project already uses.
- No code or dependency changes: same `pg`/Drizzle runtime, same
  `drizzle-kit migrate`, same env-var configuration. Provider lock-in is minimal
  (only connection strings differ).
- The serverless gotchas (R2 required, pooled-vs-direct connections) are caught
  and documented up front rather than discovered in production.

### Tradeoffs / Risks

- **Deploy/migrate are not strictly ordered** (§3). Safe under the project's
  additive-migration discipline; a destructive (drop/rename) migration would
  require the expand/contract two-deploy pattern or the deploy-hook tightening.
  Documented in the runbook.
- The `migrate` job needs the `MIGRATION_DATABASE_URL` secret set in the
  `production` Environment before it can run; until then the job is present but
  inert. This is the intended hand-off boundary to the owner.
- Activating the deployment still requires manual, account-bound steps (Vercel
  project, Neon project, real secrets, Google OAuth redirect URI). The repo
  makes them turnkey but cannot perform them.
- Region co-location (Vercel ↔ Neon) is the owner's choice at provision time;
  `vercel.json` pins a default (`iad1`) that the runbook says to align with the
  chosen Neon region.

## Related Documents

- docs/roadmap.md (Production Readiness milestone — Deployment)
- docs/deployment.md (the step-by-step runbook this ADR governs)
- docs/architecture.md (Deployment cross-cutting concern)
- docs/decisions/ADR-010-ci-pipeline-github-actions.md (the CI foundation extended here)
- docs/decisions/ADR-011-observability.md (`/api/health` readiness check used at verify time)
- docs/decisions/ADR-004-s3-storage-abstraction.md, ADR-005 (object storage — required in production)
- CLAUDE.md (Commands; environment variables; storage)
