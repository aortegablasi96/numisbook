// Limits for CSV import (ADR-017 addendum). One home for the constants the file
// picker's `accept`, the client, and the server check all read — mirroring
// `images.ts` / `invoices.ts`.

/**
 * What the file picker offers and the route accepts.
 *
 * Browsers are inconsistent about the MIME type they attach to a `.csv`: Windows
 * commonly reports `application/vnd.ms-excel` when Excel is installed, and some
 * send nothing at all. So the extension is accepted alongside the types, and the
 * real check is the header row — a file whose columns are not the contract is
 * rejected regardless of what it claimed to be (ADR-017 addendum §20).
 */
export const ALLOWED_IMPORT_TYPES = [
  "text/csv",
  "application/csv",
  "text/plain",
  "application/vnd.ms-excel",
] as const;

/** What the `accept` attribute offers. Extension first — it is the reliable part. */
export const IMPORT_ACCEPT = ".csv,text/csv";

/**
 * Maximum upload size.
 *
 * Chosen conservatively rather than empirically. The hosting platform imposes its
 * own request-body ceiling, and a limit we advertise but the platform rejects
 * first is a 500 where we promised a message — so this wants to sit *below* that
 * ceiling, not near it. **The exact platform figure has not been confirmed**; 4 MB
 * is low enough to be safe under the commonly cited serverless limits without
 * relying on the specific number.
 *
 * This is generous for the use case regardless: the pathological row (two
 * 4000-char free-text fields) is ~10 KB, so `COIN_IMPORT_MAX_ROWS` binds first in
 * every realistic case and this only catches genuinely malformed uploads.
 *
 * If a collector ever reports a large import failing as a 500 rather than a
 * message, the platform ceiling is the first thing to check — and note
 * `MAX_INVOICE_BYTES` (15 MB) and `MAX_IMAGE_BYTES` (5 MB) make the same
 * assumption with far less headroom.
 */
export const MAX_IMPORT_BYTES = 4 * 1024 * 1024; // 4 MB

/**
 * Maximum rows in one import.
 *
 * Bounded by Postgres, not by taste: a multi-row INSERT binds one parameter per
 * column per row, and the protocol caps that at 65535. The contract carries 26
 * columns, so the ceiling is 65535 / 26 ≈ 2520 rows. 2000 sits below it with
 * headroom for a column or two being added to the contract later, which ADR-017
 * calls the safe direction of change.
 *
 * If a collector ever needs more, the fix is chunking the insert — not raising
 * this past the bound.
 */
export const COIN_IMPORT_MAX_ROWS = 2000;

/**
 * How many individual row errors a report carries back.
 *
 * The *counts* in a report are always exact; this caps only the itemised list, so
 * a file where every row is wrong returns a usable response instead of megabytes
 * of near-identical messages. The UI says "…and N more" from the exact count.
 */
export const COIN_IMPORT_MAX_REPORTED_ERRORS = 50;

export function formatBytes(bytes: number): string {
  return bytes < 1024 * 1024
    ? `${Math.round(bytes / 1024)} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
