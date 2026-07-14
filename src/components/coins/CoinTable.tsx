"use client";

import Link from "next/link";
import { useEffect, useRef, useState, memo } from "react";
import { formatYearRange, formatCoinTitle } from "@/lib/coin-format";
import { useT } from "@/components/i18n/LocaleProvider";
import type { MessageKey } from "@/lib/i18n";
import { parseSortOption, sortOptionValue } from "./coin-filters";

export type CoinView = {
  id: string;
  issuingAuthority: string | null;
  category: string | null;
  yearFrom: number | null;
  yearTo: number | null;
  denomination: string | null;
  mint: string | null;
  metal: string | null;
  grade: string | null;
  weight: string | null;
  diameter: string | null;
  // Present only on the cross-collection listing, which shows the owning collection.
  collectionId?: string;
  collectionName?: string;
};

export type SearchResult<T extends CoinView = CoinView> = {
  coins: T[];
  total: number;
  page: number;
  pageSize: number;
};

// ---- Column configuration ------------------------------------------------

export type ColumnKey =
  | "title" | "metal" | "denomination" | "year" | "category"
  | "issuingAuthority" | "grade" | "mint" | "weight" | "diameter" | "collection";

export type ColumnDef = {
  key: ColumnKey;
  labelKey: MessageKey;
  sortable: boolean;
  required: boolean;
  defaultVisible: boolean;
  /**
   * How the phone sort control names this column's two directions: text sorts read
   * "A–Z / Z–A", chronological ones "oldest / newest first". Only meaningful when
   * `sortable`; text is the default.
   */
  sortKind?: "text" | "chrono";
};
export type ColState = { key: ColumnKey; visible: boolean };

/**
 * What the list can be sorted by (the API's COIN_SORT_BY). It is the sortable
 * columns *plus* `createdAt` — the default, "recently added" — which sorts the
 * list but has no column of its own, so only the phone sort control can offer it.
 */
export type CoinSortKey = ColumnKey | "createdAt";

// Sortable keys are the ones the API accepts (COIN_SORT_BY): sorting happens in
// the database, so a column is only sortable if the query can order by it.
const BASE_COLUMNS: ColumnDef[] = [
  { key: "title",            labelKey: "field.coin",             sortable: false, required: true,  defaultVisible: true  },
  { key: "metal",            labelKey: "field.metal",            sortable: true,  required: false, defaultVisible: true  },
  { key: "denomination",     labelKey: "field.denomination",     sortable: true,  required: false, defaultVisible: true  },
  { key: "year",             labelKey: "field.year",             sortable: true,  required: false, defaultVisible: false, sortKind: "chrono" },
  { key: "category",         labelKey: "field.category",         sortable: true,  required: false, defaultVisible: false },
  { key: "issuingAuthority", labelKey: "field.issuingAuthority", sortable: false, required: false, defaultVisible: false },
  { key: "grade",            labelKey: "field.grade",            sortable: false, required: false, defaultVisible: false },
  { key: "mint",             labelKey: "field.mint",             sortable: false, required: false, defaultVisible: false },
  { key: "weight",           labelKey: "field.weight",           sortable: false, required: false, defaultVisible: false },
  { key: "diameter",         labelKey: "field.diameter",         sortable: false, required: false, defaultVisible: false },
];

/** Columns of the coin table inside one collection. */
export const COIN_COLUMNS: ColumnDef[] = BASE_COLUMNS;
export const COIN_COLUMNS_KEY = "numisbook:coin-columns-v4";

/**
 * Columns of the cross-collection listing — the same set plus the owning
 * collection. It has its own storage key: sharing one with the per-collection
 * table would let each corrupt the other's layout (DDR-005).
 */
export const ALL_COIN_COLUMNS: ColumnDef[] = [
  BASE_COLUMNS[0],
  { key: "collection", labelKey: "field.collection", sortable: false, required: false, defaultVisible: true },
  ...BASE_COLUMNS.slice(1),
];
export const ALL_COIN_COLUMNS_KEY = "numisbook:all-coin-columns-v1";

