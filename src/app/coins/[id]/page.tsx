import Link from "next/link";
import { notFound } from "next/navigation";
import { auth, signIn } from "@/auth";
import { resolveCurrentUser } from "@/services/auth.service";
import { getCoin } from "@/services/coin.service";
import { listValuations } from "@/services/valuation.service";
import { NotFoundError } from "@/lib/errors";
import { ValuationsManager } from "@/components/valuations/ValuationsManager";
import { CoinImage } from "@/components/coins/CoinImage";
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

  const valuations = await listValuations(user.id, id);
  const valuationViews = valuations.map((v) => ({
    id: v.id,
    amount: v.amount,
    currency: v.currency,
    source: v.source,
    valuedAt: v.valuedAt.toISOString(),
  }));

  const addedLabel = coin.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  return (
    <main className="stack">
      <p className="crumbs">
        <Link href={`/collections/${coin.collectionId}`}>← Collection</Link>
      </p>
      <div className="coin-overview">
        <CoinDetailsCard coin={coin} coinId={id}>
          <ValuationsManager coinId={id} initialValuations={valuationViews} className="stack" />
          <p className="muted" style={{ margin: 0, fontSize: "0.8rem" }}>Added {addedLabel}</p>
        </CoinDetailsCard>
        <CoinImage coinId={id} />
      </div>
    </main>
  );
}
