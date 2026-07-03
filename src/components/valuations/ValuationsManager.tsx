"use client";

import { useState } from "react";
import { readError, NETWORK_ERROR } from "@/lib/http";
import { useT } from "@/components/i18n/LocaleProvider";

// Client-side shape of a valuation. `amount` is numeric(12,2), serialized as a
// string; the timestamps arrive as ISO strings.
export type ValuationView = {
  id: string;
  amount: string;
  currency: string;
  source: string | null;
  sourceUrl: string | null;
  valuedAt: string;
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatAmount(value: string, currency: string): string {
  const n = Number(value);
  if (Number.isNaN(n)) return `${value} ${currency}`;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
    }).format(n);
  } catch {
    // Unknown currency code: fall back to a plain amount.
    return `${n.toFixed(2)} ${currency}`;
  }
}

export function ValuationsManager({
  coinId,
  initialValuations,
  className = "card stack",
  defaultCurrency = "USD",
}: {
  coinId: string;
  initialValuations: ValuationView[];
  className?: string;
  // Pre-selects the currency for a new valuation; the coin's price currency (or
  // the user's base currency) is a far better default than a hard-coded USD.
  defaultCurrency?: string;
}) {
  const t = useT();
  const [valuations, setValuations] =
    useState<ValuationView[]>(initialValuations);
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState(defaultCurrency);
  const [source, setSource] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [valuedAt, setValuedAt] = useState(today());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // History is returned most-recent-first, so the latest value is index 0.
  const latest = valuations[0];

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const response = await fetch(`/api/coins/${coinId}/valuations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(amount),
          currency,
          source: source.trim() === "" ? null : source.trim(),
          sourceUrl: sourceUrl.trim() === "" ? null : sourceUrl.trim(),
          valuedAt,
        }),
      });
      if (!response.ok) {
        setError(await readError(response));
        return;
      }
      const { valuation } = (await response.json()) as {
        valuation: ValuationView;
      };
      setValuations((prev) =>
        [valuation, ...prev].sort((a, b) => b.valuedAt.localeCompare(a.valuedAt)),
      );
      setAmount("");
      setSource("");
      setSourceUrl("");
    } catch {
      setError(NETWORK_ERROR);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={className}>
      <div className="spread">
        <h2 style={{ margin: 0 }}>{t("valuations.title")}</h2>
        {latest && (
          <span>
            {t("valuations.latest")}{" "}
            <strong>{formatAmount(latest.amount, latest.currency)}</strong>{" "}
            <span className="muted">{t("valuations.asOf", { date: latest.valuedAt.slice(0, 10) })}</span>
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="row" style={{ alignItems: "flex-end" }}>
        <label>
          {t("valuations.amount")}
          <input
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>
        <label>
          {t("valuations.currency")}
          <input
            type="text"
            maxLength={3}
            style={{ width: "5rem" }}
            value={currency}
            onChange={(e) => setCurrency(e.target.value.toUpperCase())}
          />
        </label>
        <label>
          {t("valuations.date")}
          <input
            type="date"
            max={today()}
            value={valuedAt}
            onChange={(e) => setValuedAt(e.target.value)}
          />
        </label>
        <label>
          {t("valuations.source")}
          <input
            type="text"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder={t("valuations.sourcePlaceholder")}
          />
        </label>
        <label>
          {t("valuations.link")}
          <input
            type="url"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            placeholder={t("valuations.linkPlaceholder")}
          />
        </label>
        <button
          type="submit"
          className="btn-primary"
          disabled={busy || amount.trim() === "" || currency.trim().length !== 3}
        >
          {t("action.record")}
        </button>
      </form>

      {error && <p className="alert">{error}</p>}

      {valuations.length === 0 ? (
        <p className="empty">{t("valuations.empty")}</p>
      ) : (
        <ul className="rows">
          {valuations.map((v) => (
            <li key={v.id}>
              <span className="muted">{v.valuedAt.slice(0, 10)}</span>
              <span className="grow">
                <strong>{formatAmount(v.amount, v.currency)}</strong>
                {v.source && <span className="muted"> · {v.source}</span>}
                {v.sourceUrl && (
                  <a href={v.sourceUrl} target="_blank" rel="noreferrer noopener" className="muted" style={{ marginLeft: "0.4rem" }}>
                    {t("valuations.linkLabel")}
                  </a>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
