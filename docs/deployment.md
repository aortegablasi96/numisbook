# NumisBook — Deployment Runbook

How to deploy NumisBook to production: **Vercel** (hosting) + **Neon** (managed
PostgreSQL), with database migrations applied from **GitHub Actions**. The
architecture and the reasoning behind these choices are in
[`docs/decisions/ADR-012-production-deployment.md`](./decisions/ADR-012-production-deployment.md).

The repository ships everything that *can* be committed — `vercel.json`, the
`migrate` job in `.github/workflows/ci.yml`, and the
[`.env.production.example`](../.env.production.example) inventory. The steps
below are the account-bound actions only you can perform (provisioning, secrets,
the OAuth client).

---

## 0. Prerequisites

Accounts:

- **GitHub** — repository host (already in use; CI runs here).
- **Vercel** — hosting. Connect it to the GitHub repo.
- **Neon** — managed PostgreSQL.
- **Google Cloud** — OAuth client for sign-in.
- **Cloudflare R2** — object storage for coin images/invoices (**required in
  production** — see §6).
- **OpenAI** — API key for the collection assistant (optional; the assistant
  returns 503 without it, the rest of the app works).

Keep [`.env.production.example`](../.env.production.example) open — it lists
every variable referenced below and whether it is required.

---

## 1. Provision the database (Neon)

1. Create a Neon project; name the database `numisbook`. Pick a region close to
   where the app will run (see §3 — it should match the Vercel region).
2. From the Neon dashboard, collect **two** connection strings:
   - **Pooled** — the host contains `-pooler`. This is the app runtime
     `DATABASE_URL`. Ensure it ends with `?sslmode=require`.
   - **Direct / unpooled** — the host without `-pooler`. This is used **only**
     for migrations (DDL and advisory locks break on the pooled endpoint).
3. The schema is created by the migration step (§5) — do not hand-create tables.

> Why two strings: serverless functions open many short-lived connections and
> need the pooler; `drizzle-kit migrate` needs a direct connection. See ADR-012.

---

## 2. Create the Vercel project

1. In Vercel, **Import** the GitHub repository. Vercel auto-detects Next.js — no
   build settings to change. `vercel.json` pins `framework: nextjs` and the
   region.
2. Leave the build command at the default `next build`. **Migrations are not run
   during the build** — they run in CI (§5).
3. Production deploys happen on every push to `main`; pull requests get preview
   deployments automatically.

---

## 3. Region co-location

`vercel.json` sets `"regions": ["iad1"]` (US East). For lowest latency the
Vercel region and the Neon region should be the same continent/region. If you
provisioned Neon elsewhere, change `regions` in `vercel.json` to the matching
Vercel region (e.g. `fra1` for EU, `sfo1` for US West) and commit it.

---

## 4. Configure production secrets

### 4a. Vercel environment variables (app runtime)

In **Vercel → Project → Settings → Environment Variables**, add the following
to the **Production** environment (full notes in `.env.production.example`):

| Variable | Required | Value |
| --- | --- | --- |
| `PROD_DATABASE_URL` | yes | Neon **pooled** connection string (`?sslmode=require`). The app prefers this over `DATABASE_URL` in production. |
| `AUTH_SECRET` | yes | `npx auth secret` (generate a fresh one for prod) |
| `AUTH_GOOGLE_ID` | yes | Google OAuth client ID (§6) |
| `AUTH_GOOGLE_SECRET` | yes | Google OAuth client secret (§6) |
| `AUTH_URL` | yes | Canonical prod URL, no trailing slash |
| `R2_ENDPOINT` | yes | Cloudflare R2 S3 endpoint (§6) |
| `R2_BUCKET` | yes | R2 bucket name |
| `R2_ACCESS_KEY_ID` | yes | R2 access key |
| `R2_SECRET_ACCESS_KEY` | yes | R2 secret key |
| `OPENAI_API_KEY` | for assistant | OpenAI key (omit → assistant 503) |
| `R2_REGION`, `FX_API_URL`, `LOG_LEVEL`, `LOG_FORMAT` | optional | see inventory |

> `NODE_ENV=production` is set by Vercel automatically — do not add it.

### 4b. GitHub Actions secret (migrations)

Migrations run in GitHub Actions, not Vercel, so the migration connection lives
there:

1. In the GitHub repo, create an **Environment** named `production`
   (**Settings → Environments → New environment**). Optionally add **required
   reviewers** to gate migrations behind a manual approval.
