"use client";

import { useState } from "react";
import type { Coin } from "@/repositories/coin.repository";

type CoinFields = Pick<
  Coin,
  "name" | "metal" | "year" | "denomination" | "mint" | "grade" | "category" | "issuingAuthority"
>;

function formatYear(year: number): string {
  return year < 0 ? `${Math.abs(year)} BC` : String(year);
}

function buildDetails(coin: CoinFields): { label: string; value: string }[] {
  return [
    coin.metal && { label: "Metal", value: coin.metal },
    coin.denomination && { label: "Denomination", value: coin.denomination },
    coin.year !== null && coin.year !== undefined && { label: "Year", value: formatYear(coin.year) },
    coin.mint && { label: "Mint", value: coin.mint },
    coin.grade && { label: "Grade", value: coin.grade },
    coin.category && { label: "Category", value: coin.category },
    coin.issuingAuthority && { label: "Issuing authority", value: coin.issuingAuthority },
  ].filter(Boolean) as { label: string; value: string }[];
}

export function CoinDetailsCard({
  coin,
  coinId,
  children,
}: {
  coin: CoinFields;
  coinId: string;
  children?: React.ReactNode;
}) {
  const [current, setCurrent] = useState<CoinFields>(coin);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state mirrors CoinFields with year as string for controlled input
  const [form, setForm] = useState<{
    name: string;
    metal: string;
    year: string;
    denomination: string;
    mint: string;
    grade: string;
    category: string;
    issuingAuthority: string;
  }>({
    name: coin.name,
    metal: coin.metal ?? "",
    year: coin.year !== null && coin.year !== undefined ? String(coin.year) : "",
    denomination: coin.denomination ?? "",
    mint: coin.mint ?? "",
    grade: coin.grade ?? "",
    category: coin.category ?? "",
    issuingAuthority: coin.issuingAuthority ?? "",
  });

  function startEdit() {
    setForm({
      name: current.name,
      metal: current.metal ?? "",
      year: current.year !== null && current.year !== undefined ? String(current.year) : "",
      denomination: current.denomination ?? "",
      mint: current.mint ?? "",
      grade: current.grade ?? "",
      category: current.category ?? "",
      issuingAuthority: current.issuingAuthority ?? "",
    });
    setError(null);
    setEditing(true);
  }

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Name is required.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const body = {
        name: form.name.trim(),
        metal: form.metal.trim() || null,
        year: form.year.trim() !== "" ? parseInt(form.year, 10) : null,
        denomination: form.denomination.trim() || null,
        mint: form.mint.trim() || null,
        grade: form.grade.trim() || null,
        category: form.category.trim() || null,
        issuingAuthority: form.issuingAuthority.trim() || null,
      };
      const res = await fetch(`/api/coins/${coinId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Save failed. Please try again.");
        return;
      }
      const { coin: updated } = (await res.json()) as { coin: CoinFields };
      setCurrent(updated);
      setEditing(false);
    } finally {
      setBusy(false);
    }
  }

  const details = buildDetails(current);

  return (
    <div className="card coin-overview-left">
      {editing ? (
        <form onSubmit={handleSave} className="stack" style={{ gap: "0.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
            <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 600, color: "var(--muted)" }}>Edit coin</h2>
            <div className="row" style={{ gap: "0.5rem" }}>
              <button type="button" className="btn-sm" onClick={() => setEditing(false)} disabled={busy}>
                Cancel
              </button>
              <button type="submit" className="btn-sm btn-primary" disabled={busy}>
                {busy ? "Saving…" : "Save"}
              </button>
            </div>
          </div>

          {error && <p className="alert" style={{ margin: 0 }}>{error}</p>}

          <div className="coin-edit-grid">
            <label className="coin-edit-label">
              Name <span style={{ color: "var(--accent)" }}>*</span>
              <input
                type="text"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                disabled={busy}
                required
              />
            </label>
            <label className="coin-edit-label">
              Metal
              <input type="text" value={form.metal} onChange={(e) => set("metal", e.target.value)} disabled={busy} />
            </label>
            <label className="coin-edit-label">
              Year
              <input
                type="number"
                value={form.year}
                onChange={(e) => set("year", e.target.value)}
                disabled={busy}
                placeholder="e.g. −27 for BC"
              />
            </label>
            <label className="coin-edit-label">
              Denomination
              <input type="text" value={form.denomination} onChange={(e) => set("denomination", e.target.value)} disabled={busy} />
            </label>
            <label className="coin-edit-label">
              Mint
              <input type="text" value={form.mint} onChange={(e) => set("mint", e.target.value)} disabled={busy} />
            </label>
            <label className="coin-edit-label">
              Grade
              <input type="text" value={form.grade} onChange={(e) => set("grade", e.target.value)} disabled={busy} />
            </label>
            <label className="coin-edit-label">
              Category
              <input type="text" value={form.category} onChange={(e) => set("category", e.target.value)} disabled={busy} />
            </label>
            <label className="coin-edit-label" style={{ gridColumn: "1 / -1" }}>
              Issuing authority
              <input type="text" value={form.issuingAuthority} onChange={(e) => set("issuingAuthority", e.target.value)} disabled={busy} />
            </label>
          </div>
        </form>
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.5rem" }}>
            <h1 style={{ margin: 0 }}>{current.name}</h1>
            <button type="button" className="btn-sm" onClick={startEdit} style={{ flexShrink: 0 }}>
              Edit
            </button>
          </div>
          {details.length > 0 && (
            <section className="coin-details">
              <dl>
                {details.map(({ label, value }) => (
                  <div key={label} className="coin-details-row">
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
        </>
      )}
      {children}
    </div>
  );
}
