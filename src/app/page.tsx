import Link from "next/link";
import { auth, signIn } from "@/auth";
import { resolveCurrentUser } from "@/services/auth.service";
import { listCollections } from "@/services/collection.service";
import { getPortfolioSummary } from "@/services/analytics.service";
import { formatMoney } from "@/lib/currencies";
import { t, type Locale, type MessageKey } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n/server";

function IconFolder() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 13V6a2 2 0 0 1 2-2h5l2 2h9a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2z" />
    </svg>
  );
}

function IconChart() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

// Small (16px) glyphs for the stat-card header row (label left, icon right),
// echoing the Figma stat cards.
function StatIconFolder() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 13V6a2 2 0 0 1 2-2h5l2 2h9a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2z" />
    </svg>
  );
}
function StatIconCoins() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="8" cy="8" r="6" />
      <path d="M18.09 10.37A6 6 0 1 1 10.34 18" />
      <path d="M7 6h1v4" />
      <path d="m16.71 13.88.7.71-2.82 2.82" />
    </svg>
  );
}
function StatIconTrend() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  );
}

function IconChevron() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

const FEATURES: {
  href: string;
  titleKey: MessageKey;
  bodyKey: MessageKey;
  icon: React.ReactNode;
}[] = [
  {
    href: "/collections",
    titleKey: "nav.collections",
    bodyKey: "feature.collections.body",
    icon: <IconFolder />,
  },
  {
    href: "/portfolio",
    titleKey: "nav.portfolio",
    bodyKey: "feature.portfolio.body",
    icon: <IconChart />,
  },
];

export default async function Home() {
  const session = await auth();
  const user = await resolveCurrentUser(session);
  const locale = await getRequestLocale(user?.locale);

  return (
    <main className="dashboard">
      <header className="dash-head">
        <h1>{t(locale, "app.name")}</h1>
        <p className="muted dash-sub">{t(locale, "app.tagline")}</p>
        {user && (
          <p className="dash-signed">
            {t(locale, "home.signedInAs")}{" "}
            <strong>
              {user.name ?? user.email ?? t(locale, "home.thereFallback")}
            </strong>
            .
          </p>
        )}
      </header>

      {user ? (
        <SignedInHome
          userId={user.id}
          baseCurrencyPref={user.baseCurrency}
          locale={locale}
        />
      ) : (
        <div className="card stack" style={{ textAlign: "center" }}>
          <p>{t(locale, "home.signInPrompt")}</p>
          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/" });
            }}
          >
            <button type="submit" className="btn-primary">
              {t(locale, "nav.signInWithGoogle")}
            </button>
          </form>
        </div>
      )}
    </main>
  );
}

// At-a-glance dashboard for a signed-in collector: collection/coin counts and
// total paid, then the feature cards for navigation. Reuses existing services
// (counts from listCollections per ADR-008; total paid from the portfolio
// summary) — no new data access.
async function SignedInHome({
  userId,
  baseCurrencyPref,
  locale,
}: {
  userId: string;
  baseCurrencyPref: string | null;
  locale: Locale;
}) {
  const [collections, summary] = await Promise.all([
    listCollections(userId),
    getPortfolioSummary(userId, baseCurrencyPref),
  ]);

  const collectionsCount = collections.length;
  const totalCoins = summary.totalCoins;
  const hasTotal = summary.pricedCoins > 0 && summary.baseCurrency;

  return (
    <>
      <ul className="stats">
        <li className="card stat">
          <div className="stat-head">
            <span className="stat-label">
              {t(
                locale,
                collectionsCount === 1
                  ? "home.stat.collectionsOne"
                  : "home.stat.collections",
              )}
            </span>
            <span className="stat-icon" aria-hidden="true">
              <StatIconFolder />
            </span>
          </div>
          <span className="stat-value">{collectionsCount}</span>
        </li>
        <li className="card stat">
          <div className="stat-head">
            <span className="stat-label">
              {t(
                locale,
                totalCoins === 1 ? "home.stat.coinsOne" : "home.stat.coins",
              )}
            </span>
            <span className="stat-icon" aria-hidden="true">
              <StatIconCoins />
            </span>
          </div>
          <span className="stat-value">{totalCoins}</span>
        </li>
        <li className="card stat">
          <div className="stat-head">
            <span className="stat-label">
              {hasTotal
                ? t(locale, "home.stat.totalPaid", {
                    currency: summary.baseCurrency!,
                  })
                : t(locale, "home.stat.totalPaidNone")}
            </span>
            <span className="stat-icon" aria-hidden="true">
              <StatIconTrend />
            </span>
          </div>
          <span className="stat-value is-money">
            {hasTotal
              ? formatMoney(summary.totalFinal, summary.baseCurrency!)
              : t(locale, "home.stat.noValue")}
          </span>
        </li>
      </ul>

      {collectionsCount === 0 && (
        <p className="empty">{t(locale, "home.emptyHint")}</p>
      )}

      <ul className="cards">
        {FEATURES.map((feature) => (
          <li key={feature.href}>
            <Link href={feature.href} className="card card-link">
              <div className="feature-head">
                <span className="feature-icon">{feature.icon}</span>
                <span className="feature-chevron">
                  <IconChevron />
                </span>
              </div>
              <h2>{t(locale, feature.titleKey)}</h2>
              <p className="muted" style={{ margin: 0 }}>
                {t(locale, feature.bodyKey)}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
