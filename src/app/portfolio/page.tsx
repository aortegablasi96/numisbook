import Link from "next/link";
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

// Simple dependency-free horizontal bar (width relative to the largest slice).
function Bar({ fraction }: { fraction: number }) {
  return (
    <span
      aria-hidden
      style={{
        display: "inline-block",
        height: "0.7em",
        width: `${Math.max(2, Math.round(fraction * 100))}%`,
        background: "#5b8def",
        borderRadius: 2,
        verticalAlign: "middle",
      }}
    />
  );
}

function Allocation({
  title,
  slices,
  currency,
}: {
  title: string;
  slices: AllocationSlice[];
  currency: string;
}) {
  if (slices.length === 0) return null;
  const max = Math.max(...slices.map((s) => s.total));
  return (
    <section>
      <h3>{title}</h3>
      <ul>
        {slices.map((slice) => (
          <li key={slice.label}>
            {slice.label} — {money(slice.total, currency)}{" "}
            <Bar fraction={max > 0 ? slice.total / max : 0} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function Trend({
  points,
  currency,
}: {
  points: TrendPoint[];
  currency: string;
}) {
  if (points.length === 0) return null;
  const max = Math.max(...points.map((p) => p.total));
  return (
    <section>
      <h3>Value over time</h3>
      <ul>
        {points.map((point) => (
          <li key={point.date}>
            {point.date} — {money(point.total, currency)}{" "}
            <Bar fraction={max > 0 ? point.total / max : 0} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export default async function PortfolioPage() {
  const session = await auth();
  const user = await resolveCurrentUser(session);

  if (!user) {
    return (
      <main>
        <h1>Portfolio</h1>
        <p>Sign in to view your portfolio analytics.</p>
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/portfolio" });
          }}
        >
          <button type="submit">Sign in with Google</button>
        </form>
      </main>
    );
  }

  const summary = await getPortfolioSummary(user.id);
  const { primaryCurrency } = summary;

  return (
    <main>
      <p>
        <Link href="/collections">← Collections</Link>
      </p>
      <h1>Portfolio</h1>

      <p>
        {summary.valuedCoins} of {summary.totalCoins} coin
        {summary.totalCoins === 1 ? "" : "s"} valued.
      </p>

      {summary.totalsByCurrency.length === 0 ? (
        <p>
          No valuations yet. Add coins and record valuations to see your
          portfolio value, allocation, and trend.
        </p>
      ) : (
        <>
          <section>
            <h2>Total value</h2>
            <ul>
              {summary.totalsByCurrency.map((t) => (
                <li key={t.currency}>
                  <strong>{money(t.total, t.currency)}</strong> across{" "}
                  {t.coinCount} coin{t.coinCount === 1 ? "" : "s"}
                </li>
              ))}
            </ul>
          </section>

          {primaryCurrency && (
            <>
              <p>
                <em>
                  Allocation and trend shown for {primaryCurrency} (your largest
                  holding).
                </em>
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
