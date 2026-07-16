import { describe, it, expect } from "vitest";
import {
  EMPTY_FILTERS,
  activeFilters,
  buildSearchParams,
  filterFacetValues,
  isDefaultState,
  nextSort,
  parseSortOption,
  removeFilter,
  sortOptionValue,
  toggleValue,
  type CoinFilterState,
} from "./coin-filters";

const withFilters = (patch: Partial<CoinFilterState>): CoinFilterState => ({
  ...EMPTY_FILTERS,
  ...patch,
});

describe("buildSearchParams", () => {
  it("repeats a param per selected value so the API ORs within a field", () => {
    const sp = buildSearchParams(withFilters({ metals: ["Silver", "Gold"] }), 1);
    expect(sp.getAll("metal")).toEqual(["Silver", "Gold"]);
  });

  it("maps each multi-value field to its singular wire name", () => {
    const sp = buildSearchParams(
      withFilters({
        metals: ["Silver"],
        categories: ["Romans"],
        denominations: ["Denarius"],
        mints: ["Rome"],
        grades: ["VF"],
      }),
      1,
    );
    expect(sp.getAll("metal")).toEqual(["Silver"]);
    expect(sp.getAll("category")).toEqual(["Romans"]);
    expect(sp.getAll("denomination")).toEqual(["Denarius"]);
    expect(sp.getAll("mint")).toEqual(["Rome"]);
    expect(sp.getAll("grade")).toEqual(["VF"]);
  });

  it("omits blank text and year bounds", () => {
    const sp = buildSearchParams(withFilters({ q: "   ", yearFrom: "", yearTo: "" }), 1);
    expect(sp.has("q")).toBe(false);
    expect(sp.has("yearFrom")).toBe(false);
    expect(sp.has("yearTo")).toBe(false);
  });

  it("carries a negative (BC) year bound through unchanged", () => {
    const sp = buildSearchParams(withFilters({ yearFrom: "-400", yearTo: "-300" }), 2);
    expect(sp.get("yearFrom")).toBe("-400");
    expect(sp.get("yearTo")).toBe("-300");
    expect(sp.get("page")).toBe("2");
  });
});

describe("toggleValue", () => {
  it("adds an unselected value and removes a selected one", () => {
    expect(toggleValue([], "Silver")).toEqual(["Silver"]);
    expect(toggleValue(["Silver", "Gold"], "Silver")).toEqual(["Gold"]);
  });
});

describe("activeFilters", () => {
  it("is empty for the default state", () => {
    expect(activeFilters(EMPTY_FILTERS)).toEqual([]);
  });

  it("yields one entry per value, so each is individually removable", () => {
    const active = activeFilters(withFilters({ metals: ["Silver", "Gold"], q: "athens" }));
    expect(active).toEqual([
      { kind: "q", value: "athens" },
      { kind: "multi", field: "metals", value: "Silver" },
      { kind: "multi", field: "metals", value: "Gold" },
    ]);
  });

  it("does not treat sort as a filter — it reorders, it does not narrow", () => {
    expect(activeFilters(withFilters({ sortBy: "metal", sortDir: "asc" }))).toEqual([]);
  });
});

describe("removeFilter", () => {
  it("removes only the targeted value of a multi-value field", () => {
    const filters = withFilters({ metals: ["Silver", "Gold"] });
    const next = removeFilter(filters, { kind: "multi", field: "metals", value: "Silver" });
    expect(next.metals).toEqual(["Gold"]);
  });

  it("clears a text or year filter", () => {
    expect(removeFilter(withFilters({ q: "athens" }), { kind: "q", value: "athens" }).q).toBe("");
    expect(
      removeFilter(withFilters({ yearTo: "-44" }), { kind: "yearTo", value: "-44" }).yearTo,
    ).toBe("");
  });
});

describe("isDefaultState", () => {
  it("is true only when nothing filters and the sort is untouched", () => {
    expect(isDefaultState(EMPTY_FILTERS)).toBe(true);
    expect(isDefaultState(withFilters({ grades: ["MS"] }))).toBe(false);
    // Sort alone still enables "clear all", matching the old Clear button.
    expect(isDefaultState(withFilters({ sortBy: "metal", sortDir: "asc" }))).toBe(false);
  });
});

describe("nextSort", () => {
  it("starts a new column ascending and flips the current one", () => {
    expect(nextSort(EMPTY_FILTERS, "metal")).toEqual({ sortBy: "metal", sortDir: "asc" });
    expect(nextSort(withFilters({ sortBy: "metal", sortDir: "asc" }), "metal")).toEqual({
      sortBy: "metal",
      sortDir: "desc",
    });
  });
});

describe("sortOptionValue / parseSortOption", () => {
  it("round-trips a column and a direction", () => {
    expect(parseSortOption(sortOptionValue("metal", "asc"))).toEqual({
      sortBy: "metal",
      sortDir: "asc",
    });
    expect(parseSortOption(sortOptionValue("createdAt", "desc"))).toEqual({
      sortBy: "createdAt",
      sortDir: "desc",
    });
  });

  it("falls back to the default sort on an unparseable value", () => {
    const fallback = { sortBy: EMPTY_FILTERS.sortBy, sortDir: EMPTY_FILTERS.sortDir };
    expect(parseSortOption("")).toEqual(fallback);
    expect(parseSortOption("metal")).toEqual(fallback);
    expect(parseSortOption("metal:sideways")).toEqual(fallback);
    expect(parseSortOption(":asc")).toEqual(fallback);
  });
});

describe("filterFacetValues", () => {
  const mints = ["London", "Londinium", "Lyon", "Zürich", "Kraków", "Rome"];

  it("returns every value for an empty or whitespace-only query", () => {
    expect(filterFacetValues(mints, "")).toEqual(mints);
    expect(filterFacetValues(mints, "   ")).toEqual(mints);
  });

  it("matches a substring anywhere in the value, not just the start", () => {
    expect(filterFacetValues(mints, "lond")).toEqual(["London", "Londinium"]);
    expect(filterFacetValues(mints, "ome")).toEqual(["Rome"]);
  });

  it("ignores case", () => {
    expect(filterFacetValues(mints, "LONDON")).toEqual(["London"]);
    expect(filterFacetValues(mints, "rOmE")).toEqual(["Rome"]);
  });

  it("ignores diacritics, so a plain-ASCII query finds an accented value", () => {
    expect(filterFacetValues(mints, "zur")).toEqual(["Zürich"]);
    expect(filterFacetValues(mints, "krakow")).toEqual(["Kraków"]);
  });

  it("matches an accented query against the same accented value", () => {
    expect(filterFacetValues(mints, "zürich")).toEqual(["Zürich"]);
  });

  it("returns nothing when no value matches", () => {
    expect(filterFacetValues(mints, "atlantis")).toEqual([]);
  });

  it("trims the query, so a trailing space does not lose the match", () => {
    expect(filterFacetValues(mints, " lyon ")).toEqual(["Lyon"]);
  });

  it("preserves the facet's original order", () => {
    // "Kraków" matches too — it folds to "krakow" before the substring test.
    expect(filterFacetValues(mints, "o")).toEqual([
      "London",
      "Londinium",
      "Lyon",
      "Kraków",
      "Rome",
    ]);
  });
});
