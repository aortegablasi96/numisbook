"use client";

import { useState } from "react";
import type { Coin } from "@/repositories/coin.repository";
import { COIN_GRADES } from "@/lib/validation/coin";
import { formatCoinTitle, formatYearRange } from "@/lib/coin-format";
import { readError, NETWORK_ERROR } from "@/lib/http";
import { IconPencil } from "@/components/ui/icons";
import { useT } from "@/components/i18n/LocaleProvider";
import type { MessageKey } from "@/lib/i18n";

type Translate = ReturnType<typeof useT>;

type CoinFields = Pick<
  Coin,
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
  | "pedigree"
  | "auctionHouse"
  | "auctionName"
  | "auctionLot"
  | "auctionDate"
  | "hammerPrice"
  | "auctionPremium"
  | "shippingCost"
  | "taxCost"
  | "finalPrice"
  | "priceCurrency"
>;

// Format a numeric-string amount, using the coin's price currency when known.
function formatMoney(amount: string | null, currency: string | null): string | null {
  if (!amount) return null;
  const n = Number(amount);
  if (Number.isNaN(n)) return currency ? `${amount} ${currency}` : amount;
  if (currency) {
    try {
      return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(n);
    } catch {
      /* unknown currency code: fall through to a plain amount */
    }
  }
  return n.toFixed(2);
}

// "Obtained from" line: "{Auction House}, {Auction Name}, {Auction Lot} ({date})".
function formatAuctionLine(coin: CoinFields): string | null {
  const head = [coin.auctionHouse, coin.auctionName, coin.auctionLot]
    .map((s) => s?.trim())
    .filter(Boolean)
    .join(", ");
  const date = coin.auctionDate?.trim();
  if (head && date) return `${head} (${date})`;
  return head || date || null;
}

type Block = { label: string; value: string; multiline?: boolean };

// The detail card's elements, in the order defined by the roadmap. Missing
// fields are dropped. Title + characteristics are rendered separately above.
function buildBlocks(coin: CoinFields, t: Translate): Block[] {
  const pricePaid = formatMoney(coin.finalPrice, coin.priceCurrency);
  const breakdown = [
    coin.hammerPrice && `${t("coinDetail.breakdown.hammer")} ${formatMoney(coin.hammerPrice, coin.priceCurrency)}`,
    coin.auctionPremium && `${t("coinDetail.breakdown.premium")} ${formatMoney(coin.auctionPremium, coin.priceCurrency)}`,
    coin.taxCost && `${t("coinDetail.breakdown.tax")} ${formatMoney(coin.taxCost, coin.priceCurrency)}`,
    coin.shippingCost && `${t("coinDetail.breakdown.shipping")} ${formatMoney(coin.shippingCost, coin.priceCurrency)}`,
  ].filter(Boolean);

  return [
    coin.obverseDescription && { label: t("coinDetail.block.obverse"), value: coin.obverseDescription, multiline: true },
    coin.reverseDescription && { label: t("coinDetail.block.reverse"), value: coin.reverseDescription, multiline: true },
    coin.catalogueReferences && { label: t("coinDetail.catalogueReferences"), value: coin.catalogueReferences },
    coin.observations && { label: t("coinDetail.observations"), value: coin.observations, multiline: true },
    coin.pedigree && { label: t("coinDetail.pedigree"), value: coin.pedigree, multiline: true },
    pricePaid && {
      label: t("coinDetail.block.pricePaid"),
      value: breakdown.length ? `${pricePaid} (${breakdown.join(" + ")})` : pricePaid,
    },
    formatAuctionLine(coin) && { label: t("coinDetail.block.obtainedFrom"), value: formatAuctionLine(coin)! },
  ].filter(Boolean) as Block[];
}

type FormState = Record<string, string>;

function toForm(coin: CoinFields): FormState {
  return {
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
    pedigree: coin.pedigree ?? "",
    auctionHouse: coin.auctionHouse ?? "",
    auctionName: coin.auctionName ?? "",
    auctionLot: coin.auctionLot ?? "",
    auctionDate: coin.auctionDate ?? "",
    hammerPrice: coin.hammerPrice ?? "",
    auctionPremium: coin.auctionPremium ?? "",
    shippingCost: coin.shippingCost ?? "",
    taxCost: coin.taxCost ?? "",
    finalPrice: coin.finalPrice ?? "",
    priceCurrency: coin.priceCurrency ?? "",
  };
}

