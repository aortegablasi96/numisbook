# ADR-010-CI Pipeline on GitHub Actions

Status: Accepted

Date: 2026-06-21

## Context

The platform is functionally complete and entering the **Production Readiness**
milestone (`roadmap.md`), whose first slice is **CI/CD**. Until now the quality
gates — ESLint, TypeScript type-checking, and the Vitest suite — have only ever
run on a developer's machine, by hand. Nothing prevents a change that fails lint,
breaks types, or regresses a test from being merged into `main`.

As NumisBook moves toward deployment and real collectors, `main` must stay
releasable. The cheapest, highest-leverage step is to run the *existing* checks
automatically on every change, giving each pull request an objective pass/fail
signal before it is merged.

This is the project's first continuous-integration decision and establishes the
direction for the rest of the Production Readiness milestone (the eventual CD /
deployment pipeline will extend the same GitHub Actions setup).

## Decision

Adopt **GitHub Actions** as NumisBook's CI provider and add a single workflow
(`.github/workflows/ci.yml`) that runs on every `pull_request` and on `push` to
`main`.

The workflow runs the three quality gates the project already relies on, each
invoked through its `package.json` script so local and CI behaviour stay
identical:

1. **Lint** — `npm run lint`
2. **Type-check** — `npm run typecheck` (a new script, `tsc --noEmit`; the
   project had no standalone type-check script)
3. **Unit tests** — `npm test` (`vitest run`)

The job runs on `ubuntu-latest`, on a **single Node 20** version (matching the
project's `Node ≥ 20` requirement), installing dependencies with `npm ci`
against the committed lockfile. A `.nvmrc` pins the same version for local
development so contributors match CI.

The pipeline requires **no database, secrets, or external services**: the Vitest
suite mocks all repositories and never imports `@/db`, so it passes with
`DATABASE_URL` unset (verified — 136 tests green with no environment).

Making the CI check a **required** status for merging is a GitHub branch-
protection setting (configured in the repository, not in code) and is a
recommended follow-up for the repository owner; this ADR covers the pipeline
definition itself.

## Consequences

### Benefits

* Every pull request and every `main` push gets an automated lint + type-check +
  test signal, so regressions are caught before merge rather than in review or
  production.
* The pipeline mirrors the local developer commands exactly (same npm scripts),
  so "passes locally" and "passes CI" mean the same thing.
* Zero infrastructure cost: no database, secrets, or services to provision; the
  workflow is self-contained and fast.
* Establishes the GitHub Actions foundation that later Production Readiness work
  (deployment, migrations) will extend.

### Tradeoffs

* Adds a small amount of tooling to maintain (one workflow file, one npm script,
  one `.nvmrc`).
* CI runs are gated on GitHub Actions availability/minutes; negligible for a
  project this size.

### Risks

* The lint step calls `next lint`, which is deprecated and removed in Next 16
  (already tracked in the roadmap backlog, "Migrate off deprecated `next lint`").
  Because CI invokes the `npm run lint` script rather than `next lint` directly,
  that future migration changes the script body, not the workflow — low risk.
* `npm ci` requires `package-lock.json` to stay in sync with `package.json`; the
  lockfile is committed, so drift would surface as a fast, obvious CI failure.

## Alternatives Considered

### Option A — GitHub Actions (chosen)

Pros:
* Native to the repository's host; no third-party account or integration.
* First-class marketplace actions (`actions/checkout`, `actions/setup-node` with
  npm caching).
* Same platform the milestone's later CD/deployment steps will use.

Cons:
* Ties CI to GitHub (acceptable — the repository already lives there).

### Option B — A different CI provider (CircleCI, GitLab CI, etc.)

Pros:
* Comparable feature set.

Cons:
* Introduces a second external system and account to manage for no benefit while
  the repository is hosted on GitHub.
* Rejected — no reason to leave the platform the code already lives on.

### Option C — Node version matrix (e.g. 20 + 22)

Pros:
* Catches version-specific breakage earlier.

Cons:
* NumisBook is a deployed application pinned to one runtime, not a library that
  must support many; a matrix roughly doubles CI time for little benefit.
* Rejected in favour of a single pinned Node 20 (revisit if/when the deployment
  target's Node version changes).

## Addendum — both deprecations discharged (2026-07-16)

Two of this ADR's Risks have been closed. The decision is unchanged; this records
what the gates now run on.

**`next lint` → the ESLint CLI.** The `lint` gate no longer calls `next lint`
(removed in Next 16). It runs `eslint .` against a flat config
(`eslint.config.mjs`), on ESLint 9 — `.eslintrc.json` and ESLint 8 are gone, the
latter having been end-of-life since October 2024. The Risk's prediction held
exactly: CI invokes the `npm run lint` script, so the migration changed the script
body and the config format, and **not** this workflow. `eslint-config-next` ships
only an eslintrc-style config, so `next/core-web-vitals` is consumed through
`FlatCompat` (`@eslint/eslintrc`) — the sole reason that dependency exists.

The load-bearing part of that gate is the `no-restricted-imports` guard on `@/db`
(the mechanism enforcing the repository boundary). A migration that left lint green
because the guard had silently stopped applying would be indistinguishable from a
successful one, so it was verified by probe rather than by a passing run: a service
importing `@/db` errors, `@next/next` and `jsx-a11y` rules still fire, and
`src/repositories` remains exempt.

**Actions off deprecated Node 20.** `actions/checkout` and `actions/setup-node` are
at `@v5` in both the `check` and `migrate` jobs; v4 targeted a Node the runners had
deprecated, forcing a fallback and annotating every run. Unrelated to `.nvmrc`,
which pins the *app's* runtime and still reads 20.

One incidental finding: `next/core-web-vitals` never enabled `jsx-a11y/no-autofocus`,
so a `eslint-disable` for it in `AssistantWidget` had always been dead. ESLint 9
reports unused directives by default, which surfaced it; the comment was removed
rather than left claiming to suppress a rule that never ran.

## Related Documents

* docs/roadmap.md (Production Readiness milestone — CI/CD)
* docs/architecture.md (quality gates: lint, type-check, tests)
* CLAUDE.md (Commands; `Node ≥ 20`)