2. In that environment, add a secret **`MIGRATION_DATABASE_URL`** = the Neon
   **direct (unpooled)** connection string (`?sslmode=require`).

The `migrate` job in `.github/workflows/ci.yml` reads this secret. Until it is
set, the job is present but cannot run.

---

## 5. Production migration workflow

Migrations are applied by the `migrate` job in `.github/workflows/ci.yml`:

- triggers on **push to `main`** only (never on PRs/previews);
- runs **after** `lint` + `typecheck` + `test` pass (`needs: check`);
- runs in the `production` GitHub Environment (scoped secret + optional
  approval);
- runs `npm run db:migrate` (`drizzle-kit migrate`) with `DATABASE_URL` set to
  `MIGRATION_DATABASE_URL` (the Neon direct endpoint).

**First deployment / baseline.** The committed `drizzle/` migrations build the
full schema from empty. On the first push to `main` after §4b is configured, the
`migrate` job creates all tables. Confirm it succeeded in the Actions log before
relying on the app.

**Adding a migration later.** Change `src/db/schema`, run `npm run db:generate`
locally to emit SQL into `drizzle/`, commit it, and merge to `main` — the
`migrate` job applies it. Never hand-edit generated migrations.

**Ordering caveat.** The Vercel deploy and the `migrate` job are triggered by
the same push and run in parallel — there is no built-in "migrate before deploy"
ordering. Keep migrations **additive (expand/contract)**: add nullable
columns/new tables, deploy code that tolerates both shapes, and only remove the
old shape in a later migration. (This is the pattern migrations `0002`/`0003`
already follow.) A destructive change in a single deploy can race the rollout.

**Break-glass (manual) migration.** If you must apply a migration by hand
(incident, or before automation is wired):

```bash
# Use the Neon DIRECT (unpooled) connection string.
DATABASE_URL="postgresql://…neon.tech/numisbook?sslmode=require" npm run db:migrate
```

On PowerShell:

```powershell
$env:DATABASE_URL = "postgresql://…neon.tech/numisbook?sslmode=require"; npm run db:migrate
```

---

## 6. External integrations

**Google OAuth (sign-in).** In Google Cloud Console → APIs & Services →
Credentials, on the production OAuth client add the **authorized redirect URI**:

```
https://YOUR-DOMAIN/api/auth/callback/google
```

Use the production client's ID/secret for `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`
(keep dev and prod clients separate).

**Cloudflare R2 (object storage).** Create a bucket and an S3 API token
(Cloudflare dashboard → R2 → Manage R2 API Tokens). Set the four `R2_*` vars in
Vercel. **This is required in production**: coin image/invoice bytes are written to
object storage, and the local-filesystem fallback does not persist on Vercel's
ephemeral, read-only filesystem — without R2, uploads will fail or vanish.

---

## 7. Deploy and verify

1. Push to `main` (or redeploy in Vercel). Watch:
   - the **CI `check`** job → green,
   - the **`migrate`** job → green (schema applied),
   - the **Vercel deployment** → ready.
2. **Health check** — the readiness endpoint is public (ADR-011):

   ```bash
   curl -s https://YOUR-DOMAIN/api/health
   ```

   Expect `200 {"status":"ok","db":"up",…}`. A `503 {"status":"degraded","db":"down"}`
   means the app cannot reach the database — re-check `PROD_DATABASE_URL`
   (pooled string, `sslmode=require`).
3. **Smoke test** — sign in with Google, create a collection, add a coin, upload
   an image (verifies R2), open `/portfolio` and `/assistant`.

---

## 8. Rollback

- **App code** — in Vercel, promote the previous deployment (instant rollback).
- **Database** — migrations are forward-only; there are no down migrations.
  Roll back by deploying app code compatible with the current schema (the
  additive-migration discipline keeps the previous code compatible) and, if a
  schema change must be undone, ship a new corrective migration. Take a Neon
  branch/backup before risky migrations.

---

## Related documents

- [`docs/decisions/ADR-012-production-deployment.md`](./decisions/ADR-012-production-deployment.md) — the decision record
- [`docs/decisions/ADR-010-ci-pipeline-github-actions.md`](./decisions/ADR-010-ci-pipeline-github-actions.md) — the CI foundation this extends
- [`docs/decisions/ADR-011-observability.md`](./decisions/ADR-011-observability.md) — `/api/health` used in §7
- [`.env.production.example`](../.env.production.example) — the variable inventory
- [`docs/roadmap.md`](./roadmap.md) — Production Readiness milestone
