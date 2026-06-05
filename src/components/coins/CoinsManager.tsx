"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ConfirmButton } from "@/components/ui/ConfirmButton";

// Client-side shape of a coin (dates are serialized away by the Server Component).
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

type Filters = { q: string; metal: string; category: string; year: string };

const EMPTY_FILTERS: Filters = { q: "", metal: "", category: "", year: "" };

const TEXT_FIELDS = [
  ["name", "Name"],
  ["category", "Category"],
  ["issuingAuthority", "Issuing authority"],
  ["denomination", "Denomination"],
  ["mint", "Mint"],
  ["metal", "Metal"],
  ["grade", "Grade"],
] as const;

type FormState = Record<string, string>;

const EMPTY_FORM: FormState = {
  name: "",
  category: "",
  issuingAuthority: "",
  denomination: "",
  mint: "",
  metal: "",
  grade: "",
  year: "",
};

function toForm(coin: CoinView): FormState {
  return {
    name: coin.name,
    category: coin.category ?? "",
    issuingAuthority: coin.issuingAuthority ?? "",
    denomination: coin.denomination ?? "",
    mint: coin.mint ?? "",
    grade: coin.grade ?? "",
    metal: coin.metal ?? "",
    year: coin.year?.toString() ?? "",
  };
}

// Build the request payload: send a field only when the user provided it. Empty
// text becomes null (clear); year is sent as a number.
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
  } catch {
    return "Something went wrong";
  }
}

