import { auth, signIn } from "@/auth";
import { resolveCurrentUser } from "@/services/auth.service";
import {
  getPortfolioSummary,
  type AllocationSlice,
  type TrendPoint,
} from "@/services/analytics.service";

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

// Dependency-free horizontal bar (width relative to the largest slice).
function Bar({ fraction }: { fraction: number }) {
  return (
    <span className="bar-track" aria-hidden>
      <span
        className="bar-fill"
        style={{ width: `${Math.max(2, Math.round(fraction * 100))}%` }}
      />
    </span>
  );
}

function MetricRows({
  title,
  rows,
  currency,
}: {
  title: string;
  rows: { label: string; total: number }[];
  currency: string;
}) {
  if (rows.length === 0) return null;
  const max = Math.max(...rows.map((r) => r.total));
  return (
    <section className="card stack">
      <h3>{title}</h3>
      <ul className="rows">
        {rows.map((row) => (
          <li key={row.label}>
            <span className="grow">{row.label}</span>
            <Bar fraction={max > 0 ? row.total / max : 0} />
            <strong>{money(row.total, currency)}</strong>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Allocation(props: {
  title: string;
  slices: AllocationSlice[];
  currency: string;
}) {
  return (
    <MetricRows title={props.title} rows={props.slices} currency={props.currency} />
  );
}

function Trend({ points, currency }: { points: TrendPoint[]; currency: string }) {
  return (
    <MetricRows
      title="Value over time"
      rows={points.map((p) => ({ label: p.date, total: p.total }))}
      currency={currency}
    />
  );
}

export default async function PortfolioPage() {
  const session = await auth();
  const user = await resolveCurrentUser(session);

  if (!user) {
    return (
      <main className="stack">
        <h1>Portfolio</h1>
        <div className="card stack">
          <p>Sign in to view your portfolio analytics.</p>
          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/portfolio" });
            }}
          >
            <button type="submit" className="btn-primary">
              Sign in with Google
            </button>
          </form>
        </div>
      </main>
    );
  }

  const summary = await getPortfolioSummary(user.id);
  const { primaryCurrency } = summary;

  return (
    <main className="stack">
      <div className="spread">
        <h1 style={{ margin: 0 }}>Portfolio</h1>
        <span className="muted">
          {summary.valuedCoins} of {summary.totalCoins} coin
          {summary.totalCoins === 1 ? "" : "s"} valued
        </span>
      </div>

      {summary.totalsByCurrency.length === 0 ? (
        <p className="empty">
          No valuations yet. Add coins and record valuations to see your
          portfolio value, allocation, and trend.
        </p>
      ) : (
        <>
          <section className="card stack">
            <h2 style={{ margin: 0 }}>Total value</h2>
            <ul className="rows">
              {summary.totalsByCurrency.map((t) => (
                <li key={t.currency}>
                  <strong className="grow">{money(t.total, t.currency)}</strong>
                  <span className="muted">
                    {t.coinCount} coin{t.coinCount === 1 ? "" : "s"}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {primaryCurrency && (
            <>
              <p className="muted">
                Allocation and trend shown for{" "}
                <span className="badge">{primaryCurrency}</span> (your largest
                holding).
              </p>
              <Allocation
                title="Allocation by metal"
                slices={summary.allocationByMetal}
                currency={primaryCurrency}
              />
              <Allocation
                title="Allocation by collection"
                slices={summary.allocationByCollection}
                currency={primaryCurrency}
              />
              <Trend points={summary.trend} currency={primaryCurrency} />
            </>
          )}
        </>
      )}
    </main>
  );
}
