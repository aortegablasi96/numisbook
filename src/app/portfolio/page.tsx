import { revalidatePath } from "next/cache";
import { auth, signIn } from "@/auth";
import { resolveCurrentUser } from "@/services/auth.service";
import { setBaseCurrency } from "@/services/user.service";
import { getPortfolioSummary } from "@/services/analytics.service";
import { COMMON_CURRENCIES, formatMoney as money } from "@/lib/currencies";
import { TrendChart } from "@/components/analytics/TrendChart";
import { CostBreakdownChart } from "@/components/analytics/CostBreakdownChart";

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
    <form action={update} className="row base-currency">
      <label htmlFor="baseCurrency" className="mono-label">
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
      <button type="submit" className="btn-sm">
        Apply
      </button>
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
    <main className="stack portfolio-page">
      <h1 style={{ margin: 0 }}>Portfolio</h1>

      {summary.pricedCoins === 0 || !baseCurrency ? (
        <>
          <BaseCurrencySelect selected={user.baseCurrency} />
          <p className="empty">
            No prices yet. Add coins with a price paid to see your portfolio cost,
            breakdown, and acquisition trend. (Market valuations and gain/loss come
            in a later stage.)
          </p>
        </>
      ) : (
        <>
          <section className="card portfolio-summary">
            <div className="portfolio-summary-line">
              <span className="mono-label">Total paid</span>
              <span className="portfolio-total">
                {money(summary.totalFinal, baseCurrency)}
              </span>
              <span className="muted portfolio-note">
                of which hammer {money(summary.costBreakdown.hammer, baseCurrency)} ·{" "}
                {summary.pricedCoins} of {summary.totalCoins} coin
                {summary.totalCoins === 1 ? "" : "s"} priced
                {summary.unconvertible > 0 &&
                  ` · ${summary.unconvertible} coin${
                    summary.unconvertible === 1 ? "" : "s"
                  } not converted`}
              </span>
            </div>
            <BaseCurrencySelect selected={user.baseCurrency} />
          </section>

          <div className="analytics-grid">
            <TrendChart events={summary.events} currency={baseCurrency} />
            <CostBreakdownChart events={summary.events} currency={baseCurrency} />
          </div>
        </>
      )}
    </main>
  );
}
