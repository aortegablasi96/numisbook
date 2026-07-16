"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { readError, NETWORK_ERROR } from "@/lib/http";
import { useT } from "@/components/i18n/LocaleProvider";
import { CoinFilters, EMPTY_FACETS, type CoinFacets } from "./CoinFilters";
import { ExportCsvLink } from "./ExportCsvLink";
import {
  CoinTable,
  ColumnPicker,
  useCoinColumns,
  ALL_COIN_COLUMNS,
  ALL_COIN_COLUMNS_KEY,
  type CoinSortKey,
  type CoinView,
  type ColumnKey,
  type SearchResult,
} from "./CoinTable";
import {
  EMPTY_FILTERS,
  buildSearchParams,
  nextSort,
  type CoinFilterState,
} from "./coin-filters";

/**
 * The cross-collection coin listing (`/coins`). Reuses the same filter bar and
 * table as the per-collection view, but is **read-only**: a coin is created
 * inside a collection, and there is no sensible answer to "which collection?"
 * from a view that spans them all (DDR-005). Rows link to the coin detail, where
 * editing lives.
 */
export function AllCoinsManager({ initial }: { initial: SearchResult }) {
  const t = useT();
  const [coins, setCoins] = useState<CoinView[]>(initial.coins);
  const [total, setTotal] = useState(initial.total);
  const [page, setPage] = useState(initial.page);
  const [pageSize, setPageSize] = useState(initial.pageSize);
  const [filters, setFilters] = useState<CoinFilterState>(EMPTY_FILTERS);
  const [facets, setFacets] = useState<CoinFacets>(EMPTY_FACETS);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { colState, toggleCol, reorderCols } = useCoinColumns(
    ALL_COIN_COLUMNS,
    ALL_COIN_COLUMNS_KEY,
  );
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/coins/facets");
      if (res.ok) setFacets((await res.json()) as CoinFacets);
    })();
  }, []);

  const load = useCallback(async (p: number, f: CoinFilterState) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/coins?${buildSearchParams(f, p).toString()}`);
      if (!res.ok) { setError(await readError(res)); return; }
      const data = (await res.json()) as SearchResult;
      setCoins(data.coins); setTotal(data.total); setPage(data.page); setPageSize(data.pageSize);
    } catch { setError(NETWORK_ERROR); } finally { setLoading(false); }
  }, []);

  // Debounced: any filter change re-queries from page 1.
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    const timer = setTimeout(() => void load(1, filters), 300);
    return () => clearTimeout(timer);
  }, [filters, load]);

  function handleSort(key: CoinSortKey) {
    setFilters((f) => ({ ...f, ...nextSort(f, key) }));
  }

  // The phone select carries field + direction, so it replaces the sort outright
  // rather than flipping it (DDR-006 addendum).
  function handleSortSelect(sort: Pick<CoinFilterState, "sortBy" | "sortDir">) {
    setFilters((f) => ({ ...f, ...sort }));
  }

  return (
    <section className="stack">
      <div className="toolbar" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
        <CoinFilters filters={filters} facets={facets} onChange={setFilters} />
        <div className="row" style={{ gap: "0.5rem", flexShrink: 0 }}>
          {/* Outside the hide-phone wrapper on purpose: column choice is
              desktop-only (the card form has no columns to pick, DDR-006), but a
              collector on a phone has the same claim on their data. */}
          <ExportCsvLink href="/api/coins/export" filters={filters} />
          {/* Desktop/tablet only — see CoinsManager (DDR-006). */}
          <div className="hide-phone">
            <ColumnPicker columns={ALL_COIN_COLUMNS} colState={colState} onToggle={toggleCol} onReorder={reorderCols} />
          </div>
        </div>
      </div>

      {error && <p className="alert">{error}</p>}

      <p className="muted" aria-live="polite" style={{ margin: 0, fontSize: "0.85rem" }}>
        {t(total === 1 ? "unit.coinOne" : "unit.coinOther", { count: total })}
        {loading && ` · ${t("status.loading")}`}
      </p>

      {coins.length === 0 ? (
        <p className="empty">
          {total === 0 ? t("coins.allEmpty") : t("coins.emptyNoMatch")}
        </p>
      ) : (
        <CoinTable
          coins={coins}
          columns={ALL_COIN_COLUMNS}
          colState={colState}
          onReorder={reorderCols}
          sortBy={filters.sortBy}
          sortDir={filters.sortDir}
          onSort={handleSort}
          onSortSelect={handleSortSelect}
        />
      )}

      {totalPages > 1 && (
        <div className="pager">
          <button type="button" onClick={() => load(page - 1, filters)} disabled={loading || page <= 1}>{t("pager.prev")}</button>
          <span className="muted">{t("pager.page", { page, total: totalPages })}</span>
          <button type="button" onClick={() => load(page + 1, filters)} disabled={loading || page >= totalPages}>{t("pager.next")}</button>
        </div>
      )}
    </section>
  );
}
