# ADR-011-Observability (structured logging, error reporting, health checks)

Status: Accepted

Date: 2026-06-22

## Context

NumisBook is in the **Production Readiness** milestone (`roadmap.md`). CI/CD has
shipped (ADR-010); the next slice is **Observability**: structured logging, error
monitoring, and production diagnostics.

Until now the app had no logging strategy — two ad-hoc `console.error` calls (one
in the API error boundary, one in the assistant) and nothing else. When the app
is deployed and used by real collectors, an operator needs to answer "is the app
healthy?" and "what failed for this user?" without SSH-ing into a box. A 500
response today carries no correlation handle, so a user report ("it broke") can't
be tied to a server-side log line.

The decision must fit the project's established ethos: dependency-light, swappable
behind small interfaces (mirroring `src/lib/storage`'s `ObjectStorage` and
`src/lib/fx`'s `FxRateProvider`), and respecting the downward layering rule
(`app → services → repositories → db`).

## Decision

Add three thin, dependency-free observability primitives.

### 1. Structured logging — `src/lib/logger`

A small `Logger` interface (`debug`/`info`/`warn`/`error`, each taking a message
and an optional structured `context` object) with one console-based
implementation. It emits **one line per call**: JSON in production (parseable by
the deploy platform) and a compact human-readable line in development. Level and
format default from `NODE_ENV` and are overridable with `LOG_LEVEL` and
`LOG_FORMAT`. A `logger` singleton mirrors the `db` / `objectStorage` singletons.
The two existing `console.error` calls are migrated to it.

### 2. Error reporting — `src/lib/observability`

An `ErrorReporter` seam (`captureException(error, context) → errorId`) with a
default implementation that routes through the logger and returns a generated
correlation id. The API error boundary (`errorResponse` in
`src/app/api/_lib.ts`) calls it for every unexpected (non-`AppError`,
non-`ZodError`) failure and returns the `errorId` in the 500 body, so a user can
quote it and an operator can grep for it. This is the **swap-in point for a hosted
monitor** (e.g. Sentry): replacing the implementation here leaves all call sites
untouched. Wiring an actual provider is deferred until the app is deployed and a
DSN/account exists — the seam is built now, the dependency is not.

### 3. Production diagnostics — `GET /api/health`

A public, unauthenticated endpoint for uptime checks and the deploy platform,
built as a normal vertical slice so the layering rule holds:
`health.repository.ping()` (a `SELECT 1` — DB access stays in the repository
layer) → `health.service.checkHealth()` (aggregates status + `process.uptime()`)
→ a thin route. Returns `200 { status: "ok", uptimeSeconds, db: "up" }` when
healthy and `503 { status: "degraded", … , db: "down" }` when the DB ping fails.
Marked `force-dynamic` so it runs per request.

## Alternatives Considered

### Logging: dependency-free (chosen) vs. a library (pino)

Pros of pino: battle-tested, fast, rich ecosystem (transports, redaction).

Cons: adds a runtime dependency plus `pino-pretty` for dev output, for a level of
throughput/feature richness the app does not need yet. The in-house logger is
~80 lines behind an interface, so adopting pino later is a one-file change. Chosen
the dependency-free path, consistent with the project's existing abstractions and
the dependency-free CSS design system.

### Error reporting: abstraction-only (chosen) vs. wire Sentry now

Pros of wiring Sentry now: real aggregation/alerting immediately.

Cons: requires an account/DSN and adds `@sentry/nextjs` plus build config before
the app is even deployed — real value only materializes post-deploy. Building the
seam now (no dependency, no dead config) captures the architectural intent while
deferring the integration to when it pays off.

### Health check: full vertical slice (chosen) vs. query the DB in the route

Querying `db` directly from the route would be faster to write but violates the
layering rule (only repositories touch `@/db`, enforced by ESLint). The slice is
trivial and keeps the rule intact.

## Consequences

### Benefits

* Every unhandled API failure now produces a structured, correlated log line and
  a user-facing `errorId` — server logs and user reports can be tied together.
* Production logs are machine-parseable JSON; dev logs stay readable.
* The deploy platform / uptime monitors have a real readiness signal that also
  reflects database connectivity.
* Adopting a hosted log service or error monitor (Sentry) is a change confined to
  `src/lib/logger` or `src/lib/observability`; call sites are stable.
* No new dependencies; nothing to provision for the checks to pass.

### Tradeoffs / Risks

* The logger and error reporter are intentionally minimal — no log sampling, no
  redaction, no request-scoped context propagation (e.g. AsyncLocalStorage for a
  per-request id across log lines). These are deliberate future enhancements, not
  shipped now.
* `errorId` is generated at the boundary, not threaded through the whole request,
  so two failures in one request would get distinct ids. Acceptable for the
  current need (correlating a single failure).
* The health check reports DB liveness only; other dependencies (object storage,
  OpenAI, the FX provider) are not probed. They are non-critical to liveness and
  can be added to the report later if needed.

## Related Documents

* docs/roadmap.md (Production Readiness milestone — Observability)
* docs/architecture.md (logging / observability)
* docs/decisions/ADR-010-ci-pipeline-github-actions.md (prior milestone slice)
* CLAUDE.md (Errors; cross-cutting helpers in `src/lib`)
