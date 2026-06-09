"use client";

import { useState } from "react";
import type { Coin } from "@/repositories/coin.repository";
import { COIN_GRADES } from "@/lib/validation/coin";
import { formatYearRange } from "@/lib/coin-format";

type CoinFields = Pick<
  Coin,
  | "name"
  | "metal"
  | "yearFrom"
  | "yearTo"
  | "denomination"
  | "mint"
  | "grade"
  | "weight"
  | "diameter"
  | "category"
  | "issuingAuthority"
  | "catalogueReferences"
  | "obverseDescription"
  | "reverseDescription"
  | "observations"
  | "auctionHouse"
  | "auctionName"
  | "auctionLot"
  | "auctionDate"
>;

function buildDetails(coin: CoinFields): { label: string; value: string }[] {
  const year = formatYearRange(coin.yearFrom, coin.yearTo);
  return [
    coin.metal && { label: "Metal", value: coin.metal },
    coin.denomination && { label: "Denomination", value: coin.denomination },
    year && { label: "Year", value: year },
    coin.mint && { label: "Mint", value: coin.mint },
    coin.grade && { label: "Grade", value: coin.grade },
    coin.weight && { label: "Weight", value: `${coin.weight} g` },
    coin.diameter && { label: "Diameter", value: `${coin.diameter} mm` },
    coin.category && { label: "Category", value: coin.category },
    coin.issuingAuthority && { label: "Issuing authority", value: coin.issuingAuthority },
    coin.catalogueReferences && { label: "Catalogue", value: coin.catalogueReferences },
    coin.auctionHouse && { label: "Auction house", value: coin.auctionHouse },
    coin.auctionName && { label: "Auction", value: coin.auctionName },
    coin.auctionLot && { label: "Lot", value: coin.auctionLot },
    coin.auctionDate && { label: "Auction date", value: coin.auctionDate },
  ].filter(Boolean) as { label: string; value: string }[];
}

// Longer free-text fields rendered as their own paragraphs below the detail list.
function buildNotes(coin: CoinFields): { label: string; value: string }[] {
  return [
    coin.obverseDescription && { label: "Obverse", value: coin.obverseDescription },
    coin.reverseDescription && { label: "Reverse", value: coin.reverseDescription },
    coin.observations && { label: "Observations", value: coin.observations },
  ].filter(Boolean) as { label: string; value: string }[];
}

type FormState = Record<string, string>;

function toForm(coin: CoinFields): FormState {
  return {
    name: coin.name,
    metal: coin.metal ?? "",
    yearFrom: coin.yearFrom !== null ? String(coin.yearFrom) : "",
    yearTo: coin.yearTo !== null ? String(coin.yearTo) : "",
    denomination: coin.denomination ?? "",
    mint: coin.mint ?? "",
    grade: coin.grade ?? "",
    weight: coin.weight ?? "",
    diameter: coin.diameter ?? "",
    category: coin.category ?? "",
    issuingAuthority: coin.issuingAuthority ?? "",
    catalogueReferences: coin.catalogueReferences ?? "",
    obverseDescription: coin.obverseDescription ?? "",
    reverseDescription: coin.reverseDescription ?? "",
    observations: coin.observations ?? "",
    auctionHouse: coin.auctionHouse ?? "",
    auctionName: coin.auctionName ?? "",
    auctionLot: coin.auctionLot ?? "",
    auctionDate: coin.auctionDate ?? "",
  };
}

