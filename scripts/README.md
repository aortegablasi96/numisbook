# `scripts` — Operational tooling

One-off and maintenance scripts, run via `tsx`. Not part of the app bundle.

## Demo tenant (ADR-016, DDR-007)

The public demo lets a visitor enter a seeded, **read-only** tenant without
Google sign-in. These scripts build and load it:

| Script | Command | What it does |
| --- | --- | --- |
| `seed-demo.ts` | `npm run db:seed-demo` | Seeds the demo tenant from the committed fixtures |
| `export-demo-fixtures.ts` | `npm run db:export-demo` | Regenerates fixtures + assets from the source demo account |
| `demo-fixtures.ts` | — | The committed fixture data |
| `demo-enrichment.ts` | — | Derives display detail for fixture coins |
| `demo-invoice-pdf.ts` | — | Generates the placeholder invoice PDFs |
| `demo-assets/` | — | Committed image and PDF bytes |

The demo user is an ordinary tenant (`users.is_demo`) — its id comes from the
session and every query is scoped by it — so **tenant isolation is unchanged**.

Its read-only status is enforced in the app, not here: every mutating API route
and Server Action calls `assertWritable(user)` (`src/lib/demo.ts`), and
`src/app/api/write-guard.test.ts` fails the build if a mutating route omits it.

## Rules

- Scripts may import services and repositories, but the layering still applies —
  do not reach past a repository into `src/db` for convenience.
- `db:export-demo` reads from a real account and **overwrites** the committed
  fixtures. Review the resulting diff before committing it.
