import { revalidatePath } from "next/cache";
import { auth, signIn } from "@/auth";
import { resolveCurrentUser } from "@/services/auth.service";
import { setBaseCurrency } from "@/services/user.service";
import { getPortfolioSummary } from "@/services/analytics.service";
import { assertWritable } from "@/lib/demo";
import { COMMON_CURRENCIES, formatMoney as money } from "@/lib/currencies";
import { TrendChart } from "@/components/analytics/TrendChart";
import { CostBreakdownChart } from "@/components/analytics/CostBreakdownChart";
import { t, type Locale } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n/server";

function BaseCurrencySelect({
  selected,
  locale,
}: {
  selected: string | null;
  locale: Locale;
}) {
  // The base currency lives on the shared demo row, so a demo visitor changing it
  // would re-price every other visitor's portfolio (ADR-016). The select is not
  // rendered for a demo session; this refuses a forged submission.
  async function update(formData: FormData) {
    "use server";
    const session = await auth();
    const user = await resolveCurrentUser(session);
    if (!user) return;
    assertWritable(user);
    await setBaseCurrency(user.id, String(formData.get("baseCurrency") ?? ""));
    revalidatePath("/portfolio");
  }
  return (
    <form action={update} className="row base-currency">
      <label htmlFor="baseCurrency" className="mono-label">
        {t(locale, "settings.baseCurrency.label")}
      </label>
      <select id="baseCurrency" name="baseCurrency" defaultValue={selected ?? ""}>
        <option value="">{t(locale, "settings.baseCurrency.auto")}</option>
        {COMMON_CURRENCIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <button type="submit" className="btn-sm">
        {t(locale, "action.apply")}
      </button>
    </form>
  );
}

export default async function PortfolioPage() {
  const session = await auth();
  const user = await resolveCurrentUser(session);
  const locale = await getRequestLocale(user?.locale);

  if (!user) {
    return (
      <main className="stack">
        <h1>{t(locale, "nav.portfolio")}</h1>
        <div className="card stack">
          <p>{t(locale, "portfolio.signInPrompt")}</p>
          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/portfolio" });
            }}
          >
            <button type="submit" className="btn-primary">
              {t(locale, "nav.signInWithGoogle")}
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
      <h1 style={{ margin: 0 }}>{t(locale, "nav.portfolio")}</h1>

      {/* The base currency lives on the shared demo row, so changing it would
          re-price every other visitor's portfolio. Not offered in the demo
          (ADR-016) — the Server Action refuses it too. */}
      {summary.pricedCoins === 0 || !baseCurrency ? (
        <>
          {!user.isDemo && (
            <BaseCurrencySelect selected={user.baseCurrency} locale={locale} />
          )}
          <p className="empty">{t(locale, "portfolio.empty")}</p>
        </>
      ) : (
        <>
          <section className="card portfolio-summary">
            <div className="portfolio-summary-line">
              <span className="mono-label">{t(locale, "portfolio.totalPaid")}</span>
              <span className="portfolio-total">
                {money(summary.totalFinal, baseCurrency)}
              </span>
              <span className="muted portfolio-note">
                {t(locale, "portfolio.ofWhichHammer", {
                  amount: money(summary.costBreakdown.hammer, baseCurrency),
                })}
                {" · "}
                {t(
                  locale,
                  summary.totalCoins === 1
                    ? "portfolio.pricedOne"
                    : "portfolio.pricedOther",
                  { priced: summary.pricedCoins, total: summary.totalCoins },
                )}
                {summary.unconvertible > 0 &&
                  ` · ${t(
                    locale,
                    summary.unconvertible === 1
                      ? "portfolio.notConvertedOne"
                      : "portfolio.notConvertedOther",
                    { count: summary.unconvertible },
                  )}`}
              </span>
            </div>
            {!user.isDemo && (
              <BaseCurrencySelect selected={user.baseCurrency} locale={locale} />
            )}
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
