import {
  coinRepository,
  type Coin,
  type CoinCriteria,
  type CoinFacets,
  type CoinFilters,
  type CoinGrade,
  type CoinPatch,
  type CoinSortBy,
  type CoinSortDir,
  type CoinWithCollection,
  type RecentAcquisition,
} from "@/repositories/coin.repository";
import { collectionRepository } from "@/repositories/collection.repository";
import { buildConverter } from "@/services/fx.service";
import {
  createCoinSchema,
  updateCoinSchema,
  type CreateCoinInput,
} from "@/lib/validation/coin";
import { toCsv, parseCsv } from "@/lib/csv";
import {
  coinExportHeaders,
  coinExportRow,
  parseRow,
  validateHeaders,
} from "@/lib/coin-export";
import { COIN_IMPORT_MAX_ROWS, COIN_IMPORT_MAX_REPORTED_ERRORS } from "@/lib/csv-import";
import { NotFoundError, ValidationError } from "@/lib/errors";

export const COINS_PAGE_SIZE = 20;

// How many recent acquisitions the home dashboard surfaces.
export const RECENT_ACQUISITIONS_LIMIT = 5;

// The coin search/filter input. Every field is optional so callers that want the
// unfiltered list (the collection page's initial server render) can pass `{}`.
// The API boundary produces this shape via `coinSearchParamsSchema` (ADR-015);
// values arriving here are already validated.
export type CoinSearch = {
  q?: string;
  metals?: string[];
  categories?: string[];
  denominations?: string[];
  mints?: string[];
  grades?: CoinGrade[];
  yearFrom?: number;
  yearTo?: number;
  page?: number;
  sortBy?: CoinSortBy;
  sortDir?: CoinSortDir;
};

export type CoinSearchResult = {
  coins: Coin[];
  total: number;
  page: number;
  pageSize: number;
};

// The cross-collection listing carries each coin's owning collection.
export type AllCoinsSearchResult = Omit<CoinSearchResult, "coins"> & {
  coins: CoinWithCollection[];
};

// Translate the search input into repository criteria: drop empty values so an
// absent filter is `undefined` rather than an empty list. Shared by the paginated
// list and the unpaginated export, so the two read the same search identically.
function toCriteria(search: CoinSearch): CoinCriteria {
  const present = <T,>(values: T[] | undefined): T[] | undefined =>
    values?.length ? values : undefined;

  return {
    q: search.q?.trim() || undefined,
    metals: present(search.metals),
    categories: present(search.categories),
    denominations: present(search.denominations),
    mints: present(search.mints),
    grades: present(search.grades),
    yearFrom: Number.isFinite(search.yearFrom) ? search.yearFrom : undefined,
    yearTo: Number.isFinite(search.yearTo) ? search.yearTo : undefined,
    sortBy: search.sortBy,
    sortDir: search.sortDir,
  };
}

// Criteria plus the page window (page → offset), for the paginated list.
function toFilters(search: CoinSearch, page: number): CoinFilters {
  return {
    ...toCriteria(search),
    limit: COINS_PAGE_SIZE,
    offset: (page - 1) * COINS_PAGE_SIZE,
  };
}

const resolvePage = (page?: number): number => Math.max(1, Math.floor(page ?? 1));

// Business logic for coins. A coin's tenant is the owner of its collection, so
// every use case is gated on the acting user owning the relevant collection.
// Framework-agnostic: data access goes through repositories only.

async function assertOwnsCollection(
  userId: string,
  collectionId: string,
): Promise<void> {
  const owned = await collectionRepository.findByIdForUser(collectionId, userId);
  if (!owned) throw new NotFoundError("Collection not found");
}

export async function listCoins(
  userId: string,
  collectionId: string,
): Promise<Coin[]> {
  await assertOwnsCollection(userId, collectionId);
  return coinRepository.listByCollection(collectionId);
}

export async function searchCoins(
  userId: string,
  collectionId: string,
  search: CoinSearch,
): Promise<CoinSearchResult> {
  await assertOwnsCollection(userId, collectionId);
  const page = resolvePage(search.page);
  const { coins, total } = await coinRepository.searchInCollection(
    collectionId,
    toFilters(search, page),
  );
  return { coins, total, page, pageSize: COINS_PAGE_SIZE };
}

/**
 * Search the user's coins across every collection they own (the `/coins` view).
 * There is no per-collection ownership check to make because the query spans them
 * all — tenant isolation is enforced by the repository, which scopes by `userId`.
 */
export async function searchAllCoins(
  userId: string,
  search: CoinSearch,
): Promise<AllCoinsSearchResult> {
  const page = resolvePage(search.page);
  const { coins, total } = await coinRepository.searchForUser(
    userId,
    toFilters(search, page),
  );
  return { coins, total, page, pageSize: COINS_PAGE_SIZE };
}

