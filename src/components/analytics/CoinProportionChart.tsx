import type { AcquisitionEvent } from "@/services/analytics.service";

// Single stacked bar where each segment is one coin, sized by its share of the
// total acquisition cost and ordered along the acquisition (hammer) timeline —
// oldest on the left. Segments are coloured by collection, with a legend.
// Presentational; amounts arrive pre-converted to the base currency from the
// analytics service. Only dated, convertible coins appear (they are what the
// timeline can place).

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

// Evenly-spaced hues at a fixed saturation/lightness, distinct against both the
// light and dark surfaces. One colour per collection.
const colourFor = (index: number, count: number): string =>
  `hsl(${Math.round((index * 360) / Math.max(count, 1))} 55% 52%)`;

export function CoinProportionChart({
  events,
  currency,
}: {
  events: AcquisitionEvent[];
  currency: string;
}) {
  const ordered = [...events].sort((a, b) =>
    a.date < b.date ? -1 : a.date > b.date ? 1 : 0,
  );
  const total = ordered.reduce((sum, e) => sum + e.amount, 0);
  if (ordered.length === 0 || total <= 0) return null;

  const pct = (amount: number): number => (amount / total) * 100;

  // Aggregate per collection (for colour assignment and the legend).
  const byCollection = new Map<string, { total: number; count: number }>();
  for (const e of ordered) {
    const acc = byCollection.get(e.collection) ?? { total: 0, count: 0 };
    acc.total += e.amount;
    acc.count += 1;
    byCollection.set(e.collection, acc);
  }
  // Stable colour per collection, assigned largest-first so the legend order and
  // colours line up.
  const legend = [...byCollection.entries()]
    .map(([name, acc]) => ({ name, ...acc }))
    .sort((a, b) => b.total - a.total);
  const colour = new Map(legend.map((c, i) => [c.name, colourFor(i, legend.length)]));

  return (
    <section className="card stack">
      <div className="spread">
        <h3 style={{ margin: 0 }}>Coins by share of cost</h3>
        <span className="muted">oldest first · {ordered.length} coins</span>
      </div>

      <div
        className="stack-bar"
        role="img"
        aria-label={`Each coin's share of the ${money(
          total,
          currency,
        )} total, oldest acquisition first, coloured by collection.`}
      >
        {ordered.map((e) => (
          <span
            key={e.id}
            className="stack-seg"
            style={{ width: `${pct(e.amount)}%`, background: colour.get(e.collection) }}
            title={`${e.label} — ${e.collection} — ${e.date} — ${money(
              e.amount,
              currency,
            )} (${Math.round(pct(e.amount))}%)`}
          />
        ))}
      </div>

      <ul className="legend">
        {legend.map((c) => (
          <li key={c.name}>
            <span
              className="swatch"
              style={{ background: colour.get(c.name) }}
              aria-hidden
            />
            <span className="grow">{c.name}</span>
            <span className="muted">
              {c.count} coin{c.count === 1 ? "" : "s"} · {Math.round(pct(c.total))}%
            </span>
            <strong>{money(c.total, currency)}</strong>
          </li>
        ))}
      </ul>
    </section>
  );
}
