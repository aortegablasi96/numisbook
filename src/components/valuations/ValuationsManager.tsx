"use client";

import { useState } from "react";

// Client-side shape of a valuation. `amount` is numeric(12,2), serialized as a
// string; the timestamps arrive as ISO strings.
export type ValuationView = {
  id: string;
  amount: string;
  currency: string;
  source: string | null;
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

async function readError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error ?? "Something went wrong";
  } catch {
    return "Something went wrong";
  }
}

export function ValuationsManager({
  coinId,
  initialValuations,
}: {
  coinId: string;
  initialValuations: ValuationView[];
}) {
  const [valuations, setValuations] =
    useState<ValuationView[]>(initialValuations);
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [source, setSource] = useState("");
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
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card stack">
      <div className="spread">
        <h2 style={{ margin: 0 }}>Valuations</h2>
        {latest && (
          <span>
            Latest{" "}
            <strong>{formatAmount(latest.amount, latest.currency)}</strong>{" "}
            <span className="muted">as of {latest.valuedAt.slice(0, 10)}</span>
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="row" style={{ alignItems: "flex-end" }}>
        <label>
          Amount *
          <input
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>
        <label>
          Currency *
          <input
            type="text"
            maxLength={3}
            style={{ width: "5rem" }}
            value={currency}
            onChange={(e) => setCurrency(e.target.value.toUpperCase())}
          />
        </label>
        <label>
          Date *
          <input
            type="date"
            max={today()}
            value={valuedAt}
            onChange={(e) => setValuedAt(e.target.value)}
          />
        </label>
        <label>
          Source
          <input
            type="text"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="auction, estimate…"
          />
        </label>
        <button
          type="submit"
          className="btn-primary"
          disabled={busy || amount.trim() === "" || currency.trim().length !== 3}
        >
          Record
        </button>
      </form>

      {error && <p className="alert">{error}</p>}

      {valuations.length === 0 ? (
        <p className="empty">No valuations yet. Record the first one above.</p>
      ) : (
        <ul className="rows">
          {valuations.map((v) => (
            <li key={v.id}>
              <span className="muted">{v.valuedAt.slice(0, 10)}</span>
              <span className="grow">
                <strong>{formatAmount(v.amount, v.currency)}</strong>
                {v.source && <span className="muted"> · {v.source}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