// ---- CSV export (ADR-017) ---------------------------------------------------

/** A generated export: the file's contents and the name to offer it under. */
export type CoinExport = {
  filename: string;
  csv: string;
};

/**
 * Fold arbitrary user text into an ASCII slug safe to put in a filename.
 *
 * Collection names are free text, and interpolating one into a
 * `Content-Disposition` header is both a header-injection vector (quotes,
 * newlines) and an RFC 5987 encoding problem ("Münzen"). Folding to `[a-z0-9-]`
 * sidesteps both at once: the header can only ever contain characters that are
 * safe in it (ADR-017 §9). Falls back when a name slugs away to nothing — e.g. a
 * collection named entirely in Chinese.
 */
export function slugForFilename(name: string, fallback: string): string {
  const slug = name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 60)
    .replace(/^-+|-+$/g, "");
  return slug || fallback;
}

/** `numisbook-<stem>-YYYY-MM-DD.csv` — names both the source and the date. */
export function buildExportFilename(stem: string, on: Date): string {
  return `numisbook-${stem}-${on.toISOString().slice(0, 10)}.csv`;
}

// Rows → a named CSV document, via the one column contract (`@/lib/coin-export`).
function toCoinExport(coins: CoinWithCollection[], stem: string): CoinExport {
  return {
    filename: buildExportFilename(stem, new Date()),
    csv: toCsv(coinExportHeaders(), coins.map(coinExportRow)),
  };
}

/**
 * Every coin in a collection matching the search, as CSV — no pagination: an
 * export is of the whole filtered list, not the page in view.
 *
 * The collection is read (not just ownership-checked) because its name titles the
 * file, and it must resolve even when the search matches no coins — a filter that
 * matches nothing still yields a valid header-only file.
 */
export async function exportCoins(
  userId: string,
  collectionId: string,
  search: CoinSearch,
): Promise<CoinExport> {
  const collection = await collectionRepository.findByIdForUser(collectionId, userId);
  if (!collection) throw new NotFoundError("Collection not found");

  const coins = await coinRepository.listForExportInCollection(
    collectionId,
    toCriteria(search),
  );
  return toCoinExport(coins, slugForFilename(collection.name, "collection"));
}

/**
 * Every coin the user owns matching the search, as CSV (the `/coins` export).
 * No per-collection ownership check to make — the query spans them all, and
 * tenant isolation is enforced by the repository, mirroring `searchAllCoins`.
 */
export async function exportAllCoins(
  userId: string,
  search: CoinSearch,
): Promise<CoinExport> {
  const coins = await coinRepository.listForExportForUser(userId, toCriteria(search));
  return toCoinExport(coins, "coins");
}

// ---- CSV import (ADR-017 addendum) ------------------------------------------

/** One row of the file that could not become a coin. */
export type ImportRowError = {
  /**
   * The line as the collector sees it in a spreadsheet: the header is row 1, so
   * the first coin is row 2. Reporting the array index would be reporting our
   * bookkeeping, not their file.
   */
  row: number;
  /** The contract column at fault, or null when the whole row is the problem. */
  column: string | null;
  message: string;
};

/**
 * What an import did — or, when previewing, what it would do.
 *
 * The counts are always exact. `errors` is capped
 * (`COIN_IMPORT_MAX_REPORTED_ERRORS`), so read `invalidRows` for the true number
 * of rows that failed rather than `errors.length`.
 */
export type ImportReport = {
  rowsRead: number;
  toAdd: number;
  /** 0 on a preview — nothing is written unless `commit` is true. */
  added: number;
  invalidRows: number;
  errors: ImportRowError[];
};

/** At most this many column names per list before the message summarises. */
const HEADER_NAMES_SHOWN = 4;

const nameList = (names: string[]): string =>
  names.length <= HEADER_NAMES_SHOWN
    ? names.join(", ")
    : `${names.slice(0, HEADER_NAMES_SHOWN).join(", ")} and ${names.length - HEADER_NAMES_SHOWN} more`;

/**
 * Say what is wrong with a header row in a sentence a collector can act on.
 *
 * Two shapes, because two situations. A file that shares nothing with the
 * contract is not a coin CSV at all, and listing all 27 missing columns would
 * bury that fact in a wall of text — so it gets told plainly. A file that is
 * *nearly* right gets the specific columns, which is the actionable case.
 */
function describeHeaderMismatch(
  unexpected: string[],
  missing: string[],
  recognised: number,
): string {
  if (recognised === 0) {
    return "This file does not look like a NumisBook coin export. Export a collection to see the columns it expects.";
  }
  const parts: string[] = [];
  if (unexpected.length > 0) parts.push(`unexpected: ${nameList(unexpected)}`);
  if (missing.length > 0) parts.push(`missing: ${nameList(missing)}`);
  return `This file's columns do not match a NumisBook export (${parts.join("; ")})`;
}

