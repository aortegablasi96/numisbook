"use client";

import { useEffect, useRef, useState } from "react";
import { COIN_GRADES } from "@/lib/validation/coin";
import { formatYearRange } from "@/lib/coin-format";
import { useT } from "@/components/i18n/LocaleProvider";
import {
  EMPTY_FILTERS,
  FIELD_LABEL,
  activeFilters,
  isDefaultState,
  removeFilter,
  toggleValue,
  type ActiveFilter,
  type CoinFilterState,
  type FacetField,
} from "./coin-filters";

export type CoinFacets = {
  metals: string[];
  categories: string[];
  denominations: string[];
  mints: string[];
};

export const EMPTY_FACETS: CoinFacets = {
  metals: [],
  categories: [],
  denominations: [],
  mints: [],
};

const FACET_FIELDS: readonly FacetField[] = [
  "metals",
  "categories",
  "denominations",
  "mints",
] as const;

/**
 * The coin filter bar (DDR-005), shared by both coin surfaces.
 *
 * Faceted fields are multi-select popovers; grade is a fixed 7-value ordered
 * scale, so it renders as inline toggle chips instead. Active filters appear as
 * removable chips in a second row that is absent when nothing is filtered.
 */
export function CoinFilters({
  filters,
  facets,
  onChange,
}: {
  filters: CoinFilterState;
  facets: CoinFacets;
  onChange: (next: CoinFilterState) => void;
}) {
  const t = useT();
  const active = activeFilters(filters);

  const set = (patch: Partial<CoinFilterState>) => onChange({ ...filters, ...patch });

  // The year range is signed: a negative bound means BC, exactly as the coin form
  // takes year_from / year_to. The hint renders the parsed range back so the
  // convention teaches itself.
  const yearFrom = Number(filters.yearFrom);
  const yearTo = Number(filters.yearTo);
  const yearHint = formatYearRange(
    filters.yearFrom.trim() && Number.isFinite(yearFrom) ? yearFrom : null,
    filters.yearTo.trim() && Number.isFinite(yearTo) ? yearTo : null,
  );

  const chipLabel = (chip: ActiveFilter): string => {
    switch (chip.kind) {
      case "q":
        return `${t("coins.search")}: ${chip.value}`;
      case "multi":
        return `${t(FIELD_LABEL[chip.field])}: ${chip.value}`;
      case "yearFrom":
        return `${t("coins.yearFromBc")}: ${chip.value}`;
      case "yearTo":
        return `${t("coins.yearToBc")}: ${chip.value}`;
    }
  };

  return (
    <div className="stack" style={{ gap: "0.5rem", flex: 1 }}>
      <div className="filters">
        <label>
          {t("coins.search")}
          <input
            type="text"
            value={filters.q}
            placeholder={t("coins.searchPlaceholder")}
            onChange={(e) => set({ q: e.target.value })}
          />
        </label>

        {FACET_FIELDS.map((field) => (
          <FacetPopover
            key={field}
            label={t(FIELD_LABEL[field])}
            values={facets[field]}
            selected={filters[field]}
            onToggle={(value) => set({ [field]: toggleValue(filters[field], value) })}
          />
        ))}

        {/* Grade: a fixed, ordered scale — direct toggle chips, not a popover. */}
        <fieldset className="filter-chips">
          <legend className="mono-label">{t("field.grade")}</legend>
          {COIN_GRADES.map((grade) => (
            <button
              key={grade}
              type="button"
              className="chip"
              aria-pressed={filters.grades.includes(grade)}
              onClick={() => set({ grades: toggleValue(filters.grades, grade) })}
            >
              {grade}
            </button>
          ))}
        </fieldset>

        <label>
          {t("coins.yearFromBc")}
          <input
            type="number"
            value={filters.yearFrom}
            onChange={(e) => set({ yearFrom: e.target.value })}
          />
        </label>
        <label>
          {t("coins.yearToBc")}
          <input
            type="number"
            value={filters.yearTo}
            onChange={(e) => set({ yearTo: e.target.value })}
          />
        </label>
        {yearHint && <span className="badge">{yearHint}</span>}
      </div>

      {/* Active-filter chips: absent entirely when nothing is filtered. */}
      {!isDefaultState(filters) && (
        <div className="filter-active">
          {active.map((chip) => (
            <button
              key={`${chip.kind}:${"field" in chip ? chip.field : ""}:${chip.value}`}
              type="button"
              className="chip is-active"
              onClick={() => onChange(removeFilter(filters, chip))}
            >
              {chipLabel(chip)}
              <span aria-hidden="true"> ×</span>
              <span className="sr-only">
                {t("coins.filterRemove", { filter: chipLabel(chip) })}
              </span>
            </button>
          ))}
          <button type="button" className="btn-sm" onClick={() => onChange(EMPTY_FILTERS)}>
            {t("action.clearAll")}
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * A multi-select facet dropdown. Reuses the `.col-picker` popover the column
 * picker established: anchored, dismissed on Escape or outside click, with focus
 * returning to the trigger.
 */
function FacetPopover({
  label,
  values,
  selected,
  onToggle,
}: {
  label: string;
  values: string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    }
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    // .facet-wrap, not an inline style: at the phone stop it becomes full-width and
    // the popover expands the bar in place instead of floating (DDR-006), which an
    // inline `position: relative` would override.
    <div ref={ref} className="facet-wrap">
      <button
        ref={triggerRef}
        type="button"
        className="btn-sm"
        aria-haspopup="true"
        aria-expanded={open}
        disabled={values.length === 0}
        onClick={() => setOpen((v) => !v)}
      >
        {label}
        {selected.length > 0 && ` · ${selected.length}`} {open ? "▴" : "▾"}
      </button>
      {open && (
        <div className="col-picker facet-picker">
          {values.length === 0 ? (
            <p className="col-picker-hint">{t("coins.filterAll")}</p>
          ) : (
            values.map((value) => (
              <label key={value} className="col-picker-item">
                <input
                  type="checkbox"
                  checked={selected.includes(value)}
                  onChange={() => onToggle(value)}
                />
                <span className="col-picker-label">{value}</span>
              </label>
            ))
          )}
        </div>
      )}
    </div>
  );
}
