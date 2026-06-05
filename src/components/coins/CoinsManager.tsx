"use client";

import Link from "next/link";
import { useState } from "react";

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
    metal: coin.metal ?? "",
    grade: coin.grade ?? "",
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
  initialCoins,
}: {
  collectionId: string;
  initialCoins: CoinView[];
}) {
  const [coins, setCoins] = useState<CoinView[]>(initialCoins);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
      const { coin } = (await response.json()) as { coin: CoinView };
      setCoins((prev) =>
        editingId
          ? prev.map((c) => (c.id === coin.id ? coin : c))
          : [coin, ...prev],
      );
      resetForm();
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(coin: CoinView) {
    if (!window.confirm(`Delete "${coin.name}"? This cannot be undone.`)) return;
    setError(null);
    setBusy(true);
    try {
      const response = await fetch(`/api/coins/${coin.id}`, { method: "DELETE" });
      if (!response.ok) {
        setError(await readError(response));
        return;
      }
      setCoins((prev) => prev.filter((c) => c.id !== coin.id));
      if (editingId === coin.id) resetForm();
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

      <h2>Coins ({coins.length})</h2>
      {coins.length === 0 ? (
        <p className="empty">No coins yet. Add your first one above.</p>
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
              <button
                type="button"
                className="btn-sm btn-danger"
                onClick={() => handleDelete(coin)}
                disabled={busy}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
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
