# Architecture Decision Records (ADRs)

Significant architectural decisions. Filenames are self-describing — read the
file for the decision and its rationale. Use `template.md` to start a new one.

| # | Decision |
| --- | --- |
| ADR-001 | Next.js monolith |
| ADR-002 | Drizzle over Prisma |
| ADR-003 | Auth.js + Google OAuth |
| ADR-004 | S3 storage abstraction |
| ADR-005 | Cloudflare R2 as initial provider |
| ADR-006 | Coin and valuation attribute rework |
| ADR-007 | Portfolio analytics upgrade |
| ADR-008 | UI embellishment |
| ADR-009 | UX and feature refinement |
| ADR-010 | CI pipeline (GitHub Actions) |
| ADR-011 | Observability |
| ADR-012 | Production deployment |
| ADR-013 | Account settings and deletion |
| ADR-014 | Internationalization |
| ADR-015 | Coin filter rework |
| ADR-016 | Public demo account |
| ADR-017 | Data portability contract |
| ADR-018 | Assistant hardening |

## Supersessions and amendments

What you **cannot** see from the filenames:

* **ADR-016** (public demo account) **departs from ADR-003** — Google is no
  longer the only way to obtain a session. The demo session is minted directly
  (a `sessions` row + the Auth.js cookie) because Auth.js cannot issue one
  without a provider.
* **ADR-017** has a **CSV import addendum** — the column contract serves both
  export and import.
* **ADR-018** (assistant hardening) **extends ADR-016 and ADR-013**. The demo's
  assistant stays read-only, but its message cap becomes one case of a general
  mechanism rather than a special case; and ADR-013's account deletion gains an
  explicit purge of `assistant_usage` rows, because that table has no foreign key
  for the database cascade to follow.

Design-side supersessions live in [`../design-decisions/README.md`](../design-decisions/README.md).

## Rules

- An accepted decision **takes precedence over generated suggestions.** Do not
  silently override one — propose a new ADR instead.
- Record a decision when it is approved; do not defer it and rediscover the
  reasoning later.
- Superseding an ADR does not mean deleting it. Add the supersession note to
  both records and to the list above.
