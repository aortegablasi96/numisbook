# ADR-016 — Public Demo Account

Status: Accepted

Date: 2026-07-14

## Context

NumisBook could not demonstrate itself. The only way in was Google OAuth, and
what waited on the other side was an empty state: a visitor evaluating the
product had to hand over an identity *and* type in their own coins before seeing
what the product does. The mobile milestone made the app readable on a phone; it
did not give a stranger anything to read.

The constraint that governs the design is the tenant-isolation invariant
(`CLAUDE.md`): data must never leak across users, and the acting `userId` always
comes from the session, never from client input. A demo must not become a hole in
that.

Three questions had to be answered: how a session is established without an OAuth
provider, how writes are prevented so one visitor cannot spoil the demo for the
next, and whether the assistant — which has write and delete tools — is exposed
at all.

## Decision

**A "Try the demo" entry point signs the visitor into a seeded, read-only demo
tenant without Google.**

### 1. The demo user is an ordinary tenant

The demo user is a row in `users` with a new `is_demo` flag. It is *not* a
special case in the data path: its id comes from the session, and every
repository query is scoped by it exactly as for a Google user. That is the whole
security argument — the demo introduces no new way to reach another tenant's
data, because it reaches its own data by the same code the rest of the app uses.

A **partial unique index** (`WHERE is_demo`) makes "the demo user" a singleton the
database enforces, rather than a convention the seed script has to remember.

### 2. The session is minted through the adapter, not a provider

Auth.js v5 here uses **database** sessions (ADR-003). A Credentials provider is
not available to us: it forces the JWT strategy, so adopting it would mean
re-architecting session handling for the entire application in order to serve the
demo.

But a database session is not magic — it is a row in `sessions` plus a cookie
carrying its token. So the demo mints exactly that: `demo.service.startDemoSession()`
inserts the row (via a new `session.repository`) and a Server Action sets the
Auth.js session cookie. `auth()` then resolves the demo visitor like any other
signed-in user, and every layer downstream is untouched.

Consequences of doing it this way:

* `src/auth.ts` now **declares the session cookie explicitly** (`SESSION_COOKIE_NAME`
  / `SESSION_COOKIE_OPTIONS`) instead of relying on Auth.js's internal default
  name. The demo sign-in must set the very cookie `auth()` will read, and that
  contract should be a shared constant, not a guess an upgrade could silently
  break. **This invalidates existing sessions on deploy** — everyone signs in once
  more.
* The demo user's id is looked up **by its flag**, never accepted from the caller.
  There is no argument an attacker can supply to obtain a session for a different
  tenant.
* Demo sessions are short-lived (4h) and expired ones are swept on each new
  sign-in, so the `sessions` table cannot grow without bound. `sessions(user_id)`
  gains an index — the demo tenant is the first user to accumulate many rows.

**This is a deliberate departure from ADR-003**, which assumed Google was the only
way to obtain a session. It remains the only way to obtain a session for *your own*
data; the demo grants a session for the demo tenant and nothing else.

### 3. Write policy: read-only, one shared tenant

One seeded tenant, shared by every visitor at once, and **read-only**. Rejected
alternative: a per-visitor sandbox cloned from the seed with a reaper job — a full
write experience, at the cost of cloning every image and invoice blob per visitor,
a cleanup cron, and an unbounded account-creation abuse surface. Not worth it to
answer a question ("does this product manage coins?") that browsing already
answers.

Enforcement is server-side, at the boundary:

* `ForbiddenError` (403) joins the typed error hierarchy — distinct from 401,
  because the demo visitor *is* signed in; they simply cannot write.
* `assertWritable(user)` (`src/lib/demo.ts`) throws it, and is called by every
  mutating API route and every mutating Server Action.
* The obvious failure mode is *forgetting a route*, so
  **`src/app/api/write-guard.test.ts` fails the build** if a route exports a
  `POST`/`PUT`/`PATCH`/`DELETE` handler without calling the guard. Exemptions are
  an explicit list, each with a reason.

Hiding UI controls (DDR-007) is cosmetic. This is the enforcement.

### 4. Preferences: cookie-backed ones survive, row-backed ones do not

Language and theme are **cookie-backed**, and the demo user's `locale` / `theme`
columns are deliberately left `NULL`, so resolution falls through to the visitor's
own cookie. The Settings actions therefore write the *cookie* and skip the *row*
for a demo session — each visitor gets a private theme and language, while the
shared row is never touched. (Writing the row would let one visitor flip the theme
for every other stranger browsing at the same time.)

The base currency has no cookie fallback — it is read straight off the user row —
so it cannot be offered per-visitor and is refused.

### 5. The assistant is exposed, read-only

The assistant is the feature most likely to win a signup, so hiding it would
undersell the product. A demo caller gets a filtered tool set: `selectToolset()`
returns only the read tools **and** a handler map without the write handlers, so a
hallucinated or prompt-injected call for `delete_collection` finds nothing to
execute. The system prompt tells the model it is read-only so it does not promise
edits it cannot make.

The demo is reachable without signing in, so it is the one surface where an
anonymous stranger spends our OpenAI budget: `/api/assistant` caps a demo
conversation's length. Full rate limiting remains the Assistant Hardening
milestone's job.

### 6. The seed

`npm run db:seed-demo` (`scripts/seed-demo.ts`) seeds through the **domain
services**, not raw SQL — so the demo data is created by the same code paths a
real user's data is, and image/invoice bytes go through the storage abstraction
(local FS in dev, R2 in production). It is re-runnable: it purges the existing
demo tenant via `account.service.deleteAccount`, which already cascades the DB
*and* purges object storage (ADR-013).

Content spans three collections, 13 coins, gold and silver, BC and AD years, seven
grades, three price currencies against an EUR base (so the FX conversion visibly
does work), obverse/reverse image pairs, invoice PDFs, and multi-point valuation
histories — the demo exists to exercise every surface.

Coin photographs are **real public-domain / CC0 museum images** (the Met, the
Smithsonian NNC, Yale, Harvard), committed under `scripts/demo-assets/` with
provenance in `LICENSES.md`. The demo's credibility rests on them; synthetic
placeholders would undercut the thing the milestone exists to build. Invoice PDFs
are generated by a small hand-written PDF writer (`scripts/demo-invoice-pdf.ts`)
rather than adding a PDF dependency the app itself never uses.

`tsx` is added as a **dev** dependency — the seed is TypeScript and imports the
services through the `@/*` alias.

## Consequences

Positive:

* A stranger can see a real, populated collection — coins, images, invoices,
  filters, portfolio analytics, the assistant — before giving up an identity.
* No new tenant-isolation surface: the demo user is an ordinary tenant, and the
  read-only rule is enforced at the boundary with a test that fails the build if a
  future route forgets it.
* Nothing to reset. No cleanup job, no per-visitor storage cost.

Negative / accepted:

* Declaring the session cookie explicitly **signs every existing user out once**
  on deploy.
* A demo visitor cannot *feel* what adding a coin is like. If visitors ask for it,
  the per-visitor sandbox is the follow-up — this decision does not preclude it.
* The demo tenant must be seeded in production before the entry point appears
  (the button renders only when a demo tenant exists, so an unseeded environment
  degrades to today's behaviour rather than to an error).
* A demo conversation still costs OpenAI tokens, bounded only per-conversation
  until Assistant Hardening lands.

## References

* ADR-003 (Auth.js + Google OAuth) — departed from here
* ADR-013 (account deletion / storage purge) — reused by the seed's purge
* DDR-007 (the demo UI: entry point, banner, suppressed affordances)
* `docs/testing/public-demo-account-testing-report.md`