function toPayload(form: FormState): Record<string, string | number | null> {
  const text = (v: string) => (v.trim() === "" ? null : v.trim());
  const int = (v: string) => (v.trim() === "" ? null : parseInt(v, 10));
  const num = (v: string) => (v.trim() === "" ? null : Number(v));
  return {
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
    pedigree: text(form.pedigree),
    auctionHouse: text(form.auctionHouse),
    auctionName: text(form.auctionName),
    auctionLot: text(form.auctionLot),
    auctionDate: text(form.auctionDate),
    // hammer/premium/shipping form the partition; finalPrice is recomputed from
    // them server-side when any is present, otherwise the direct value is used.
    hammerPrice: num(form.hammerPrice),
    auctionPremium: num(form.auctionPremium),
    shippingCost: num(form.shippingCost),
    taxCost: num(form.taxCost),
    finalPrice: num(form.finalPrice),
    priceCurrency: text(form.priceCurrency),
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
  const t = useT();
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
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/coins/${coinId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toPayload(form)),
      });
      if (!res.ok) {
        setError(await readError(res, t("coinDetail.saveFailed")));
        return;
      }
      const { coin: updated } = (await res.json()) as { coin: CoinFields };
      setCurrent(updated);
      setEditing(false);
    } catch {
      setError(NETWORK_ERROR);
    } finally {
      setBusy(false);
    }
  }

  // When the hammer/premium/shipping/tax partition is entered, the final price
  // is their sum (computed server-side); reflect that in a read-only field.
  const hasComponent =
    form.hammerPrice.trim() !== "" ||
    form.auctionPremium.trim() !== "" ||
    form.shippingCost.trim() !== "" ||
    form.taxCost.trim() !== "";
  const componentsSum = (
    (Number(form.hammerPrice) || 0) +
    (Number(form.auctionPremium) || 0) +
    (Number(form.shippingCost) || 0) +
    (Number(form.taxCost) || 0)
  ).toFixed(2);
  const finalPriceValue = hasComponent ? componentsSum : form.finalPrice;

  const title = formatCoinTitle(current);
  const blocks = buildBlocks(current, t);
  const years = formatYearRange(current.yearFrom, current.yearTo);
  // Key attributes as compact tiles (Figma attribute grid). Only present fields
  // are shown; descriptions/price/auction stay in the labelled blocks below.
  const attributes = [
    current.category && ["field.category", current.category],
    current.metal && ["field.metal", current.metal],
    current.denomination && ["field.denomination", current.denomination],
    current.grade && ["field.condition", current.grade],
    current.weight && ["field.weight", `${current.weight} g`],
    current.diameter && ["field.diameter", `${current.diameter} mm`],
    current.mint && ["field.mint", current.mint],
    years && ["field.year", years],
  ].filter(Boolean) as [MessageKey, string][];

  return (
    <div className="coin-overview-left">
      {editing ? (
        <form onSubmit={handleSave} className="card stack" style={{ gap: "var(--space-3)" }}>
          <div className="head-row" style={{ alignItems: "center" }}>
            <h2 className="mono-label" style={{ margin: 0, fontSize: "0.8rem" }}>{t("coins.formEditTitle")}</h2>
            <div className="row" style={{ gap: "var(--space-2)" }}>
              <button type="button" className="btn-sm" onClick={() => setEditing(false)} disabled={busy}>
                {t("action.cancel")}
              </button>
              <button type="submit" className="btn-sm btn-primary" disabled={busy}>
                {busy ? t("action.saving") : t("action.save")}
              </button>
            </div>
          </div>

          {error && <p className="alert" style={{ margin: 0 }}>{error}</p>}

          <div className="coin-edit-grid">
            <label className="coin-edit-label">
              {t("field.category")}
              <input type="text" value={form.category} onChange={(e) => set("category", e.target.value)} disabled={busy} />
            </label>
            <label className="coin-edit-label">
              {t("field.issuingAuthority")}
              <input type="text" value={form.issuingAuthority} onChange={(e) => set("issuingAuthority", e.target.value)} disabled={busy} />
            </label>
            <label className="coin-edit-label">
              {t("field.denomination")}
              <input type="text" value={form.denomination} onChange={(e) => set("denomination", e.target.value)} disabled={busy} />
            </label>
            <label className="coin-edit-label">
              {t("field.mint")}
              <input type="text" value={form.mint} onChange={(e) => set("mint", e.target.value)} disabled={busy} />
            </label>
            <label className="coin-edit-label">
              {t("coinDetail.yearFromBcFull")}
              <input type="number" value={form.yearFrom} onChange={(e) => set("yearFrom", e.target.value)} disabled={busy} />
            </label>
            <label className="coin-edit-label">
              {t("coinDetail.yearToBcFull")}
              <input type="number" value={form.yearTo} onChange={(e) => set("yearTo", e.target.value)} disabled={busy} />
            </label>
            <label className="coin-edit-label">
              {t("field.metal")}
              <input type="text" value={form.metal} onChange={(e) => set("metal", e.target.value)} disabled={busy} />
            </label>
            <label className="coin-edit-label">
              {t("coinDetail.conditionGrade")}
              <select value={form.grade} onChange={(e) => set("grade", e.target.value)} disabled={busy}>
                <option value="">—</option>
                {COIN_GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </label>
            <label className="coin-edit-label">
              {t("coinDetail.weightG")}
              <input type="number" step="0.01" min="0" value={form.weight} onChange={(e) => set("weight", e.target.value)} disabled={busy} />
            </label>
            <label className="coin-edit-label">
              {t("coinDetail.diameterMm")}
              <input type="number" step="0.01" min="0" value={form.diameter} onChange={(e) => set("diameter", e.target.value)} disabled={busy} />
            </label>
            <label className="coin-edit-label" style={{ gridColumn: "1 / -1" }}>
              {t("coinDetail.catalogueReferences")}
              <input type="text" value={form.catalogueReferences} onChange={(e) => set("catalogueReferences", e.target.value)} disabled={busy} placeholder={t("coinDetail.cataloguePlaceholder")} />
            </label>

            <label className="coin-edit-label" style={{ gridColumn: "1 / -1" }}>
              {t("coinDetail.obverseDescription")}
              <textarea rows={2} value={form.obverseDescription} onChange={(e) => set("obverseDescription", e.target.value)} disabled={busy} />
            </label>
            <label className="coin-edit-label" style={{ gridColumn: "1 / -1" }}>
              {t("coinDetail.reverseDescription")}
              <textarea rows={2} value={form.reverseDescription} onChange={(e) => set("reverseDescription", e.target.value)} disabled={busy} />
            </label>
            <label className="coin-edit-label" style={{ gridColumn: "1 / -1" }}>
              {t("coinDetail.observations")}
              <textarea rows={3} value={form.observations} onChange={(e) => set("observations", e.target.value)} disabled={busy} />
            </label>
            <label className="coin-edit-label" style={{ gridColumn: "1 / -1" }}>
              {t("coinDetail.pedigree")}
              <textarea rows={3} value={form.pedigree} onChange={(e) => set("pedigree", e.target.value)} disabled={busy} placeholder={t("coinDetail.pedigreePlaceholder")} />
            </label>

            <label className="coin-edit-label">
              {t("coinDetail.auctionHouse")}
              <input type="text" value={form.auctionHouse} onChange={(e) => set("auctionHouse", e.target.value)} disabled={busy} />
            </label>
            <label className="coin-edit-label">
              {t("coinDetail.auctionName")}
              <input type="text" value={form.auctionName} onChange={(e) => set("auctionName", e.target.value)} disabled={busy} />
            </label>
            <label className="coin-edit-label">
              {t("coinDetail.lotNumber")}
              <input type="text" value={form.auctionLot} onChange={(e) => set("auctionLot", e.target.value)} disabled={busy} />
            </label>
            <label className="coin-edit-label">
              {t("coinDetail.auctionDate")}
              <input type="date" value={form.auctionDate} onChange={(e) => set("auctionDate", e.target.value)} disabled={busy} />
            </label>

            <label className="coin-edit-label">
              {t("coinDetail.hammerPrice")}
              <input type="number" step="0.01" min="0" value={form.hammerPrice} onChange={(e) => set("hammerPrice", e.target.value)} disabled={busy} />
            </label>
            <label className="coin-edit-label">
              {t("coinDetail.auctionPremium")}
              <input type="number" step="0.01" min="0" value={form.auctionPremium} onChange={(e) => set("auctionPremium", e.target.value)} disabled={busy} />
            </label>
            <label className="coin-edit-label">
              {t("coinDetail.taxCost")}
              <input type="number" step="0.01" min="0" value={form.taxCost} onChange={(e) => set("taxCost", e.target.value)} disabled={busy} />
            </label>
            <label className="coin-edit-label">
              {t("coinDetail.shippingCost")}
              <input type="number" step="0.01" min="0" value={form.shippingCost} onChange={(e) => set("shippingCost", e.target.value)} disabled={busy} />
            </label>
            <label className="coin-edit-label">
              {t("coinDetail.finalPrice")} {hasComponent && <span style={{ color: "var(--muted)" }}>{t("coinDetail.finalPriceSum")}</span>}
              <input
                type="number"
                step="0.01"
                min="0"
                value={finalPriceValue}
                onChange={(e) => set("finalPrice", e.target.value)}
                disabled={busy || hasComponent}
              />
            </label>
            <label className="coin-edit-label">
              {t("coinDetail.priceCurrency")}
              <input type="text" maxLength={3} value={form.priceCurrency} onChange={(e) => set("priceCurrency", e.target.value.toUpperCase())} disabled={busy} placeholder="EUR" />
            </label>
          </div>
        </form>
      ) : (
        <>
          <div className="head-row">
            <h1 className="coin-detail-title">{title}</h1>
            <button
              type="button"
              className="btn-sm btn-icon coin-edit-btn"
              onClick={startEdit}
              style={{ flexShrink: 0 }}
              aria-label={t("coins.editAria")}
              title={t("action.edit")}
            >
              <IconPencil size={20} />
            </button>
          </div>
          {attributes.length > 0 && (
            <dl className="attr-grid">
              {attributes.map(([label, value]) => (
                <div key={label} className="attr-tile">
                  <dt>{t(label)}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          )}
          {blocks.length > 0 && (
            <div className="coin-notes">
              {blocks.map(({ label, value, multiline }) => (
                <section key={label} className="card coin-note">
                  <p className="mono-label">{label}</p>
                  <p style={{ whiteSpace: multiline ? "pre-wrap" : undefined }}>{value}</p>
                </section>
              ))}
            </div>
          )}
        </>
      )}
      {children && <div className="card coin-valuations">{children}</div>}
    </div>
  );
}
