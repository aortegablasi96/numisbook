import Link from "next/link";
import { auth, signIn } from "@/auth";
import { resolveCurrentUser } from "@/services/auth.service";
import { listCollections } from "@/services/collection.service";
import { getPortfolioSummary } from "@/services/analytics.service";
import { formatMoney } from "@/lib/currencies";

const FEATURES = [
  {
    href: "/collections",
    title: "Collections",
    body: "Organize your coins into collections — add, rename, and curate.",
  },
  {
    href: "/portfolio",
    title: "Portfolio",
    body: "Aggregate value, allocation by metal and collection, and trends.",
  },
];

export default async function Home() {
  const session = await auth();
  const user = await resolveCurrentUser(session);

  return (
    <main className="stack">
      <section>
        <h1>NumisBook</h1>
        <p className="muted">Collection management for coin collectors.</p>
      </section>

      {user ? (
        <SignedInHome userId={user.id} name={user.name ?? user.email ?? "there"} baseCurrencyPref={user.baseCurrency} />
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
  name,
  baseCurrencyPref,
}: {
  userId: string;
  name: string;
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
      <p>
        Signed in as <strong>{name}</strong>.
      </p>

      <ul className="stats">
        <li className="card stat">
          <span className="stat-value">{collectionsCount}</span>
          <span className="stat-label">
            Collection{collectionsCount === 1 ? "" : "s"}
          </span>
        </li>
        <li className="card stat">
          <span className="stat-value">{totalCoins}</span>
          <span className="stat-label">Coin{totalCoins === 1 ? "" : "s"}</span>
        </li>
        <li className="card stat">
          <span className="stat-value">
            {hasTotal ? formatMoney(summary.totalFinal, summary.baseCurrency!) : "—"}
          </span>
          <span className="stat-label">
            {hasTotal
              ? `Total paid · ${summary.baseCurrency}`
              : "Total paid · no prices yet"}
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
            <Link href={feature.href} className="card card-link stack">
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