/**
 * Create coins in a collection from a CSV, reading the column contract export
 * writes (`@/lib/coin-export`).
 *
 * **Additive.** The contract carries no coin id by design, so import cannot
 * recognise a row it has already seen: every call inserts. Re-importing an export
 * duplicates it, which the UI discloses by stating the count before committing
 * (ADR-017 addendum §14).
 *
 * **Two-phase.** With `commit: false` this parses, validates and reports, writing
 * nothing — the preview the panel renders. With `commit: true` it does the same
 * work again and inserts the valid rows. Re-validating rather than trusting a
 * preview token is deliberate: a token is a claim about the past.
 *
 * **Tenant isolation.** Ownership is checked once, up front, and `collectionId`
 * is passed to the repository from that checked argument — never read from the
 * file, which is why the contract omits it. The same shape as the assistant's
 * server-side `userId` injection: untrusted input cannot name its own tenant.
 *
 * Rows are validated by `createCoinSchema` and mapped by `toCoinRow` — the very
 * ones the coin form posts through — so import holds no second opinion about what
 * a valid coin is, or about what a `finalPrice` is (addendum §18).
 */
export async function importCoins(
  userId: string,
  collectionId: string,
  text: string,
  commit: boolean,
): Promise<ImportReport> {
  await assertOwnsCollection(userId, collectionId);

  const rows = parseCsv(text);
  if (rows.length === 0) {
    throw new ValidationError("This file is empty");
  }

  const [headers, ...dataRows] = rows;
  const check = validateHeaders(headers);
  if (!check.ok) {
    const recognised = headers.length - check.unexpected.length;
    throw new ValidationError(
      describeHeaderMismatch(check.unexpected, check.missing, recognised),
    );
  }

  if (dataRows.length > COIN_IMPORT_MAX_ROWS) {
    throw new ValidationError(
      `This file has ${dataRows.length} rows; the limit is ${COIN_IMPORT_MAX_ROWS} per import`,
    );
  }

  const valid: CoinPatch[] = [];
  const errors: ImportRowError[] = [];
  let invalidRows = 0;

  dataRows.forEach((cells, i) => {
    const result = createCoinSchema.safeParse(parseRow(cells, check.index));
    if (result.success) {
      valid.push(toCoinRow(result.data));
      return;
    }

    invalidRows += 1;
    for (const issue of result.error.issues) {
      if (errors.length >= COIN_IMPORT_MAX_REPORTED_ERRORS) break;
      errors.push({
        row: i + 2, // the header occupies row 1
        column: issue.path.length > 0 ? String(issue.path[0]) : null,
        message: issue.message,
      });
    }
  });

  const report: ImportReport = {
    rowsRead: dataRows.length,
    toAdd: valid.length,
    added: 0,
    invalidRows,
    errors,
  };

  if (!commit) return report;

  report.added = await coinRepository.createManyInCollection(collectionId, valid);
  return report;
}

export async function getCoinFacets(
  userId: string,
  collectionId: string,
): Promise<CoinFacets> {
  await assertOwnsCollection(userId, collectionId);
  return coinRepository.getDistinctFacets(collectionId);
}

/** Faceted values across all the user's collections, for the `/coins` filters. */
export async function getAllCoinFacets(userId: string): Promise<CoinFacets> {
  return coinRepository.getDistinctFacetsForUser(userId);
}

// A recent acquisition with its price paid converted to the dashboard's base
// currency (ADR-007 FX). `basePrice` is null when the coin has no price or ECB
// cannot convert its currency — the UI then falls back to the native
// finalPrice/priceCurrency. `baseCurrency` echoes the resolved base so a row and
// the "total paid" stat always agree.
export type RecentAcquisitionView = RecentAcquisition & {
  basePrice: number | null;
  baseCurrency: string | null;
};

const round2 = (n: number): number => Math.round(n * 100) / 100;
const parseDay = (day: string): Date => new Date(`${day}T00:00:00Z`);

