"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, memo } from "react";
import { ConfirmButton } from "@/components/ui/ConfirmButton";

export type CoinView = {
  id: string;
  name: string;
  issuingAuthority: string | null;
  category: string | null;
  year: number | null;
  denomination: string | null;
  mint: string | null;
  metal: string | null;
  grade: string | null;
};

type SearchResult = {
  coins: CoinView[];
  total: number;
  page: number;
  pageSize: number;
};

type Filters = { q: string; metal: string; category: string; year: string; sortBy: string; sortDir: "asc" | "desc" };
const EMPTY_FILTERS: Filters = { q: "", metal: "", category: "", year: "", sortBy: "createdAt", sortDir: "desc" };

// ---- Column configuration ------------------------------------------------

type ColumnKey = "name" | "metal" | "denomination" | "year" | "category" | "issuingAuthority" | "grade" | "mint";
type ColState = { key: ColumnKey; visible: boolean };

const COLUMN_DEFS: { key: ColumnKey; label: string; sortable: boolean; required: boolean; defaultVisible: boolean }[] = [
  { key: "name",             label: "Name",              sortable: true,  required: true,  defaultVisible: true  },
  { key: "metal",            label: "Metal",             sortable: true,  required: false, defaultVisible: true  },
  { key: "denomination",     label: "Denomination",      sortable: true,  required: false, defaultVisible: true  },
  { key: "year",             label: "Year",              sortable: true,  required: false, defaultVisible: false },
  { key: "category",         label: "Category",          sortable: true,  required: false, defaultVisible: false },
  { key: "issuingAuthority", label: "Issuing authority", sortable: false, required: false, defaultVisible: false },
  { key: "grade",            label: "Grade",             sortable: false, required: false, defaultVisible: false },
  { key: "mint",             label: "Mint",              sortable: false, required: false, defaultVisible: false },
];

const DEFAULT_COL_STATE: ColState[] = COLUMN_DEFS.map((c) => ({ key: c.key, visible: c.defaultVisible }));
const LS_KEY = "numisbook:coin-columns-v2";

function defFor(key: ColumnKey) {
  return COLUMN_DEFS.find((d) => d.key === key)!;
}

function loadColState(): ColState[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ColState[];
      if (Array.isArray(parsed) && parsed.every((x) => typeof x === "object" && "key" in x && "visible" in x)) {
        const valid = parsed.filter((c) => COLUMN_DEFS.some((d) => d.key === c.key));
        // Add any columns added after the user last saved
        const storedKeys = new Set(valid.map((c) => c.key));
        for (const def of COLUMN_DEFS) {
          if (!storedKeys.has(def.key)) valid.push({ key: def.key, visible: def.defaultVisible });
        }
        // Required columns are always visible
        return valid.map((c) => (defFor(c.key).required ? { ...c, visible: true } : c));
      }
    }
  } catch { /* ignore */ }
  return DEFAULT_COL_STATE.map((c) => ({ ...c }));
}

function saveColState(state: ColState[]) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch { /* ignore */ }
}

function renderCell(coin: CoinView, key: ColumnKey): React.ReactNode {
  switch (key) {
    case "name":
      return <Link href={`/coins/${coin.id}`}><strong>{coin.name}</strong></Link>;
    case "metal":            return coin.metal ?? "—";
    case "denomination":     return coin.denomination ?? "—";
    case "year":
      if (coin.year === null) return "—";
      return coin.year < 0 ? `${Math.abs(coin.year)} BC` : String(coin.year);
    case "category":         return coin.category ?? "—";
    case "issuingAuthority": return coin.issuingAuthority ?? "—";
    case "grade":            return coin.grade ?? "—";
    case "mint":             return coin.mint ?? "—";
  }
}

// ---- Form helpers --------------------------------------------------------

const TEXT_FIELDS = [
  ["name", "Name"], ["category", "Category"], ["issuingAuthority", "Issuing authority"],
  ["denomination", "Denomination"], ["mint", "Mint"], ["metal", "Metal"], ["grade", "Grade"],
] as const;

type FormState = Record<string, string>;
const EMPTY_FORM: FormState = { name: "", category: "", issuingAuthority: "", denomination: "", mint: "", metal: "", grade: "", year: "" };

function toForm(coin: CoinView): FormState {
  return {
    name: coin.name, category: coin.category ?? "", issuingAuthority: coin.issuingAuthority ?? "",
    denomination: coin.denomination ?? "", mint: coin.mint ?? "", grade: coin.grade ?? "",
    metal: coin.metal ?? "", year: coin.year?.toString() ?? "",
  };
}

function toPayload(form: FormState): Record<string, string | number | null> {
  const payload: Record<string, string | number | null> = {};
  for (const [key] of TEXT_FIELDS) {
    const value = form[key].trim();
    if (key === "name") payload.name = value;
    else payload[key] = value === "" ? null : value;
  }
  const year = form.year.trim();
  payload.year = year === "" ? null : Number(year);
  return payload;
}

async function readError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error ?? "Something went wrong";
  } catch { return "Something went wrong"; }
}