function defFor(columns: ColumnDef[], key: ColumnKey): ColumnDef {
  return columns.find((d) => d.key === key)!;
}

/** One option of the phone sort select: the column, named by the direction it sorts in. */
function sortOptionLabel(
  t: ReturnType<typeof useT>,
  def: ColumnDef,
  dir: "asc" | "desc",
): string {
  const chrono = def.sortKind === "chrono";
  const key: MessageKey = chrono
    ? dir === "asc" ? "coins.sortOldFirst" : "coins.sortNewFirst"
    : dir === "asc" ? "coins.sortAz" : "coins.sortZa";
  return t(key, { field: t(def.labelKey) });
}

function defaultColState(columns: ColumnDef[]): ColState[] {
  return columns.map((c) => ({ key: c.key, visible: c.defaultVisible }));
}

function loadColState(columns: ColumnDef[], storageKey: string): ColState[] {
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      const parsed = JSON.parse(raw) as ColState[];
      if (Array.isArray(parsed) && parsed.every((x) => typeof x === "object" && "key" in x && "visible" in x)) {
        const valid = parsed.filter((c) => columns.some((d) => d.key === c.key));
        // Add any columns introduced after the user last saved.
        const storedKeys = new Set(valid.map((c) => c.key));
        for (const def of columns) {
          if (!storedKeys.has(def.key)) valid.push({ key: def.key, visible: def.defaultVisible });
        }
        // Required columns are always visible.
        return valid.map((c) => (defFor(columns, c.key).required ? { ...c, visible: true } : c));
      }
    }
  } catch { /* ignore */ }
  return defaultColState(columns);
}

function saveColState(storageKey: string, state: ColState[]) {
  try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch { /* ignore */ }
}

/**
 * A cell's content, or `null` when the coin has no value for it. The table renders
 * null as an em-dash placeholder (a table needs its columns to line up); the phone
 * card form drops the cell entirely (a card with "Mint —" on it is just noise), so
 * emptiness has to be distinguishable rather than pre-formatted away.
 */
function cellValue(coin: CoinView, key: ColumnKey): React.ReactNode | null {
  switch (key) {
    case "title":
      return <Link href={`/coins/${coin.id}`}><strong>{formatCoinTitle(coin)}</strong></Link>;
    case "collection":
      return coin.collectionId ? (
        <Link href={`/collections/${coin.collectionId}`}>{coin.collectionName}</Link>
      ) : null;
    case "metal":            return coin.metal;
    case "denomination":     return coin.denomination;
    case "year":             return formatYearRange(coin.yearFrom, coin.yearTo);
    case "category":         return coin.category;
    case "issuingAuthority": return coin.issuingAuthority;
    case "grade":            return coin.grade;
    case "mint":             return coin.mint;
    case "weight":           return coin.weight ? `${coin.weight} g` : null;
    case "diameter":         return coin.diameter ? `${coin.diameter} mm` : null;
  }
}

// ---- Table ---------------------------------------------------------------

/**
 * Column visibility + order for a coin table, persisted per surface. Owned by the
 * manager (not the table) so the toolbar renders even when the list is empty —
 * otherwise a collector with no coins yet would have no "Add coin" button.
 */
export function useCoinColumns(columns: ColumnDef[], storageKey: string) {
  // Default is server-safe; hydrate the stored layout after mount.
  const [colState, setColState] = useState<ColState[]>(() => defaultColState(columns));
  useEffect(() => { setColState(loadColState(columns, storageKey)); }, [columns, storageKey]);

  function updateColState(next: ColState[]) {
    setColState(next);
    saveColState(storageKey, next);
  }

  function toggleCol(key: ColumnKey, checked: boolean) {
    updateColState(colState.map((c) => (c.key === key ? { ...c, visible: checked } : c)));
  }

  function reorderCols(fromKey: ColumnKey, toKey: ColumnKey) {
    if (fromKey === toKey) return;
    const next = [...colState];
    const fromIdx = next.findIndex((c) => c.key === fromKey);
    const toIdx = next.findIndex((c) => c.key === toKey);
    if (fromIdx === -1 || toIdx === -1) return;
    const [item] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, item);
    updateColState(next);
  }

  return { colState, toggleCol, reorderCols };
}

