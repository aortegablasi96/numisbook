# Testing Report — Public Demo Account

Date: 2026-07-14
Scope: ADR-016 (public demo account), DDR-007 (demo mode UI)
Milestone: Public Demo Account (Epic #165, stories #166–#171)

## Automated gates

| Gate | Result |
| --- | --- |
| `npm run lint` | pass — no ESLint warnings or errors |
| `npm run typecheck` | pass |
| `npm test` | pass — **297 tests**, 33 files (was 263) |

New tests:

* `src/app/api/write-guard.test.ts` — the load-bearing one. Statically scans every
  `src/app/api/**/route.ts`, finds each exported `POST`/`PUT`/`PATCH`/`DELETE`, and
  fails if the file does not call `assertWritable(user)`. Exemptions are an explicit
  list with reasons. **Verified it actually fails**: deleting the guard from
  `collections/route.ts` produced `collections/route.ts exports POST but calls
  assertWritable(user) 0 time(s)`, then it was restored.
* `src/lib/demo.test.ts` — the guard raises 403 (not 401: a demo visitor *is* signed
  in) and lets ordinary users through.
* `src/services/demo.service.test.ts` — the session is minted for the tenant found by
  its `is_demo` flag (never from a caller-supplied id), the token is unguessable and
  fresh each time, expired sessions are swept, and no demo tenant raises `NotFoundError`.
* `src/services/assistant.readonly.test.ts` — a read-only caller is offered only the
  four read tools, and the write **handlers are not built at all**, so a hallucinated
  `delete_collection` has nothing to execute.

## Manual verification (browser, dev server + seeded demo tenant)

### The demo flow

* Signed-out home shows "Try the demo" beneath the Google button. Clicking it mints
  a session with no OAuth round trip and lands on a populated dashboard: **3
  collections, 13 coins, €288,726.48 total paid**.
* That total is the multi-currency path doing real work: the coins are priced in
  USD, GBP and EUR, and the figure is converted to the demo tenant's EUR base.
* Coin list renders obverse/reverse thumbnails, facet filters, and search (`q=Turban`
  → 2 coins). The actions column is absent.
* Coin detail: image carousel ("picture 1 of 2"), price-paid partition, the invoice
  with a Download button, and a four-point valuation history. No edit pencil, no
  upload controls, no record-valuation form.
* Portfolio: the trend chart is a curve, not a flat line, and the cost breakdown
  renders per-coin bars with thumbnails.
* The generated invoice PDF **opens and renders correctly in Chrome's PDF viewer** —
  the hand-computed xref offsets are valid.

### Read-only enforcement (the security claim)

Issued from inside a live demo session, so the session cookie was sent:

| Request | Result |
| --- | --- |
| `POST /api/collections` | **403** "This is a read-only demo account. Sign in to make changes." |
| `PATCH /api/user` (rename profile) | **403** |
| `DELETE /api/user` (**delete the demo tenant**) | **403** |
| `GET /api/collections` | 200, 3 collections |

The deletion case is the one that mattered: without the guard, any visitor could
have destroyed the demo for everyone.

### The shared-tenant hazard

Switching the theme to Dark as a demo visitor: the UI turned dark, and the demo
row in Postgres was re-checked directly —

```
demo@numisbook.app | is_demo=true | theme=NULL | locale=NULL
```

The preference went to the **cookie only**, never the shared row. So one visitor
cannot flip the theme (or language) for every other stranger browsing at the same
time, and each still gets a private preference. Base currency, which has no cookie
fallback, is refused and not rendered.

### Accessibility

axe-core (`wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`) across `/`, `/coins`,
`/collections`, `/portfolio`, `/settings` in **light and dark**:

**0 violations in all 10 combinations**, including the new demo banner.

### Responsive

At the 390px phone breakpoint (DDR-006), the banner stacks to two compact lines
above the header without eating the fold; coin cards, collapsed filters and the
sort control all render correctly.

## Defects found and fixed during verification

1. **Base-currency select still rendered on `/portfolio` for demo sessions.** The
   Server Action refused the write (so it was never a security hole), but the
   control was offered and would have failed on click. Now hidden, matching
   `/settings`. Found by driving the page, not by any automated gate — the same
   blind spot the "Accessibility checks in CI" milestone exists to close.

## Seed

`npm run db:seed-demo` is idempotent — run twice; the second run purged and
recreated the tenant, ending at **3 collections, 13 coins, 17 images, 4 invoices,
31 valuations**. Photographs are public-domain / CC0 museum images with provenance
recorded in `scripts/demo-assets/LICENSES.md`.

## Remaining issues / notes

* **Deploy note:** `src/auth.ts` now names the session cookie explicitly, which
  **invalidates existing sessions** — every current user signs in once more after
  this ships. Expected, and recorded in ADR-016.
* **Production requires seeding.** The demo entry point renders only when a demo
  tenant exists, so until `db:seed-demo` is run against production the home page is
  unchanged (a safe default, not an error).
* A demo conversation with the assistant is capped per-conversation, not globally.
  Full rate limiting stays with the Assistant Hardening milestone.