// The user's most recent acquisitions across every collection, for the home
// dashboard, with each price paid converted to `baseCurrency` (the same base the
// portfolio summary resolves, so the dashboard is internally consistent). Pass
// null to skip conversion (no priced coins / no base). Each price converts at its
// acquisition-day rate, falling back to the current rate, mirroring the portfolio.
// Tenant isolation is enforced by the repository (scoped by userId); there is no
// per-collection ownership check to make because it spans them all.
export async function listRecentAcquisitions(
  userId: string,
  baseCurrency: string | null,
  limit: number = RECENT_ACQUISITIONS_LIMIT,
): Promise<RecentAcquisitionView[]> {
  const capped = Math.max(1, Math.floor(limit));
  const rows = await coinRepository.listRecentAcquisitionsForUser(userId, capped);

  const priced = rows.filter(
    (r) => r.finalPrice != null && r.priceCurrency != null,
  );
  if (!baseCurrency || priced.length === 0) {
    return rows.map((r) => ({ ...r, basePrice: null, baseCurrency }));
  }

  // A converter spanning the currencies and acquisition dates in view.
  const currencies = new Set<string>();
  let minDate: Date | null = null;
  let maxDate: Date | null = null;
  for (const r of priced) {
    currencies.add(r.priceCurrency!);
    if (r.auctionDate) {
      const d = parseDay(r.auctionDate);
      if (!minDate || d < minDate) minDate = d;
      if (!maxDate || d > maxDate) maxDate = d;
    }
  }
  const today = new Date();
  const converter = await buildConverter(
    baseCurrency,
    [...currencies],
    minDate ?? today,
    maxDate ?? today,
  );

  return rows.map((r) => {
    if (r.finalPrice == null || r.priceCurrency == null) {
      return { ...r, basePrice: null, baseCurrency };
    }
    const amount = Number.parseFloat(r.finalPrice);
    const atDate = r.auctionDate
      ? converter.convert(amount, r.priceCurrency, parseDay(r.auctionDate))
      : null;
    const converted = atDate ?? converter.convertLatest(amount, r.priceCurrency);
    return {
      ...r,
      basePrice: converted == null ? null : round2(converted),
      baseCurrency,
    };
  });
}

export async function getCoin(userId: string, coinId: string): Promise<Coin> {
  const coin = await coinRepository.findByIdForUser(coinId, userId);
  if (!coin) throw new NotFoundError("Coin not found");
  return coin;
}

// Numeric columns are stored/returned as fixed-scale strings.
const MONEY_FIELDS = [
  "hammerPrice",
  "auctionPremium",
  "shippingCost",
  "taxCost",
  "finalPrice",
] as const;

// Maps validated input (numbers/dates) to the repository row shape. `weight`,
// `diameter` and the price fields are numeric columns stored/returned as strings
// (fixed to scale); `auctionDate` is a date column stored as "YYYY-MM-DD". Only
// keys present on the input are emitted, so PATCH updates stay partial.
//
// Price-paid rule: when any of hammer/premium/shipping/tax is provided,
// finalPrice is their computed sum (missing components count as 0); otherwise a
// directly provided finalPrice is used as-is.
function toCoinRow(data: Partial<CreateCoinInput>): CoinPatch {
  const row: Record<string, unknown> = { ...data };
  if (data.weight !== undefined)
    row.weight = data.weight === null ? null : data.weight.toFixed(2);
  if (data.diameter !== undefined)
    row.diameter = data.diameter === null ? null : data.diameter.toFixed(2);
  if (data.auctionDate !== undefined)
    row.auctionDate =
      data.auctionDate === null ? null : data.auctionDate.toISOString().slice(0, 10);

  for (const field of MONEY_FIELDS) {
    const value = data[field];
    if (value !== undefined) row[field] = value === null ? null : value.toFixed(2);
  }
  const hasComponent =
    data.hammerPrice != null ||
    data.auctionPremium != null ||
    data.shippingCost != null ||
    data.taxCost != null;
  if (hasComponent) {
    const sum =
      (data.hammerPrice ?? 0) +
      (data.auctionPremium ?? 0) +
      (data.shippingCost ?? 0) +
      (data.taxCost ?? 0);
    row.finalPrice = sum.toFixed(2);
  }
  return row as CoinPatch;
}

export async function addCoin(
  userId: string,
  collectionId: string,
  input: unknown,
): Promise<Coin> {
  const data = createCoinSchema.parse(input);
  await assertOwnsCollection(userId, collectionId);
  return coinRepository.create({ collectionId, ...toCoinRow(data) });
}

export async function editCoin(
  userId: string,
  coinId: string,
  input: unknown,
): Promise<Coin> {
  const data = updateCoinSchema.parse(input);
  // Drop omitted fields so we only update what was provided (and never .set({})).
  const patch = Object.fromEntries(
    Object.entries(toCoinRow(data)).filter(([, value]) => value !== undefined),
  ) as CoinPatch;
  if (Object.keys(patch).length === 0) {
    throw new ValidationError("No fields to update");
  }
  const updated = await coinRepository.updateForUser(coinId, userId, patch);
  if (!updated) throw new NotFoundError("Coin not found");
  return updated;
}

export async function deleteCoin(userId: string, coinId: string): Promise<void> {
  const deleted = await coinRepository.deleteForUser(coinId, userId);
  if (!deleted) throw new NotFoundError("Coin not found");
}
