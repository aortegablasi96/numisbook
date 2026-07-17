// The coin CSV column contract (ADR-017) — the single source of truth for what a
// coin CSV contains, in what order, and how each value is written and read.
//
// **This module serves both directions.** Export writes through it
// (`coinExportRow`, `escapeCell`) and import reads back through it (`parseRow`,
// `unescapeCell`, `validateHeaders`). The file is named `coin-export` for
// historical reasons only — it arrived with the export slice. Do **not** add a
// `coin-import.ts` with its own column list: two sides of a round-trip that
// disagree corrupt collectors' data silently on re-import, which ADR-017 names as
// the highest-severity risk in this milestone. One array, `COIN_EXPORT_COLUMNS`,
// defines both directions. Add a column there and nowhere else.
//
// Layering: `src/lib` never imports from `@/repositories` (repositories import
// *from* lib — see `analytics.repository.ts` → `coin-format`), so the coin shape
// below is structural, exactly as `coin-format.ts` does it. The cost of a
// hand-written shape is that a new schema column could silently go unexported;
// `coin-export.test.ts` closes that with a compile-time exhaustiveness check.

import { formatCoinTitle } from "./coin-format";

/**
 * The coin shape an export reads. Numeric columns (weight/diameter/money) arrive
 * as fixed-scale strings and dates as "YYYY-MM-DD", exactly as the repository
 * returns them — values are written **as stored** (ADR-017 §5), so there is
 * nothing to re-format.
 */
export type ExportableCoin = {
  collectionName: string;
  category: string | null;
  issuingAuthority: string | null;
  yearFrom: number | null;
  yearTo: number | null;
  denomination: string | null;
  mint: string | null;
  metal: string | null;
  grade: string | null;
  weight: string | null;
  diameter: string | null;
  obverseDescription: string | null;
  reverseDescription: string | null;
  observations: string | null;
  catalogueReferences: string | null;
  pedigree: string | null;
  auctionHouse: string | null;
  auctionName: string | null;
  auctionLot: string | null;
  auctionDate: string | null;
  hammerPrice: string | null;
  auctionPremium: string | null;
  shippingCost: string | null;
  taxCost: string | null;
  finalPrice: string | null;
  priceCurrency: string | null;
};

/**
 * A column's type, which is what decides whether it needs formula-injection
 * escaping. Only `text` can carry a formula: numbers, dates and the grade enum
 * are machine-generated from constrained columns. See `escapeCell`.
 */
export type ColumnKind = "text" | "number" | "date" | "enum";

type ExportColumn = {
  /** Stable English identifier. Never localized — this row is a data contract. */
  header: string;
  kind: ColumnKind;
  /** The coin field this column round-trips, or null when derived (read-only). */
  field: keyof ExportableCoin | null;
  value: (coin: ExportableCoin) => string;
};

const str = (value: string | null): string => value ?? "";
const num = (value: number | null): string => (value == null ? "" : String(value));

/**
 * The ordered column set.
 *
 * Headers match the validation schema's field names (`coinAttributesSchema`)
 * rather than prose like "Issuing Authority", so import maps a header straight to
 * a schema key with no translation table in between — one less thing to drift.
 */
