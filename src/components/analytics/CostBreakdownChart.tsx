import type { CostBreakdown } from "@/services/analytics.service";

// Single portfolio-wide stacked bar splitting total cost into hammer, premium,
// shipping and "final only" (coins entered with just a final price, not split).
// The four sum to the total paid. Presentational; figures come pre-converted to
// the base currency from the analytics service.

const SEGMENTS = [
  { key: "hammer", label: "Hammer", cls: "seg-hammer" },
  { key: "premium", label: "Premium", cls: "seg-premium" },
  { key: "shipping", label: "Shipping", cls: "seg-shipping" },
  { key: "unsplit", label: "Final only", cls: "seg-unsplit" },
] as const;

function money(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export function CostBreakdownChart({
  breakdown,
  currency,
}: {
  breakdown: CostBreakdown;
  currency: string;
}) {
  const parts = SEGMENTS.map((s) => ({ ...s, value: breakdown[s.key] }));
  const total = parts.reduce((sum, p) => sum + p.value, 0);
  if (total <= 0) return null;

  const shown = parts.filter((p) => p.value > 0);
  const pct = (value: number): number => (value / total) * 100;

  return (
    <section className="card stack">
      <h3 style={{ margin: 0 }}>Cost breakdown</h3>

      <div
        className="stack-bar"
        role="img"
        aria-label={shown
          .map((p) => `${p.label} ${money(p.value, currency)}`)
          .join(", ")}
      >
        {shown.map((p) => (
          <span
            key={p.key}
            className={`stack-seg ${p.cls}`}
            style={{ width: `${pct(p.value)}%` }}
            title={`${p.label}: ${money(p.value, currency)}`}
          />
        ))}
      </div>

      <ul className="legend">
        {shown.map((p) => (
          <li key={p.key}>
            <span className={`swatch ${p.cls}`} aria-hidden />
            <span className="grow">{p.label}</span>
            <span className="muted">{Math.round(pct(p.value))}%</span>
            <strong>{money(p.value, currency)}</strong>
          </li>
        ))}
      </ul>
    </section>
  );
}
