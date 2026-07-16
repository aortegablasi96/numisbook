import type { MessageKey } from "@/lib/i18n";

// The coin filter model, shared by both coin surfaces (the per-collection table
// and the cross-collection /coins view) so they cannot drift — DDR-005.
//
// Values are held as strings/string[] because they come from form controls; the
// API boundary coerces and validates them (coinSearchParamsSchema, ADR-015).

/** Faceted fields: multi-select, values sourced from the facets endpoint. */
export type FacetField = "metals" | "categories" | "denominations" | "mints";
/** Every multi-value field, including grade (a fixed enum, not a facet query). */
export type MultiField = FacetField | "grades";

export type CoinFilterState = {
  q: string;
  metals: string[];
  categories: string[];
  denominations: string[];
  mints: string[];
  grades: string[];
  yearFrom: string;
  yearTo: string;
  sortBy: string;
  sortDir: "asc" | "desc";
};

export const EMPTY_FILTERS: CoinFilterState = {
  q: "",
  metals: [],
  categories: [],
  denominations: [],
  mints: [],
  grades: [],
  yearFrom: "",
  yearTo: "",
  sortBy: "createdAt",
  sortDir: "desc",
};

export const MULTI_FIELDS: readonly MultiField[] = [
  "metals",
  "categories",
  "denominations",
  "mints",
  "grades",
] as const;

/** Wire name of each multi-value field — singular, repeated (`?metal=A&metal=B`). */
const PARAM: Record<MultiField, string> = {
  metals: "metal",
  categories: "category",
  denominations: "denomination",
  mints: "mint",
  grades: "grade",
};

export const FIELD_LABEL: Record<MultiField, MessageKey> = {
  metals: "field.metal",
  categories: "field.category",
  denominations: "field.denomination",
  mints: "field.mint",
  grades: "field.grade",
};

/**
 * Facet lists longer than this get a type-to-filter box inside the popover
 * (DDR-005 addendum). Below it the list is short enough to read at a glance, and
 * a search box over six checkboxes is clutter plus an extra tab stop.
 */
export const FACET_SEARCH_THRESHOLD = 10;

/**
 * Comparison key for facet search: case- and accent-insensitive, so "zur" matches
 * "Zürich". Catalogue data (mints, denominations) is full of diacritics that a
 * user typing quickly will not reproduce.
 */
function foldForSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase();
}

/**
 * The facet values matching a type-to-filter query. Narrowing is presentation
 * only: it never changes the selection, so a selected value that stops matching
 * stays selected and keeps its active-filter chip.
 */
export function filterFacetValues(values: string[], query: string): string[] {
  const q = foldForSearch(query.trim());
  if (!q) return values;
  return values.filter((value) => foldForSearch(value).includes(q));
}

/** Add a value if absent, remove it if present — a facet checkbox / grade chip. */
export function toggleValue(values: string[], value: string): string[] {
  return values.includes(value)
    ? values.filter((v) => v !== value)
    : [...values, value];
}

/**
 * The query string for the coin search API. Each selected value of a multi-value
 * field is appended under the same param, which the API reads with `getAll`:
 * values within a field are OR'd, separate fields AND'd (ADR-015).
 */
export function buildSearchParams(
  filters: CoinFilterState,
  page: number,
): URLSearchParams {
  const sp = new URLSearchParams();
  if (filters.q.trim()) sp.set("q", filters.q.trim());
  for (const field of MULTI_FIELDS) {
    for (const value of filters[field]) sp.append(PARAM[field], value);
  }
  if (filters.yearFrom.trim()) sp.set("yearFrom", filters.yearFrom.trim());
  if (filters.yearTo.trim()) sp.set("yearTo", filters.yearTo.trim());
  if (filters.sortBy) sp.set("sortBy", filters.sortBy);
  sp.set("sortDir", filters.sortDir);
  sp.set("page", String(page));
  return sp;
}

/** One active filter, as rendered in the removable-chip row. */
export type ActiveFilter =
  | { kind: "q"; value: string }
  | { kind: "multi"; field: MultiField; value: string }
  | { kind: "yearFrom"; value: string }
  | { kind: "yearTo"; value: string };

/**
 * Every filter currently narrowing the list, one entry per removable chip. Sort
 * is not a filter — it reorders the list rather than narrowing it — so it never
 * appears as a chip (though "clear all" still resets it).
 */
export function activeFilters(filters: CoinFilterState): ActiveFilter[] {
  const active: ActiveFilter[] = [];
  if (filters.q.trim()) active.push({ kind: "q", value: filters.q.trim() });
  for (const field of MULTI_FIELDS) {
    for (const value of filters[field]) active.push({ kind: "multi", field, value });
  }
  if (filters.yearFrom.trim())
    active.push({ kind: "yearFrom", value: filters.yearFrom.trim() });
  if (filters.yearTo.trim())
    active.push({ kind: "yearTo", value: filters.yearTo.trim() });
  return active;
}

/** Remove a single chip's value, returning the narrowed-by-one filter state. */
export function removeFilter(
  filters: CoinFilterState,
  target: ActiveFilter,
): CoinFilterState {
  switch (target.kind) {
    case "q":
      return { ...filters, q: "" };
    case "yearFrom":
      return { ...filters, yearFrom: "" };
    case "yearTo":
      return { ...filters, yearTo: "" };
    case "multi":
      return {
        ...filters,
        [target.field]: filters[target.field].filter((v) => v !== target.value),
      };
  }
}

/** True when nothing is filtered *and* the sort is untouched — "clear all" is a no-op. */
export function isDefaultState(filters: CoinFilterState): boolean {
  return (
    activeFilters(filters).length === 0 &&
    filters.sortBy === EMPTY_FILTERS.sortBy &&
    filters.sortDir === EMPTY_FILTERS.sortDir
  );
}

/** Next sort state for a column: same column flips direction, a new one starts ascending. */
export function nextSort(
  filters: CoinFilterState,
  column: string,
): Pick<CoinFilterState, "sortBy" | "sortDir"> {
  return {
    sortBy: column,
    sortDir:
      filters.sortBy === column ? (filters.sortDir === "asc" ? "desc" : "asc") : "asc",
  };
}

/**
 * Field *and* direction in one `<option>` value, for the phone sort control: with
 * the sortable column headers hidden by the card form there is nothing left to
 * click to reverse the list, so the select carries both (DDR-006 addendum). On
 * desktop the headers still toggle direction via `nextSort`.
 */
export function sortOptionValue(sortBy: string, sortDir: "asc" | "desc"): string {
  return `${sortBy}:${sortDir}`;
}

/** Read back a `sortOptionValue`. An unparseable value falls back to the default sort. */
export function parseSortOption(value: string): Pick<CoinFilterState, "sortBy" | "sortDir"> {
  const sep = value.lastIndexOf(":");
  const sortBy = sep === -1 ? "" : value.slice(0, sep);
  const dir = sep === -1 ? "" : value.slice(sep + 1);
  if (!sortBy || (dir !== "asc" && dir !== "desc")) {
    return { sortBy: EMPTY_FILTERS.sortBy, sortDir: EMPTY_FILTERS.sortDir };
  }
  return { sortBy, sortDir: dir };
}