export const COIN_EXPORT_COLUMNS = [
  // Derived and read-only: coins have no name (ADR-006), so without this the file
  // opens as a wall of bare attributes with nothing to recognise a coin by.
  // `formatCoinTitle` is the single source of truth for a title; import ignores it.
  { header: "title", kind: "text", field: null, value: (c) => formatCoinTitle(c) },
  // Constant on a per-collection export, varying on the cross-collection one —
  // either way the file records where each coin lived when it was exported.
  // Advisory only: import does **not** route on it (ADR-017 addendum §15).
  // `collections.name` has no unique constraint, so one user may own two
  // collections named "Roman" and routing a row by name is ambiguous by
  // construction. Import writes into the one collection the collector chose.
  { header: "collection", kind: "text", field: "collectionName", value: (c) => c.collectionName },

  { header: "category", kind: "text", field: "category", value: (c) => str(c.category) },
  { header: "issuingAuthority", kind: "text", field: "issuingAuthority", value: (c) => str(c.issuingAuthority) },
  // Signed: negative is BC, exactly as the column stores it and the coin form
  // takes it. Not the "44 BC" display form, which does not round-trip.
  { header: "yearFrom", kind: "number", field: "yearFrom", value: (c) => num(c.yearFrom) },
  { header: "yearTo", kind: "number", field: "yearTo", value: (c) => num(c.yearTo) },
  { header: "denomination", kind: "text", field: "denomination", value: (c) => str(c.denomination) },
  { header: "mint", kind: "text", field: "mint", value: (c) => str(c.mint) },
  { header: "metal", kind: "text", field: "metal", value: (c) => str(c.metal) },
  { header: "grade", kind: "enum", field: "grade", value: (c) => str(c.grade) },
  { header: "weight", kind: "number", field: "weight", value: (c) => str(c.weight) },
  { header: "diameter", kind: "number", field: "diameter", value: (c) => str(c.diameter) },
  { header: "obverseDescription", kind: "text", field: "obverseDescription", value: (c) => str(c.obverseDescription) },
  { header: "reverseDescription", kind: "text", field: "reverseDescription", value: (c) => str(c.reverseDescription) },
  { header: "observations", kind: "text", field: "observations", value: (c) => str(c.observations) },
  { header: "catalogueReferences", kind: "text", field: "catalogueReferences", value: (c) => str(c.catalogueReferences) },
  { header: "pedigree", kind: "text", field: "pedigree", value: (c) => str(c.pedigree) },
  { header: "auctionHouse", kind: "text", field: "auctionHouse", value: (c) => str(c.auctionHouse) },
  { header: "auctionName", kind: "text", field: "auctionName", value: (c) => str(c.auctionName) },
  { header: "auctionLot", kind: "text", field: "auctionLot", value: (c) => str(c.auctionLot) },
  { header: "auctionDate", kind: "date", field: "auctionDate", value: (c) => str(c.auctionDate) },
  // Price paid, in the coin's own currency — never FX-converted (ADR-017 §5): an
  // export is a record of fact, and converting would bake a floating rate into it.
  { header: "hammerPrice", kind: "number", field: "hammerPrice", value: (c) => str(c.hammerPrice) },
  { header: "auctionPremium", kind: "number", field: "auctionPremium", value: (c) => str(c.auctionPremium) },
  { header: "shippingCost", kind: "number", field: "shippingCost", value: (c) => str(c.shippingCost) },
  { header: "taxCost", kind: "number", field: "taxCost", value: (c) => str(c.taxCost) },
  { header: "finalPrice", kind: "number", field: "finalPrice", value: (c) => str(c.finalPrice) },
  { header: "priceCurrency", kind: "text", field: "priceCurrency", value: (c) => str(c.priceCurrency) },
] as const satisfies readonly ExportColumn[];

/** Coin fields a column round-trips. Drives the exhaustiveness check in the test. */
export type ExportedField = (typeof COIN_EXPORT_COLUMNS)[number]["field"];

/**
 * Coin columns deliberately absent from the file: surrogate identity and the FK
 * (`collection` carries the human-readable owner instead), plus the server-owned
 * `created_at`. Import derives all three; letting a collector edit them in a
 * spreadsheet would mean editing NumisBook's bookkeeping, not their coin.
 */
export const COIN_EXPORT_OMITTED = ["id", "collectionId", "createdAt"] as const;

/** Characters that make Excel treat a cell as a formula rather than data. */
const FORMULA_PREFIXES = ["=", "+", "-", "@", "\t", "\r"];

/**
 * Neutralize a cell that Excel would execute as a formula on open.
 *
 * Applied to **text columns only**, which is the whole reason columns are typed.
 * The blanket rule ("prefix any field starting = + - @") is wrong here: `yearFrom`
 * is signed, so 44 BC exports as `-44`, and the blanket rule would rewrite it to
 * `'-44` — corrupting a number into text on the field that most distinguishes this
 * domain. Numbers, dates and the grade enum come from constrained columns and
 * cannot carry a formula, so they are left alone (ADR-017 §7).
 *
 * Quoting is not an alternative: Excel executes a formula inside a quoted field.
 */
export function escapeCell(value: string, kind: ColumnKind): string {
  if (kind !== "text") return value;
  return FORMULA_PREFIXES.some((p) => value.startsWith(p)) ? `'${value}` : value;
}

/** The header row: stable English identifiers, in contract order. */
export const coinExportHeaders = (): string[] =>
  COIN_EXPORT_COLUMNS.map((column) => column.header);

/** One coin as a row of cells, in contract order, escaped by column type. */
export function coinExportRow(coin: ExportableCoin): string[] {
  return COIN_EXPORT_COLUMNS.map((column) =>
    escapeCell(column.value(coin), column.kind),
  );
}

// ---- The import half of the contract (ADR-017 addendum) ---------------------

/**
 * Headers the file carries that import deliberately does not read.
 *
 * - `title` is derived from other attributes and read-only (ADR-017 §6): a
 *   collector editing the title cell must not be misled into thinking it did
 *   something.
 * - `collection` is advisory — see the column's own note above (addendum §15).
 *
 * Every other column with a non-null `field` is imported. The compile-time check
 * in `coin-export.test.ts` fails the build if a column is neither.
 */
