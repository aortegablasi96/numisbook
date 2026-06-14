import type { AcquisitionEvent } from "@/services/analytics.service";

// Per-coin cost breakdown: one vertical column per coin, ordered left→right by
// acquisition (hammer) date — oldest first. Each column is stacked into its
// price-paid components (hammer / premium / shipping), or a single "Final only"
// segment for coins entered with just a final price. Column height is the coin's
// total cost. Dependency-free SVG (mirrors TrendChart); presentational — amounts
// arrive pre-converted to the base currency from the analytics service, and only
// dated, convertible coins are present (they are what the date axis can place).

const SEGMENTS = [
  { key: "hammer", label: "Hammer", cls: "bar-hammer", swatch: "seg-hammer" },
  { key: "premium", label: "Premium", cls: "bar-premium", swatch: "seg-premium" },
  { key: "shipping", label: "Shipping", cls: "bar-shipping", swatch: "seg-shipping" },
  { key: "unsplit", label: "Final only", cls: "bar-unsplit", swatch: "seg-unsplit" },
] as const;

const W = 720;
const H = 240;
const PAD = { top: 16, right: 16, bottom: 28, left: 64 };
const INNER_W = W - PAD.left - PAD.right;
const INNER_H = H - PAD.top - PAD.bottom;

function money(amount: number, currency: string, compact = false): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      ...(compact ? { maximumFractionDigits: 0 } : {}),
    }).format(amount);
  } catch {
    return `${compact ? Math.round(amount) : amount.toFixed(2)} ${currency}`;
  }
}

export function CostBreakdownChart({
  events,
  currency,
}: {
  events: AcquisitionEvent[];
  currency: string;
}) {
  const ordered = [...events].sort((a, b) =>
    a.date < b.date ? -1 : a.date > b.date ? 1 : 0,
  );
  // Each column's height is its components' sum (so the stack and the axis agree).
  const stackTotal = (e: AcquisitionEvent): number =>
    e.hammer + e.premium + e.shipping + e.unsplit;
  const maxTotal = ordered.reduce((m, e) => Math.max(m, stackTotal(e)), 0);
  if (ordered.length === 0 || maxTotal <= 0) return null;

  // Component totals across the shown coins, for the legend.
  const totals = SEGMENTS.map((s) => ({
    ...s,
    value: ordered.reduce((sum, e) => sum + e[s.key], 0),
  })).filter((t) => t.value > 0);
  const grandTotal = totals.reduce((sum, t) => sum + t.value, 0);

  const slot = INNER_W / ordered.length;
  const barW = Math.max(Math.min(slot * 0.7, 48), 1);
  const baseline = PAD.top + INNER_H;
  const h = (value: number): number => (value / maxTotal) * INNER_H;

  const label =
    `Cost paid per coin in ${currency}, oldest acquisition first, ` +
    `stacked by hammer, premium and shipping. ${ordered.length} coins, ` +
    `${money(grandTotal, currency)} total.`;

  return (
    <section className="card stack">
      <div className="spread">
        <h3 style={{ margin: 0 }}>Cost breakdown</h3>
        <span className="muted">per coin · oldest first · {ordered.length} coins</span>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        role="img"
        aria-label={label}
        style={{ height: "auto", display: "block" }}
      >
        <text x={PAD.left - 8} y={PAD.top + 4} textAnchor="end" className="chart-axis">
          {money(maxTotal, currency, true)}
        </text>
        <text x={PAD.left - 8} y={baseline} textAnchor="end" className="chart-axis">
          {money(0, currency, true)}
        </text>
        <text x={PAD.left} y={H - 8} textAnchor="start" className="chart-axis">
          {ordered[0].date}
        </text>
        {ordered.length > 1 && (
          <text x={W - PAD.right} y={H - 8} textAnchor="end" className="chart-axis">
            {ordered[ordered.length - 1].date}
          </text>
        )}

        {ordered.map((e, i) => {
          const cx = PAD.left + slot * (i + 0.5);
          let top = baseline; // stack upward from the baseline
          return (
            <g key={e.id}>
              <title>{`${e.label} — ${e.collection} — ${e.date} — ${money(
                stackTotal(e),
                currency,
              )}`}</title>
              {SEGMENTS.map((s) => {
                const value = e[s.key];
                if (value <= 0) return null;
                const segH = h(value);
                top -= segH;
                return (
                  <rect
                    key={s.key}
                    x={cx - barW / 2}
                    y={top}
                    width={barW}
                    height={segH}
                    className={`bar-seg ${s.cls}`}
                  />
                );
              })}
            </g>
          );
        })}
      </svg>

      <ul className="legend">
        {totals.map((t) => (
          <li key={t.key}>
            <span className={`swatch ${t.swatch}`} aria-hidden />
            <span className="grow">{t.label}</span>
            <span className="muted">
              {Math.round((t.value / grandTotal) * 100)}%
            </span>
            <strong>{money(t.value, currency)}</strong>
          </li>
        ))}
      </ul>
    </section>
  );
}