// ---- Main component ------------------------------------------------------

export function CoinsManager({ collectionId, initial }: { collectionId: string; initial: SearchResult }) {
  const [coins, setCoins] = useState<CoinView[]>(initial.coins);
  const [total, setTotal] = useState(initial.total);
  const [page, setPage] = useState(initial.page);
  const [pageSize, setPageSize] = useState(initial.pageSize);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);

  // Column order + visibility — default server-safe, hydrate from localStorage after mount
  const [colState, setColState] = useState<ColState[]>(DEFAULT_COL_STATE);
  useEffect(() => { setColState(loadColState()); }, []);

  // Drag state for table headers
  const [headerDragKey, setHeaderDragKey] = useState<ColumnKey | null>(null);
  const [headerDropKey, setHeaderDropKey] = useState<ColumnKey | null>(null);

  const visibleCols = colState.filter((c) => c.visible);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function updateColState(next: ColState[]) {
    setColState(next);
    saveColState(next);
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

  const load = useCallback(async (p: number, f: Filters) => {
    setLoading(true);
    setError(null);
    try {
      const sp = new URLSearchParams();
      if (f.q.trim()) sp.set("q", f.q.trim());
      if (f.metal.trim()) sp.set("metal", f.metal.trim());
      if (f.category.trim()) sp.set("category", f.category.trim());
      if (f.year.trim()) sp.set("year", f.year.trim());
      if (f.sortBy) sp.set("sortBy", f.sortBy);
      sp.set("sortDir", f.sortDir);
      sp.set("page", String(p));
      const res = await fetch(`/api/collections/${collectionId}/coins?${sp.toString()}`);
      if (!res.ok) { setError(await readError(res)); return; }
      const data = (await res.json()) as SearchResult;
      setCoins(data.coins); setTotal(data.total); setPage(data.page); setPageSize(data.pageSize);
    } finally { setLoading(false); }
  }, [collectionId]);

  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    const t = setTimeout(() => void load(1, filters), 300);
    return () => clearTimeout(t);
  }, [filters, load]);

  function resetForm() { setForm(EMPTY_FORM); setEditingId(null); setShowForm(false); }

  function startEdit(coin: CoinView) {
    setForm(toForm(coin)); setEditingId(coin.id); setShowForm(true); setError(null);
  }

  function handleSort(col: string) {
    setFilters((f) => ({
      ...f, sortBy: col,
      sortDir: f.sortBy === col ? (f.sortDir === "asc" ? "desc" : "asc") : "asc",
    }));
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
      await load(wasEditing ? page : 1, filters);
    } finally { setBusy(false); }
  }

  async function handleDelete(coin: CoinView) {
    setError(null); setBusy(true);
    try {
      const response = await fetch(`/api/coins/${coin.id}`, { method: "DELETE" });
      if (!response.ok) { setError(await readError(response)); return; }
      if (editingId === coin.id) resetForm();
      await load(page, filters);
    } finally { setBusy(false); }
  }

  return (
    <section className="stack">
      {/* Toolbar */}
      <div className="filters" style={{ justifyContent: "space-between", alignItems: "flex-end" }}>
        <div className="row" style={{ flexWrap: "wrap", gap: "0.5rem", flex: 1, alignItems: "flex-end" }}>
          <label>
            Search
            <input type="text" value={filters.q} placeholder="name…"
              onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))} />
          </label>
          <label>
            Metal
            <input type="text" value={filters.metal}
              onChange={(e) => setFilters((f) => ({ ...f, metal: e.target.value }))} />
          </label>
          <label>
            Category
            <input type="text" value={filters.category}
              onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))} />
          </label>
          <label>
            Year
            <input type="number" value={filters.year} style={{ width: "6rem" }}
              onChange={(e) => setFilters((f) => ({ ...f, year: e.target.value }))} />
          </label>
          <button type="button" onClick={() => setFilters(EMPTY_FILTERS)}
            disabled={filters.q === "" && filters.metal === "" && filters.category === "" && filters.year === "" && filters.sortBy === "createdAt" && filters.sortDir === "desc"}>
            Clear
          </button>
        </div>
        <div className="row" style={{ gap: "0.5rem", flexShrink: 0 }}>
          <ColumnPicker colState={colState} onToggle={toggleCol} onReorder={reorderCols} />
          <button type="button" className="btn-primary btn-sm"
            onClick={() => {
              if (showForm && !editingId) { resetForm(); }
              else { setForm(EMPTY_FORM); setEditingId(null); setShowForm(true); setError(null); }
            }}>
            {showForm && !editingId ? "Cancel" : "+ Add coin"}
          </button>
        </div>
      </div>

      {/* Add / edit form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="card stack">
          <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}>
            {editingId ? "Edit coin" : "Add a coin"}
          </h2>
          <div className="row" style={{ alignItems: "flex-end", flexWrap: "wrap" }}>
            {TEXT_FIELDS.map(([key, label]) => (
              <label key={key}>
                {label}{key === "name" ? " *" : ""}
                <input type="text" value={form[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} />
              </label>
            ))}
            <label>
              Year (− for BC)
              <input type="number" value={form.year}
                onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))} />
            </label>
          </div>
          <div className="row">
            <button type="submit" className="btn-primary" disabled={busy || form.name.trim() === ""}>
              {editingId ? "Save changes" : "Add coin"}
            </button>
            <button type="button" onClick={resetForm} disabled={busy}>Cancel</button>
          </div>
        </form>
      )}

      {error && <p className="alert">{error}</p>}

      <p className="muted" style={{ margin: 0, fontSize: "0.85rem" }}>
        {total} {total === 1 ? "coin" : "coins"}{loading && " · loading…"}
      </p>

      {coins.length === 0 ? (
        <p className="empty">
          {total === 0 ? "No coins yet. Use the button above to add one." : "No coins match the current filters."}
        </p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th className="td-thumb" />
              {visibleCols.map((col) => {
                const def = defFor(col.key);
                const isDragOver = headerDropKey === col.key && headerDragKey !== col.key;
                const thProps = {
                  key: col.key,
                  draggable: true,
                  onDragStart: () => setHeaderDragKey(col.key),
                  onDragOver: (e: React.DragEvent) => { e.preventDefault(); setHeaderDropKey(col.key); },
                  onDrop: () => { if (headerDragKey) reorderCols(headerDragKey, col.key); setHeaderDragKey(null); setHeaderDropKey(null); },
                  onDragEnd: () => { setHeaderDragKey(null); setHeaderDropKey(null); },
                  className: isDragOver ? "th-drop-target" : undefined,
                  style: { cursor: "grab", userSelect: "none" as const, whiteSpace: "nowrap" as const },
                };
                return def.sortable ? (
                  <th {...thProps} onClick={() => handleSort(col.key)}>
                    <span className="th-drag-grip">⠿</span>
                    {def.label}
                    <span style={{ marginLeft: "0.3rem", opacity: filters.sortBy === col.key ? 1 : 0.3, fontSize: "0.8em" }}>
                      {filters.sortBy === col.key ? (filters.sortDir === "asc" ? "↑" : "↓") : "⇅"}
                    </span>
                  </th>
                ) : (
                  <th {...thProps}>
                    <span className="th-drag-grip">⠿</span>
                    {def.label}
                  </th>
                );
              })}
              <th />
            </tr>
          </thead>
          <tbody>
            {coins.map((coin) => (
              <tr key={coin.id}>
                <td className="td-thumb"><CoinThumb coinId={coin.id} /></td>
                {visibleCols.map((col) => (
                  <td key={col.key} className={col.key !== "name" ? "muted" : undefined}>
                    {renderCell(coin, col.key)}
                  </td>
                ))}
                <td className="td-actions">
                  <span className="row" style={{ gap: "0.4rem", justifyContent: "flex-end" }}>
                    <button type="button" className="btn-sm" onClick={() => startEdit(coin)} disabled={busy}>Edit</button>
                    <ConfirmButton className="btn-sm btn-danger" disabled={busy}
                      message={`Delete "${coin.name}" and its valuations? This cannot be undone.`}
                      onConfirm={() => handleDelete(coin)}>
                      Delete
                    </ConfirmButton>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {totalPages > 1 && (
        <div className="pager">
          <button type="button" onClick={() => load(page - 1, filters)} disabled={loading || page <= 1}>← Prev</button>
          <span className="muted">Page {page} of {totalPages}</span>
          <button type="button" onClick={() => load(page + 1, filters)} disabled={loading || page >= totalPages}>Next →</button>
        </div>
      )}
    </section>
  );
}

// ---- Column picker -------------------------------------------------------

function ColumnPicker({
  colState, onToggle, onReorder,
}: {
  colState: ColState[];
  onToggle: (key: ColumnKey, checked: boolean) => void;
  onReorder: (from: ColumnKey, to: ColumnKey) => void;
}) {
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
        Columns{visibleCount < colState.length ? ` (${visibleCount}/${colState.length})` : ""} {open ? "▴" : "▾"}
      </button>
      {open && (
        <div className="col-picker">
          <p className="col-picker-hint">Drag ⠿ to reorder · check to show</p>
          {colState.map((col) => {
            const def = defFor(col.key);
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
                <span className="col-picker-handle" title="Drag to reorder">⠿</span>
                <input
                  type="checkbox"
                  checked={col.visible}
                  disabled={def.required}
                  onChange={(e) => onToggle(col.key, e.target.checked)}
                  onMouseDown={(e) => e.stopPropagation()}
                />
                <span className="col-picker-label">{def.label}</span>
                {!col.visible && <span className="col-picker-hidden-badge">hidden</span>}
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

  if (!imageIds?.length)
    return <span style={{ display: "block", width: 160, height: 160 }} />;

  return (
    <span style={{ display: "flex", gap: "0.4rem" }}>
      {imageIds.map((id) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={id} src={`/api/coins/${coinId}/images/${id}?w=320`} alt="" className="thumb" />
      ))}
    </span>
  );
});