function summary(coin: CoinView): string {
  return [
    coin.category,
    coin.issuingAuthority,
    coin.year !== null ? (coin.year < 0 ? `${-coin.year} BC` : `${coin.year}`) : null,
    coin.denomination,
    coin.metal,
    coin.grade,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function CoinsManager({
  collectionId,
  initial,
}: {
  collectionId: string;
  initial: SearchResult;
}) {
  const [coins, setCoins] = useState<CoinView[]>(initial.coins);
  const [total, setTotal] = useState(initial.total);
  const [page, setPage] = useState(initial.page);
  const [pageSize, setPageSize] = useState(initial.pageSize);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const load = useCallback(
    async (p: number, f: Filters) => {
      setLoading(true);
      setError(null);
      try {
        const sp = new URLSearchParams();
        if (f.q.trim()) sp.set("q", f.q.trim());
        if (f.metal.trim()) sp.set("metal", f.metal.trim());
        if (f.category.trim()) sp.set("category", f.category.trim());
        if (f.year.trim()) sp.set("year", f.year.trim());
        sp.set("page", String(p));
        const res = await fetch(
          `/api/collections/${collectionId}/coins?${sp.toString()}`,
        );
        if (!res.ok) {
          setError(await readError(res));
          return;
        }
        const data = (await res.json()) as SearchResult;
        setCoins(data.coins);
        setTotal(data.total);
        setPage(data.page);
        setPageSize(data.pageSize);
      } finally {
        setLoading(false);
      }
    },
    [collectionId],
  );

  // Debounced reload when filters change; reset to the first page. Skip the very
  // first render — the initial result is already provided by the server.
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const t = setTimeout(() => void load(1, filters), 300);
    return () => clearTimeout(t);
  }, [filters, load]);

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingId(null);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const url = editingId
        ? `/api/coins/${editingId}`
        : `/api/collections/${collectionId}/coins`;
      const response = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toPayload(form)),
      });
      if (!response.ok) {
        setError(await readError(response));
        return;
      }
      const wasEditing = editingId !== null;
      resetForm();
      // Refresh: stay on the page when editing, jump to the first when adding.
      await load(wasEditing ? page : 1, filters);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(coin: CoinView) {
    setError(null);
    setBusy(true);
    try {
      const response = await fetch(`/api/coins/${coin.id}`, { method: "DELETE" });
      if (!response.ok) {
        setError(await readError(response));
        return;
      }
      if (editingId === coin.id) resetForm();
      await load(page, filters);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="stack">
      <form onSubmit={handleSubmit} className="card stack">
        <h2>{editingId ? "Edit coin" : "Add a coin"}</h2>
        <div className="row" style={{ alignItems: "flex-end" }}>
          {TEXT_FIELDS.map(([key, label]) => (
            <label key={key}>
              {label}
              {key === "name" ? " *" : ""}
              <input
                type="text"
                value={form[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
              />
            </label>
          ))}
          <label>
            Year (− for BC)
            <input
              type="number"
              value={form.year}
              onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))}
            />
          </label>
        </div>
        <div className="row">
          <button
            type="submit"
            className="btn-primary"
            disabled={busy || form.name.trim() === ""}
          >
            {editingId ? "Save changes" : "Add coin"}
          </button>
          {editingId && (
            <button type="button" onClick={resetForm} disabled={busy}>
              Cancel
            </button>
          )}
        </div>
      </form>

      {error && <p className="alert">{error}</p>}

      <div className="filters">
        <label>
          Search
          <input
            type="text"
            value={filters.q}
            placeholder="name…"
            onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
          />
        </label>
        <label>
          Metal
          <input
            type="text"
            value={filters.metal}
            onChange={(e) => setFilters((f) => ({ ...f, metal: e.target.value }))}
          />
        </label>
        <label>
          Category
          <input
            type="text"
            value={filters.category}
            onChange={(e) =>
              setFilters((f) => ({ ...f, category: e.target.value }))
            }
          />
        </label>
        <label>
          Year
          <input
            type="number"
            value={filters.year}
            style={{ width: "6rem" }}
            onChange={(e) => setFilters((f) => ({ ...f, year: e.target.value }))}
          />
        </label>
        <button
          type="button"
          onClick={() => setFilters(EMPTY_FILTERS)}
          disabled={
            filters.q === "" &&
            filters.metal === "" &&
            filters.category === "" &&
            filters.year === ""
          }
        >
          Clear
        </button>
      </div>

      <h2>
        Coins ({total}){loading && <span className="muted"> · loading…</span>}
      </h2>
      {coins.length === 0 ? (
        <p className="empty">
          {total === 0 ? "No coins match." : "No coins on this page."}
        </p>
      ) : (
        <ul className="rows">
          {coins.map((coin) => (
            <li key={coin.id}>
              <CoinThumb coinId={coin.id} />
              <span className="grow">
                <Link href={`/coins/${coin.id}`}>
                  <strong>{coin.name}</strong>
                </Link>
                {summary(coin) && (
                  <span className="muted"> — {summary(coin)}</span>
                )}
              </span>
              <button
                type="button"
                className="btn-sm"
                onClick={() => {
                  setForm(toForm(coin));
                  setEditingId(coin.id);
                }}
                disabled={busy}
              >
                Edit
              </button>
              <ConfirmButton
                className="btn-sm btn-danger"
                disabled={busy}
                message={`Delete "${coin.name}" and its valuations? This cannot be undone.`}
                onConfirm={() => handleDelete(coin)}
              >
                Delete
              </ConfirmButton>
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 && (
        <div className="pager">
          <button
            type="button"
            onClick={() => load(page - 1, filters)}
            disabled={loading || page <= 1}
          >
            ← Prev
          </button>
          <span className="muted">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => load(page + 1, filters)}
            disabled={loading || page >= totalPages}
          >
            Next →
          </button>
        </div>
      )}
    </section>
  );
}

// A small coin thumbnail that hides itself when the coin has no image (the
// owner-scoped endpoint 404s, firing onError).
function CoinThumb({ coinId }: { coinId: string }) {
  const [show, setShow] = useState(true);
  if (!show) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/api/coins/${coinId}/image`}
      alt=""
      className="thumb"
      onError={() => setShow(false)}
    />
  );
}
