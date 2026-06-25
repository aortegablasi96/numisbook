import Link from "next/link";
import { notFound } from "next/navigation";
import { auth, signIn } from "@/auth";
import { resolveCurrentUser } from "@/services/auth.service";
import { getCoin } from "@/services/coin.service";
import { getCollection } from "@/services/collection.service";
import { listValuations } from "@/services/valuation.service";
import { formatCoinTitle } from "@/lib/coin-format";
import { NotFoundError } from "@/lib/errors";
import { ValuationsManager } from "@/components/valuations/ValuationsManager";
import { CoinImage } from "@/components/coins/CoinImage";
import { CoinInvoices } from "@/components/coins/CoinInvoices";
import { CoinDetailsCard } from "@/components/coins/CoinDetailsCard";

// Server Component for a single coin: guards on auth + ownership, lists its
// valuation history, and hosts the record-valuation form.
export default async function CoinDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const user = await resolveCurrentUser(session);

  if (!user) {
    return (
      <main className="stack">
        <h1>Coin</h1>
        <div className="card stack">
          <p>Sign in to view this coin.</p>
          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: `/coins/${id}` });
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

  const coin = await getCoin(user.id, id).catch((error) => {
    if (error instanceof NotFoundError) return null;
    throw error;
  });
  if (!coin) notFound();

  // Collection name for the breadcrumb (owner-scoped; the coin belongs to the
  // user so this resolves, but fall back gracefully if it ever doesn't).
  const collection = await getCollection(user.id, coin.collectionId).catch(
    () => null,
  );

  const valuations = await listValuations(user.id, id);
  const valuationViews = valuations.map((v) => ({
    id: v.id,
    amount: v.amount,
    currency: v.currency,
    source: v.source,
    sourceUrl: v.sourceUrl,
    valuedAt: v.valuedAt.toISOString(),
  }));

  // ISO date to match the app's convention (valuation dates, chart axes).
  const addedLabel = coin.createdAt.toISOString().slice(0, 10);

  return (
    <main className="stack">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link href="/collections">Collections</Link>
        <span className="crumb-sep" aria-hidden="true">
          ›
        </span>
        <Link href={`/collections/${coin.collectionId}`}>
          {collection?.name ?? "Collection"}
        </Link>
        <span className="crumb-sep" aria-hidden="true">
          ›
        </span>
        <span className="crumb-current" aria-current="page">
          {formatCoinTitle(coin)}
        </span>
      </nav>
      <div className="coin-overview">
        <CoinDetailsCard coin={coin} coinId={id}>
          <ValuationsManager
            coinId={id}
            initialValuations={valuationViews}
            className="stack"
            defaultCurrency={coin.priceCurrency ?? user.baseCurrency ?? "USD"}
          />
          <p className="muted" style={{ margin: 0, fontSize: "0.8rem" }}>Added {addedLabel}</p>
        </CoinDetailsCard>
        <div className="coin-side">
          <CoinImage coinId={id} />
          <CoinInvoices coinId={id} />
        </div>
      </div>
    </main>
  );
}
