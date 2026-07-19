# `src/lib/storage` — Object storage

Binary blobs (coin images, coin invoices) live here, **never in Postgres**. The
database stores only a `storageKey`; these backends hold the bytes.

## Rules

- `types.ts` defines the backend-agnostic `ObjectStorage` interface
  (`put` / `get` / `delete`). Keep it provider-neutral so swapping providers
  stays a one-file change (ADR-004, ADR-005).
- `index.ts` exports the `objectStorage` singleton and auto-selects a backend
  from the environment:
  - `S3Storage` (`s3.ts`, AWS SDK, targets Cloudflare R2) when all four `R2_*`
    vars are set;
  - `FsStorage` (`fs.ts`, under `./.storage`, gitignored) otherwise — so dev
    and test run with no cloud credentials.
- **Do not call a provider SDK from outside this folder.** Consumers depend on
  the interface, not on R2.

## Composition

Only `coinImage.repository` and `coinInvoice.repository` compose a database row
with its stored object. They delete the object when the row is deleted, and
clean up the object on a failed insert, so no orphans are left behind.
