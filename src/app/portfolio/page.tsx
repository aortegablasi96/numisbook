import { revalidatePath } from "next/cache";
import { auth, signIn } from "@/auth";
import { resolveCurrentUser } from "@/services/auth.service";
import { setBaseCurrency } from "@/services/user.service";
import { getPortfolioSummary } from "@/services/analytics.service";
import { COMMON_CURRENCIES } from "@/lib/currencies";
import { TrendChart } from "@/components/analytics/TrendChart";
import { CostBreakdownChart } from "@/components/analytics/CostBreakdownChart";

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

function BaseCurrencySelect({ selected }: { selected: string | null }) {
  async function update(formData: FormData) {
    "use server";
    const session = await auth();
    const user = await resolveCurrentUser(session);
    if (!user) return;
    await setBaseCurrency(user.id, String(formData.get("baseCurrency") ?? ""));
    revalidatePath("/portfolio");
  }
  return (
    <form action={update} className="row">
      <label htmlFor="baseCurrency" className="muted">
        Base currency
      </label>
      <select id="baseCurrency" name="baseCurrency" defaultValue={selected ?? ""}>
        <option value="">Auto (largest holding)</option>
        {COMMON_CURRENCIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <button type="submit">Apply</button>
    </form>
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

  const summary = await getPortfolioSummary(user.id, user.baseCurrency);
  const { baseCurrency } = summary;

  return (
    <main className="stack">
      <div className="spread">
        <h1 style={{ margin: 0 }}>Portfolio</h1>
        <span className="muted">
          {summary.pricedCoins} of {summary.totalCoins} coin
          {summary.totalCoins === 1 ? "" : "s"} priced
        </span>
      </div>

      <BaseCurrencySelect selected={user.baseCurrency} />

      {summary.pricedCoins === 0 || !baseCurrency ? (
        <p className="empty">
          No prices yet. Add coins with a price paid to see your portfolio cost,
          breakdown, and acquisition trend. (Market valuations and gain/loss come
          in a later stage.)
        </p>
      ) : (
        <>
          <section className="card stack">
            <h2 style={{ margin: 0 }}>Total paid</h2>
            <strong style={{ fontSize: "1.6rem" }}>
              {money(summary.totalFinal, baseCurrency)}
            </strong>
            <span className="muted">
              of which hammer {money(summary.costBreakdown.hammer, baseCurrency)} —
              converted to <span className="badge">{baseCurrency}</span> using ECB
              rates.
              {summary.unconvertible > 0 &&
                ` ${summary.unconvertible} coin${
                  summary.unconvertible === 1 ? "" : "s"
                } could not be converted.`}
            </span>
          </section>

          <CostBreakdownChart events={summary.events} currency={baseCurrency} />

          <TrendChart events={summary.events} currency={baseCurrency} />
        </>
      )}
    </main>
  );
}
