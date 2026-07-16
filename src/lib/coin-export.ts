// The coin CSV column contract (ADR-017) — the single source of truth for what a
// coin export contains, in what order, and how each value is written. CSV import
// will read this same contract, so the round-trip cannot drift.
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
type ColumnKind = "text" | "number" | "date" | "enum";

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
  // either way the file says where each coin lives, and import can route on it.
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