export const COIN_IMPORT_IGNORED = ["title", "collection"] as const;

const isIgnored = (header: string): boolean =>
  (COIN_IMPORT_IGNORED as readonly string[]).includes(header);

/**
 * Undo `escapeCell` — strip the `'` it prepends to neutralize a spreadsheet
 * formula. Text columns only, so a signed year (`-44`) is never touched.
 *
 * The guard is deliberately narrower than "strip any leading `'`": it strips one
 * only when what follows would itself have been escaped. Otherwise ordinary text
 * that merely starts with an apostrophe — `'tis`, a quoted pedigree — would lose
 * its first character on every round-trip, which is far more common than the case
 * below.
 *
 * **Known limit, inherent and not fixable here:** `escapeCell` is not injective.
 * Both `=1+1` and the literal text `'=1+1` export as `'=1+1`, so no inverse can
 * tell them apart, and this one resolves to `=1+1`. Text that literally begins
 * with an apostrophe *followed by* `=`, `+`, `-`, `@`, tab or CR loses that
 * apostrophe on re-import. The alternative is changing `escapeCell` to prefix
 * every text cell, which would make it injective but corrupts nothing today and
 * would alter the meaning of every file already on a collector's disk — ADR-017
 * froze the format for exactly that reason. Accepted, documented, and pinned by a
 * test so it stays a known quantity rather than a surprise.
 */
export function unescapeCell(value: string, kind: ColumnKind): string {
  if (kind !== "text") return value;
  if (!value.startsWith("'")) return value;
  const rest = value.slice(1);
  return FORMULA_PREFIXES.some((p) => rest.startsWith(p)) ? rest : value;
}

/** Where each contract column sits in a given file's header row. */
export type ColumnIndex = ReadonlyMap<string, number>;

export type HeaderCheck =
  | { ok: true; index: ColumnIndex }
  | { ok: false; unexpected: string[]; missing: string[] };

/**
 * Check a file's header row against the contract, and locate each column in it.
 *
 * Order-insensitive: a collector who reorders columns in Excel has not broken
 * anything, and the returned index is what lets `parseRow` read the file as
 * written rather than as we would have written it. The column *set* is exact,
 * though — an unknown column is rejected rather than ignored, because a file with
 * a `value` column the collector expects us to read is better refused than
 * half-imported (ADR-017 addendum §20).
 */
export function validateHeaders(headers: readonly string[]): HeaderCheck {
  const expected = coinExportHeaders();
  const seen = headers.map((h) => h.trim());

  const unexpected = seen.filter((h) => !expected.includes(h));
  const missing = expected.filter((h) => !seen.includes(h));
  if (unexpected.length > 0 || missing.length > 0) {
    return { ok: false, unexpected, missing };
  }

  const index = new Map<string, number>();
  seen.forEach((header, at) => index.set(header, at));
  return { ok: true, index };
}

/**
 * A number as the validation schema wants it. An unparseable cell is handed back
 * as its raw string on purpose: Zod then reports "expected number, received
 * string" against the column, which is an error a collector can act on. Coercing
 * it to NaN would report the same failure less legibly.
 */
function toNumber(raw: string): number | string {
  const n = Number(raw);
  return Number.isFinite(n) ? n : raw;
}

/**
 * One file row → the shape `createCoinSchema` validates, read through the same
 * column contract export writes. Cells are located via `index`, so column order
 * in the file does not matter.
 *
 * Empty cells become `null`, not `""` — ADR-017 §5: the two are not meaningfully
 * distinguished, and the schema's `.nullish()` fields want null.
 *
 * Values are coerced only as far as the schema needs: dates stay ISO strings
 * (`z.coerce.date()` takes them), the grade stays its code (`z.enum`), and text
 * stays text. Everything else the schema rejects, with a message naming the
 * column.
 */
export function parseRow(
  cells: readonly string[],
  index: ColumnIndex,
): Record<string, unknown> {
  const row: Record<string, unknown> = {};

  for (const column of COIN_EXPORT_COLUMNS) {
    if (column.field === null || isIgnored(column.header)) continue;

    const at = index.get(column.header);
    const raw = (at === undefined ? "" : cells[at] ?? "").trim();
    if (raw === "") {
      row[column.field] = null;
      continue;
    }

    const value = unescapeCell(raw, column.kind);
    row[column.field] = column.kind === "number" ? toNumber(value) : value;
  }

  return row;
}