/**
 * The coin data table: sortable headers, drag-to-reorder columns, and thumbnails.
 * Row actions are injected by the owner, so the cross-collection listing can pass
 * none and stay read-only (DDR-005).
 */
export function CoinTable<T extends CoinView>({
  coins,
  columns,
  colState,
  onReorder,
  sortBy,
  sortDir,
  onSort,
  onSortSelect,
  renderActions,
}: {
  coins: T[];
  columns: ColumnDef[];
  colState: ColState[];
  onReorder: (from: ColumnKey, to: ColumnKey) => void;
  sortBy: string;
  sortDir: "asc" | "desc";
  onSort: (key: CoinSortKey) => void;
  onSortSelect: (sort: { sortBy: string; sortDir: "asc" | "desc" }) => void;
  renderActions?: (coin: T) => React.ReactNode;
}) {
  const t = useT();
  const [headerDragKey, setHeaderDragKey] = useState<ColumnKey | null>(null);
  const [headerDropKey, setHeaderDropKey] = useState<ColumnKey | null>(null);

  const visibleCols = colState.filter((c) => c.visible);
  const reorderCols = onReorder;
  const sortableCols = visibleCols.filter((c) => defFor(columns, c.key).sortable);

  return (
    <>
      {/* Phone: the header row is hidden by the card form, taking the sortable
          column headers (and with them, sorting) with it. This select is the
          replacement, and is shown only at the phone stop (DDR-006). It carries the
          direction too — each field appears once per direction — because with no
          headers to click there is nowhere else to reverse the list from. */}
      <div className="table-sort">
        <label className="row" style={{ gap: "0.4rem" }}>
          <span className="mono-label">{t("coins.sortBy")}</span>
          <select
            value={sortOptionValue(sortBy, sortDir)}
            onChange={(e) => onSortSelect(parseSortOption(e.target.value))}
          >
            {/* "createdAt" is the default sort and the only one with no column of
                its own, so it is named rather than described by direction. */}
            <option value={sortOptionValue("createdAt", "desc")}>{t("coins.sortRecent")}</option>
            <option value={sortOptionValue("createdAt", "asc")}>{t("coins.sortOldest")}</option>
            {sortableCols.flatMap((col) =>
              (["asc", "desc"] as const).map((dir) => (
                <option key={`${col.key}:${dir}`} value={sortOptionValue(col.key, dir)}>
                  {sortOptionLabel(t, defFor(columns, col.key), dir)}
                </option>
              )),
            )}
          </select>
        </label>
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th className="td-thumb">
                <span className="sr-only">{t("a11y.image")}</span>
              </th>
              {visibleCols.map((col) => {
                const def = defFor(columns, col.key);
                const isDragOver = headerDropKey === col.key && headerDragKey !== col.key;
                const thShared = {
                  draggable: true as const,
                  onDragStart: () => setHeaderDragKey(col.key),
                  onDragOver: (e: React.DragEvent) => { e.preventDefault(); setHeaderDropKey(col.key); },
                  onDrop: () => { if (headerDragKey) reorderCols(headerDragKey, col.key); setHeaderDragKey(null); setHeaderDropKey(null); },
                  onDragEnd: () => { setHeaderDragKey(null); setHeaderDropKey(null); },
                  className: [col.key === "title" ? "col-title" : "", isDragOver ? "th-drop-target" : ""].filter(Boolean).join(" ") || undefined,
                  style: { cursor: "grab", userSelect: "none" as const, whiteSpace: "nowrap" as const },
                };
                return def.sortable ? (
                  <th key={col.key} {...thShared} onClick={() => onSort(col.key)}>
                    <span className="th-drag-grip">⠿</span>
                    {t(def.labelKey)}
                    <span style={{ marginLeft: "0.3rem", opacity: sortBy === col.key ? 1 : 0.3, fontSize: "0.8em" }}>
                      {sortBy === col.key ? (sortDir === "asc" ? "↑" : "↓") : "⇅"}
                    </span>
                  </th>
                ) : (
                  <th key={col.key} {...thShared}>
                    <span className="th-drag-grip">⠿</span>
                    {t(def.labelKey)}
                  </th>
                );
              })}
              {renderActions && (
                <th>
                  <span className="sr-only">{t("a11y.actions")}</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {coins.map((coin) => (
              <tr key={coin.id}>
                <td className="td-thumb"><CoinThumb coinId={coin.id} /></td>
                {visibleCols.map((col) => {
                  const value = cellValue(coin, col.key);
                  return (
                    <td
                      key={col.key}
                      className={col.key === "title" ? "col-title" : "muted"}
                      // Drives the phone card form, which hides valueless cells
                      // rather than carrying a column of em-dashes (DDR-006).
                      data-empty={value === null || undefined}
                    >
                      {value ?? "—"}
                    </td>
                  );
                })}
                {renderActions && <td className="td-actions">{renderActions(coin)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ---- Column picker -------------------------------------------------------

export function ColumnPicker({
  columns, colState, onToggle, onReorder,
}: {
  columns: ColumnDef[];
  colState: ColState[];
  onToggle: (key: ColumnKey, checked: boolean) => void;
  onReorder: (from: ColumnKey, to: ColumnKey) => void;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [dragKey, setDragKey] = useState<ColumnKey | null>(null);
  const [dropKey, setDropKey] = useState<ColumnKey | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  const visibleCount = colState.filter((c) => c.visible).length;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button type="button" className="btn-sm" onClick={() => setOpen((v) => !v)}>
        {t("coins.columns")}{visibleCount < colState.length ? ` (${visibleCount}/${colState.length})` : ""} {open ? "▴" : "▾"}
      </button>
      {open && (
        <div className="col-picker">
          <p className="col-picker-hint">{t("coins.columnsHint")}</p>
          {colState.map((col) => {
            const def = defFor(columns, col.key);
            const isDropTarget = dropKey === col.key && dragKey !== col.key;
            return (
              <div
                key={col.key}
                className={`col-picker-item${isDropTarget ? " drag-over" : ""}${dragKey === col.key ? " dragging" : ""}`}
                draggable
                onDragStart={() => setDragKey(col.key)}
                onDragOver={(e) => { e.preventDefault(); setDropKey(col.key); }}
                onDrop={() => { if (dragKey && dragKey !== col.key) onReorder(dragKey, col.key); setDragKey(null); setDropKey(null); }}
                onDragEnd={() => { setDragKey(null); setDropKey(null); }}
              >
                <span className="col-picker-handle" title={t("coins.dragToReorder")}>⠿</span>
                <input
                  type="checkbox"
                  checked={col.visible}
                  disabled={def.required}
                  onChange={(e) => onToggle(col.key, e.target.checked)}
                  onMouseDown={(e) => e.stopPropagation()}
                />
                <span className="col-picker-label">{t(def.labelKey)}</span>
                {!col.visible && <span className="col-picker-hidden-badge">{t("coins.columnHidden")}</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---- Sub-components ------------------------------------------------------

const CoinThumb = memo(function CoinThumb({ coinId }: { coinId: string }) {
  const [imageIds, setImageIds] = useState<string[] | null>(null);

  useEffect(() => {
    fetch(`/api/coins/${coinId}/images`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: { images: { id: string }[] }) =>
        setImageIds(data.images.slice(0, 2).map((img) => img.id)),
      )
      .catch(() => setImageIds([]));
  }, [coinId]);

  // null = still loading (pulsing skeleton); [] = coin has no image (static box).
  if (imageIds === null)
    return <span className="thumb skeleton" aria-hidden />;
  if (imageIds.length === 0)
    return <span className="thumb thumb-empty" aria-hidden />;

  return (
    <span style={{ display: "flex", gap: "0.4rem" }}>
      {imageIds.map((id) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={id} src={`/api/coins/${coinId}/images/${id}?w=320`} alt="" className="thumb" />
      ))}
    </span>
  );
});
