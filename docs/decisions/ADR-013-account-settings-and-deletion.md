# ADR-013-Account Settings & Self-Service Account Deletion

Status: Accepted

Date: 2026-07-03

## Context

NumisBook is live in production and the active milestone is **Additional
Settings** (`roadmap.md`) — "give users control over their account and
preferences through a dedicated settings area". This ADR covers the **first
pass** of that milestone (the "Settings foundation" slice): a `/settings` area
where a signed-in collector can edit their **display name**, choose a preferred
**base currency**, and **delete their account**. The two heavier features of the
milestone — internationalization and a dark theme — are intentionally deferred
to later passes (dark mode is additionally blocked on a DDR superseding
DDR-001), so they are out of scope here.

Two facts about the existing code shape this decision:

- **The relevant user fields already exist.** `users.name` is populated by the
  Auth.js Drizzle adapter during OAuth login, and `users.baseCurrency` was added
  in the Portfolio Analytics Upgrade (ADR-007) with a working end-to-end control
  already living on the `/portfolio` page (`setBaseCurrency` →
  `userRepository.updateBaseCurrency`, validated by `baseCurrencySchema`). So
  this slice needs **no schema migration** — it is schema-stable.
- **Auth.js owns user *writes* during the OAuth flow.** Until now the app only
  *read* the `users` row (`user.repository` exposes reads plus the one
  `updateBaseCurrency` write). Adding profile edits and account deletion means
  the application now co-owns mutations to the `users` aggregate.

The non-trivial decision is **account deletion**. Postgres foreign keys already
cascade a user's entire graph (`collections → users`, `coins → collections`,
`coin_images`/`coin_invoices`/`valuations → coins`, and the Auth.js
`accounts`/`sessions → users` — all `onDelete: "cascade"`). But coin **image and
invoice bytes live in object storage** (`src/lib/storage`, ADR-004/005), which a
database cascade cannot reach. A naive `DELETE FROM users` would therefore leave
orphaned blobs in R2 (or the local FS fallback) forever.

## Decision

Add a **Settings vertical slice** following the standard layering
(`lib/validation → repository → service → api → app`), and record the
account-deletion data-lifecycle explicitly.

1. **Profile & preferences** are app-owned mutations on the `users` aggregate:
   - `displayNameSchema` (trim, 1–80 chars) added next to `baseCurrencySchema`.
   - `userRepository.updateName(id, name)`; `user.service.updateDisplayName`.
   - Base currency reuses the existing service/repository/schema unchanged; the
     `/settings` page becomes its canonical home (the `/portfolio` control may
     remain as a convenience — both call the one service, no duplicated logic).
   - Exposed through a thin `PATCH /api/user` route.

2. **Account deletion** is a dedicated service (`account.service.deleteAccount`)
   that owns the data lifecycle the database cannot:
   - **Enumerate** the user's object-storage keys first (new repository reads
     `coinImageRepository.listStorageKeysForUser` / the invoice equivalent,
     tenant-scoped via the user's `collectionId` subquery — the same pattern
     coins already use).
   - **Delete the `users` row** (`userRepository.deleteById`); Postgres cascades
     remove every owned DB row, including Auth.js `sessions`/`accounts`.
   - **Best-effort purge** the collected storage objects, mirroring
     `coinImageRepository.deleteById`'s "DB row then object" ordering; failures
     are logged via `logger`, not surfaced as request errors.
   - Exposed through `DELETE /api/user` → `204`. The client then calls
     `signOut({ redirectTo: "/" })`; because sessions are already cascade-deleted
     server-side, this only clears the now-stale cookie.
   - The UI gates deletion behind `<ConfirmButton>` (irreversible action).

`userId` always comes from the authenticated session (`currentUser()`), never
client input — the tenant-isolation invariant is unchanged.

## Alternatives Considered

### Option A — Storage purge in the service, around the DB cascade (chosen)

Pros:
* No schema change; relies on the FK cascade that already exists.
* Keeps object cleanup in the one layer allowed to compose DB rows with storage,
  consistent with the existing per-row delete pattern.
* Simple, synchronous, and testable by mocking repositories.

Cons:
* Enumerate-then-cascade means storage keys must be read before the rows vanish.
* Best-effort purge can still orphan a blob if R2 is momentarily unavailable
  (logged; acceptable, and re-purgeable later by key prefix).

### Option B — Soft delete (flag the row, retain data)

Pros:
* Reversible; supports "undo" and grace periods.

Cons:
* Every tenant-scoped query would need a `WHERE NOT deleted` guard — a
  cross-cutting change and a standing data-leak risk if missed.
* Retains personal data indefinitely, contrary to a "delete my account" promise.
* Storage is never reclaimed.

### Option C — Background job / queue for storage cleanup

Pros:
* Decouples the request from potentially many blob deletes.

Cons:
* No queue/worker exists; introduces infrastructure with no other user benefit,
  against the roadmap's "MVP before automation" principle.

## Consequences

Positive:
* The Additional Settings milestone gains its foundation with **zero migrations**.
* Account deletion is genuinely complete — DB *and* object storage — with no
  orphaned blobs under normal operation.
* The app now has a clean, tested pattern for app-owned `users` mutations that
  coexists with the Auth.js adapter's OAuth-time writes.

Negative:
* Deletion is irreversible (mitigated by explicit confirmation).
* A transient storage outage during purge can orphan blobs; these are logged and
  can be swept later, but there is no automatic retry in this pass.
* Base currency now has two entry points (settings + portfolio) until a later
  cleanup consolidates them.

## Related Documents

* docs/architecture.md
* docs/database.md
* docs/decisions/ADR-004-s3-storage-abstraction.md
* docs/decisions/ADR-007-portfolio-analytics-upgrade.md
* docs/roadmap.md
