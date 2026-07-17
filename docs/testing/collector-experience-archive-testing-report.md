# Testing Report — Full-Account Archive + Restore

Date: 2026-07-17
Scope: ADR-017 archive addendum (§§21–26)
Milestone: Collector Experience, slice 3 of 3 (Epic #180) — completes the milestone

Covers the full-account archive: a dependency-free STORE zip of a JSON manifest
plus every image and invoice byte, downloadable from `/settings` and restorable
**additively** into any account.

## Automated gates

| Gate | Result |
| --- | --- |
| `npm run lint` | pass — no ESLint warnings or errors |
| `npm run typecheck` | pass |
| `npm test` | pass — **505 tests**, 44 files |

Archive-specific tests (31 of the 505, all green):

* `src/lib/zip.test.ts` (6) — the STORE zip writer/reader round-trips binary and
  adversarial input; `unzip` verifies each entry's CRC-32 and rejects a truncated
  file, a bad signature, and any non-STORE (compressed) entry.
* `src/lib/archive.test.ts` (6) — the versioned Zod manifest contract: a future or
  corrupt `version` is rejected naming the mismatch, a tampered `grade` is refused,
  entry-name helpers and the dated, header-safe filename are pinned.
* `src/services/archive.service.test.ts` (8) — export maps the account graph to the
  manifest (values as stored, no FX, `createdAt` preserved); restore validates
  shape → referential integrity → blob presence **before any write**, so a dangling
  coin→collection link or a missing blob is rejected whole.
* `src/app/api/account/archive/route.test.ts` (4) — 401 unauthenticated, 200 zip with
  the attachment/`private, no-cache` headers, AppError and unexpected-error mapping.
* `src/app/api/account/restore/route.test.ts` (7) — 401, 400 on a missing file field,
  **400 on an over-limit upload without reading it**, success summary, error mapping.
* `src/app/api/write-guard.test.ts` (24) — the load-bearing static scan now also
  covers `account/restore/route.ts`: it exports `POST` **and** calls
  `assertWritable(user)`, so the read-only demo cannot restore. The archive `GET`
  route is (correctly) not flagged — a download is a read.

## End-to-end round-trip (dev DB + object storage)

Exported the largest real account, restored it into a throwaway user, re-exported
the result, and diffed — driving the real `archive.service` / `archive.repository`
through Postgres and the filesystem storage backend, then cleaning up via
`deleteAccount`:

| Check | Result |
| --- | --- |
| Source account | 2 collections, 9 coins, 1 valuation, 18 images, 3 invoices → **20.7 MB** zip |
| Restore summary | identical counts (2 / 9 / 1 / 18 / 3) |
| Re-export counts vs. original | **match** |
| Restored collection ids all fresh (additive) | **yes** — no source id survived |
| Sample image bytes after round-trip | **byte-for-byte identical** (186,327 B) |
| Sample invoice bytes after round-trip | **byte-for-byte identical** (126,049 B) |

The `deleteAccount` cleanup doubled as a check that the deletion cascade handles a
restored graph — it removed the temp user's collections, coins, valuations and
purged its blobs without error.

## Manual verification (browser, dev server)

Driven with a session cookie for a real (non-demo) tenant, then the seeded demo
tenant.

### Real tenant — `/settings` → "Your data"

* Section renders with **Download archive** and **Restore archive** controls.
* `GET /api/account/archive` through the full HTTP stack: **200**,
  `Content-Type: application/zip`,
  `Content-Disposition: attachment; filename="numisbook-archive-2026-07-17.zip"`,
  `Cache-Control: private, no-cache`, valid `PK\x03\x04` magic, 20.7 MB (matches the
  service-level export).
* Restore rejection paths (non-destructive, same code path the UI uses):
  * malformed `.zip` → **400** "This file is not a valid archive: Not a zip file: no
    end-of-central-directory record found."
  * missing `file` field → **400** "Expected a file upload under the 'file' field."

### Demo tenant — read-only enforcement (DDR-007 / ADR-017 §10)

| Surface | Result |
| --- | --- |
| Download archive control | offered |
| `GET /api/account/archive` | **200**, valid zip, 3.66 MB (the seeded collection) |
| Restore control | **withheld** — affordance removed, not merely disabled (`canRestore={!user.isDemo}`) |
| `POST /api/account/restore` (direct, forged) | **403** — refused even if the affordance were bypassed |

So the demo can pull its seeded collection out (a read), but cannot write anything
back — enforced both in the UI and at the server, consistent with the demo's
existing profile/delete withholding.

## Defects found during verification

None. Automated gates, the end-to-end round-trip, and the browser pass all held on
the first run.

## Notes / remaining issues

* **Buffered with a ceiling.** Export builds and restore reads entirely in memory;
  the restore upload is bounded by `MAX_RESTORE_BYTES` (100 MB) rather than by the
  tenant's data size (ADR-017 §8). STORE means that byte count is also the real
  uncompressed size — no zip-bomb amplification to guard. Large accounts will
  eventually want streaming, the same "four figures" trigger export already names.
* **Restore is additive by design.** The manifest carries source ids only to wire
  the graph internally; fresh ids are assigned on restore, so re-restoring the same
  archive duplicates it. Disclosed by the result summary, not prevented — the mirror
  of CSV import's additive stance (ADR-017 §14/§23).
* **Atomic for the database, best-effort for blobs.** Blobs are put to storage before
  the single insert transaction opens; a storage failure writes nothing and a
  transaction failure rolls back with a best-effort blob cleanup (Postgres and object
  storage cannot share a transaction — the exact ADR-013 tolerance).
* **No DOM in CI.** The `/settings` control wiring was verified by hand, not by a
  gate — the same blind spot the "Accessibility checks in CI" milestone exists to
  close.
