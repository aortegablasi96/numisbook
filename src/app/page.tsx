import Link from "next/link";
import { auth, signIn } from "@/auth";
import { resolveCurrentUser } from "@/services/auth.service";
import { listCollections } from "@/services/collection.service";
import { getPortfolioSummary } from "@/services/analytics.service";
import { formatMoney } from "@/lib/currencies";

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

const FEATURES = [
  {
    href: "/collections",
    title: "Collections",
    body: "Organize your coins into collections — add, rename, and curate.",
    icon: <IconFolder />,
  },
  {
    href: "/portfolio",
    title: "Portfolio",
    body: "Aggregate value, allocation by metal and collection, and trends.",
    icon: <IconChart />,
  },
];

export default async function Home() {
  const session = await auth();
  const user = await resolveCurrentUser(session);

  return (
    <main className="dashboard">
      <header className="dash-head">
        <h1>NumisBook</h1>
        <p className="muted dash-sub">Collection management for coin collectors.</p>
        {user && (
          <p className="dash-signed">
            Signed in as <strong>{user.name ?? user.email ?? "there"}</strong>.
          </p>
        )}
      </header>

      {user ? (
        <SignedInHome userId={user.id} baseCurrencyPref={user.baseCurrency} />
      ) : (
        <div className="card stack">
          <p>Sign in to start cataloguing and valuing your coin collection.</p>
          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/" });
            }}
          >
            <button type="submit" className="btn-primary">
              Sign in with Google
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
}: {
  userId: string;
  baseCurrencyPref: string | null;
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
              Collection{collectionsCount === 1 ? "" : "s"}
            </span>
            <span className="stat-icon" aria-hidden="true">
              <StatIconFolder />
            </span>
          </div>
          <span className="stat-value">{collectionsCount}</span>
        </li>
        <li className="card stat">
          <div className="stat-head">
            <span className="stat-label">Coin{totalCoins === 1 ? "" : "s"}</span>
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
                ? `Total paid · ${summary.baseCurrency}`
                : "Total paid · no prices yet"}
            </span>
            <span className="stat-icon" aria-hidden="true">
              <StatIconTrend />
            </span>
          </div>
          <span className="stat-value is-money">
            {hasTotal ? formatMoney(summary.totalFinal, summary.baseCurrency!) : "—"}
          </span>
        </li>
      </ul>

      {collectionsCount === 0 && (
        <p className="empty">
          Start by creating a collection, then add coins to it.
        </p>
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
              <h2>{feature.title}</h2>
              <p className="muted" style={{ margin: 0 }}>
                {feature.body}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