function toPayload(form: FormState): Record<string, string | number | null> {
  const text = (v: string) => (v.trim() === "" ? null : v.trim());
  const int = (v: string) => (v.trim() === "" ? null : parseInt(v, 10));
  const num = (v: string) => (v.trim() === "" ? null : Number(v));
  return {
    name: form.name.trim(),
    metal: text(form.metal),
    yearFrom: int(form.yearFrom),
    yearTo: int(form.yearTo),
    denomination: text(form.denomination),
    mint: text(form.mint),
    grade: text(form.grade),
    weight: num(form.weight),
    diameter: num(form.diameter),
    category: text(form.category),
    issuingAuthority: text(form.issuingAuthority),
    catalogueReferences: text(form.catalogueReferences),
    obverseDescription: text(form.obverseDescription),
    reverseDescription: text(form.reverseDescription),
    observations: text(form.observations),
    auctionHouse: text(form.auctionHouse),
    auctionName: text(form.auctionName),
    auctionLot: text(form.auctionLot),
    auctionDate: text(form.auctionDate),
  };
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
  const [form, setForm] = useState<FormState>(() => toForm(coin));

  function startEdit() {
    setForm(toForm(current));
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
      const res = await fetch(`/api/coins/${coinId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toPayload(form)),
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
  const notes = buildNotes(current);

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
            <label className="coin-edit-label" style={{ gridColumn: "1 / -1" }}>
              Name <span style={{ color: "var(--accent)" }}>*</span>
              <input type="text" value={form.name} onChange={(e) => set("name", e.target.value)} disabled={busy} required />
            </label>
            <label className="coin-edit-label">
              Metal
              <input type="text" value={form.metal} onChange={(e) => set("metal", e.target.value)} disabled={busy} />
            </label>
            <label className="coin-edit-label">
              Denomination
              <input type="text" value={form.denomination} onChange={(e) => set("denomination", e.target.value)} disabled={busy} />
            </label>
            <label className="coin-edit-label">
              Year from (− for BC)
              <input type="number" value={form.yearFrom} onChange={(e) => set("yearFrom", e.target.value)} disabled={busy} />
            </label>
            <label className="coin-edit-label">
              Year to (− for BC)
              <input type="number" value={form.yearTo} onChange={(e) => set("yearTo", e.target.value)} disabled={busy} />
            </label>
            <label className="coin-edit-label">
              Mint
              <input type="text" value={form.mint} onChange={(e) => set("mint", e.target.value)} disabled={busy} />
            </label>
            <label className="coin-edit-label">
              Grade
              <select value={form.grade} onChange={(e) => set("grade", e.target.value)} disabled={busy}>
                <option value="">—</option>
                {COIN_GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </label>
            <label className="coin-edit-label">
              Weight (g)
              <input type="number" step="0.01" min="0" value={form.weight} onChange={(e) => set("weight", e.target.value)} disabled={busy} />
            </label>
            <label className="coin-edit-label">
              Diameter (mm)
              <input type="number" step="0.01" min="0" value={form.diameter} onChange={(e) => set("diameter", e.target.value)} disabled={busy} />
            </label>
            <label className="coin-edit-label">
              Category
              <input type="text" value={form.category} onChange={(e) => set("category", e.target.value)} disabled={busy} />
            </label>
            <label className="coin-edit-label">
              Issuing authority
              <input type="text" value={form.issuingAuthority} onChange={(e) => set("issuingAuthority", e.target.value)} disabled={busy} />
            </label>
            <label className="coin-edit-label" style={{ gridColumn: "1 / -1" }}>
              Catalogue references
              <input type="text" value={form.catalogueReferences} onChange={(e) => set("catalogueReferences", e.target.value)} disabled={busy} placeholder="e.g. RIC 123; Sear 456" />
            </label>

            <label className="coin-edit-label">
              Auction house
              <input type="text" value={form.auctionHouse} onChange={(e) => set("auctionHouse", e.target.value)} disabled={busy} />
            </label>
            <label className="coin-edit-label">
              Auction name
              <input type="text" value={form.auctionName} onChange={(e) => set("auctionName", e.target.value)} disabled={busy} />
            </label>
            <label className="coin-edit-label">
              Lot number
              <input type="text" value={form.auctionLot} onChange={(e) => set("auctionLot", e.target.value)} disabled={busy} />
            </label>
            <label className="coin-edit-label">
              Auction date
              <input type="date" value={form.auctionDate} onChange={(e) => set("auctionDate", e.target.value)} disabled={busy} />
            </label>

            <label className="coin-edit-label" style={{ gridColumn: "1 / -1" }}>
              Obverse description
              <textarea rows={2} value={form.obverseDescription} onChange={(e) => set("obverseDescription", e.target.value)} disabled={busy} />
            </label>
            <label className="coin-edit-label" style={{ gridColumn: "1 / -1" }}>
              Reverse description
              <textarea rows={2} value={form.reverseDescription} onChange={(e) => set("reverseDescription", e.target.value)} disabled={busy} />
            </label>
            <label className="coin-edit-label" style={{ gridColumn: "1 / -1" }}>
              Observations
              <textarea rows={3} value={form.observations} onChange={(e) => set("observations", e.target.value)} disabled={busy} />
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
          {notes.length > 0 && (
            <section className="coin-notes stack" style={{ gap: "0.5rem" }}>
              {notes.map(({ label, value }) => (
                <div key={label}>
                  <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.85rem" }}>{label}</p>
                  <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{value}</p>
                </div>
              ))}
            </section>
          )}
        </>
      )}
      {children}
    </div>
  );
}
