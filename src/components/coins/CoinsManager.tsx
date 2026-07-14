"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { IconPencil, IconTrash } from "@/components/ui/icons";
import { COIN_GRADES } from "@/lib/validation/coin";
import { formatCoinTitle } from "@/lib/coin-format";
import { readError, NETWORK_ERROR } from "@/lib/http";
import { useT } from "@/components/i18n/LocaleProvider";
import type { MessageKey } from "@/lib/i18n";
import { CoinFilters, EMPTY_FACETS, type CoinFacets } from "./CoinFilters";
import {
  CoinTable,
  ColumnPicker,
  useCoinColumns,
  COIN_COLUMNS,
  COIN_COLUMNS_KEY,
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

export type { CoinView } from "./CoinTable";

// ---- Form helpers --------------------------------------------------------

// The list form covers the core identifying fields for quick add/edit. Richer
// attributes (weight, diameter, descriptions, catalogue, auction, price) are
// managed on the coin detail page; toPayload omits them, so a list edit is a
// safe partial PATCH that never clears them. (Coins have no name — they are
// identified by these attributes; see formatCoinTitle.)
const TEXT_FIELDS: readonly (readonly [string, MessageKey])[] = [
  ["category", "field.category"], ["issuingAuthority", "field.issuingAuthority"],
  ["denomination", "field.denomination"], ["mint", "field.mint"], ["metal", "field.metal"],
] as const;

type FormState = Record<string, string>;
const EMPTY_FORM: FormState = { category: "", issuingAuthority: "", denomination: "", mint: "", metal: "", grade: "", yearFrom: "", yearTo: "" };

function toForm(coin: CoinView): FormState {
  return {
    category: coin.category ?? "", issuingAuthority: coin.issuingAuthority ?? "",
    denomination: coin.denomination ?? "", mint: coin.mint ?? "", grade: coin.grade ?? "",
    metal: coin.metal ?? "",
    yearFrom: coin.yearFrom?.toString() ?? "", yearTo: coin.yearTo?.toString() ?? "",
  };
}

function toPayload(form: FormState): Record<string, string | number | null> {
  const payload: Record<string, string | number | null> = {};
  for (const [key] of TEXT_FIELDS) {
    const value = form[key].trim();
    payload[key] = value === "" ? null : value;
  }
  payload.grade = form.grade.trim() === "" ? null : form.grade.trim();
  const yf = form.yearFrom.trim();
  const yt = form.yearTo.trim();
  payload.yearFrom = yf === "" ? null : Number(yf);
  payload.yearTo = yt === "" ? null : Number(yt);
  return payload;
}

// ---- Main component ------------------------------------------------------

// The coin table inside one collection: the shared filter bar and table (DDR-005)
// plus this surface's own create/edit/delete. The cross-collection listing
// (AllCoinsManager) reuses the same filter bar and table, read-only.
export function CoinsManager({
  collectionId,
  collectionName,
  initial,
}: {
  collectionId: string;
  collectionName: string;
  initial: SearchResult;
}) {
  const t = useT();
  const [coins, setCoins] = useState<CoinView[]>(initial.coins);
  const [total, setTotal] = useState(initial.total);
  const [page, setPage] = useState(initial.page);
  const [pageSize, setPageSize] = useState(initial.pageSize);
  const [filters, setFilters] = useState<CoinFilterState>(EMPTY_FILTERS);
  const [facets, setFacets] = useState<CoinFacets>(EMPTY_FACETS);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);

  const { colState, toggleCol, reorderCols } = useCoinColumns(COIN_COLUMNS, COIN_COLUMNS_KEY);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const fetchFacets = useCallback(async () => {
    const res = await fetch(`/api/collections/${collectionId}/coins/facets`);
    if (res.ok) setFacets((await res.json()) as CoinFacets);
  }, [collectionId]);

  useEffect(() => { void fetchFacets(); }, [fetchFacets]);

  const load = useCallback(async (p: number, f: CoinFilterState) => {
    setLoading(true);
    setError(null);
    try {
      const sp = buildSearchParams(f, p);
      const res = await fetch(`/api/collections/${collectionId}/coins?${sp.toString()}`);
      if (!res.ok) { setError(await readError(res)); return; }
      const data = (await res.json()) as SearchResult;
      setCoins(data.coins); setTotal(data.total); setPage(data.page); setPageSize(data.pageSize);
    } catch { setError(NETWORK_ERROR); } finally { setLoading(false); }
  }, [collectionId]);

  // Debounced: any filter change re-queries from page 1.
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    const timer = setTimeout(() => void load(1, filters), 300);
    return () => clearTimeout(timer);
  }, [filters, load]);

  function resetForm() { setForm(EMPTY_FORM); setEditingId(null); setShowForm(false); }

  function startEdit(coin: CoinView) {
    setForm(toForm(coin)); setEditingId(coin.id); setShowForm(true); setError(null);
  }

  function handleSort(key: CoinSortKey) {
    setFilters((f) => ({ ...f, ...nextSort(f, key) }));
  }

  // The phone select carries field + direction, so it replaces the sort outright
  // rather than flipping it (DDR-006 addendum).
  function handleSortSelect(sort: Pick<CoinFilterState, "sortBy" | "sortDir">) {
    setFilters((f) => ({ ...f, ...sort }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault(); setError(null); setBusy(true);
    try {
      const url = editingId ? `/api/coins/${editingId}` : `/api/collections/${collectionId}/coins`;
      const response = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toPayload(form)),
      });
      if (!response.ok) { setError(await readError(response)); return; }
      const wasEditing = editingId !== null;
      resetForm();
      await Promise.all([load(wasEditing ? page : 1, filters), fetchFacets()]);
    } catch { setError(NETWORK_ERROR); } finally { setBusy(false); }
  }

  async function handleDelete(coin: CoinView) {
    setError(null); setBusy(true);
    try {
      const response = await fetch(`/api/coins/${coin.id}`, { method: "DELETE" });
      if (!response.ok) { setError(await readError(response)); return; }
      if (editingId === coin.id) resetForm();
      await Promise.all([load(page, filters), fetchFacets()]);
    } catch { setError(NETWORK_ERROR); } finally { setBusy(false); }
  }

  return (
    <section className="stack">
      {/* Toolbar: filters on the left, actions on the right (wraps on narrow screens) */}
      <div className="toolbar" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
        <CoinFilters filters={filters} facets={facets} onChange={setFilters} />
        <div className="row" style={{ gap: "0.5rem", flexShrink: 0 }}>
          {/* Column visibility + drag-reorder are pointer affordances with no touch
              equivalent, and the phone card form makes column order meaningless —
              so the picker is desktop/tablet only (DDR-006). */}
          <div className="hide-phone">
            <ColumnPicker columns={COIN_COLUMNS} colState={colState} onToggle={toggleCol} onReorder={reorderCols} />
          </div>
          <button type="button" className="btn-primary btn-sm"
            onClick={() => {
              if (showForm && !editingId) { resetForm(); }
              else { setForm(EMPTY_FORM); setEditingId(null); setShowForm(true); setError(null); }
            }}>
            {showForm && !editingId ? t("action.cancel") : t("coins.add")}
          </button>
        </div>
      </div>

      {/* Add / edit form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="card stack">
          <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}>
            {editingId ? t("coins.formEditTitle") : t("coins.formAddTitle")}
          </h2>
          <div className="row" style={{ alignItems: "flex-end", flexWrap: "wrap" }}>
            {TEXT_FIELDS.map(([key, labelKey]) => (
              <label key={key}>
                {t(labelKey)}
                <input type="text" value={form[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} />
              </label>
            ))}
            <label>
              {t("field.grade")}
              <select value={form.grade}
                onChange={(e) => setForm((f) => ({ ...f, grade: e.target.value }))}>
                <option value="">—</option>
                {COIN_GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </label>
            <label>
              {t("coins.yearFromBc")}
              <input type="number" value={form.yearFrom} style={{ width: "7rem" }}
                onChange={(e) => setForm((f) => ({ ...f, yearFrom: e.target.value }))} />
            </label>
            <label>
              {t("coins.yearToBc")}
              <input type="number" value={form.yearTo} style={{ width: "7rem" }}
                onChange={(e) => setForm((f) => ({ ...f, yearTo: e.target.value }))} />
            </label>
          </div>
          <div className="row">
            <button type="submit" className="btn-primary" disabled={busy}>
              {editingId ? t("coins.saveChanges") : t("coins.addSubmit")}
            </button>
            <button type="button" onClick={resetForm} disabled={busy}>{t("action.cancel")}</button>
          </div>
        </form>
      )}

      {error && <p className="alert">{error}</p>}

      <p className="muted" aria-live="polite" style={{ margin: 0, fontSize: "0.85rem" }}>
        {t(total === 1 ? "unit.coinOne" : "unit.coinOther", { count: total })}
        {loading && ` · ${t("status.loading")}`}
      </p>

      {coins.length === 0 ? (
        <p className="empty">
          {total === 0 ? t("coins.emptyNone") : t("coins.emptyNoMatch")}
        </p>
      ) : (
        <CoinTable
          coins={coins}
          columns={COIN_COLUMNS}
          colState={colState}
          onReorder={reorderCols}
          sortBy={filters.sortBy}
          sortDir={filters.sortDir}
          onSort={handleSort}
          onSortSelect={handleSortSelect}
          // A phone card carries the collection the coin is in, as the /coins cards
          // do — the table has no such column, since inside a collection it would
          // repeat one value down every row (DDR-006). Plain text, not a link: it
          // names the page you are already on.
          cardLead={{ labelKey: "field.collection", render: () => collectionName }}
          renderActions={(coin) => (
            <span className="row row-actions" style={{ gap: "0.4rem", justifyContent: "flex-end" }}>
              <button type="button" className="btn-sm btn-icon" onClick={() => startEdit(coin)} disabled={busy}
                aria-label={t("coins.editAria")} title={t("action.edit")}>
                <IconPencil />
              </button>
              <ConfirmButton className="btn-sm btn-danger btn-icon" disabled={busy} title={t("action.delete")}
                message={t("coins.deleteConfirm", { title: formatCoinTitle(coin) })}
                onConfirm={() => handleDelete(coin)}>
                <IconTrash /><span className="sr-only">{t("coins.deleteSr")}</span>
              </ConfirmButton>
            </span>
          )}
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
