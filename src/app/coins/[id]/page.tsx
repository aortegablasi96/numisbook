import Link from "next/link";
import { notFound } from "next/navigation";
import { auth, signIn } from "@/auth";
import { resolveCurrentUser } from "@/services/auth.service";
import { getCoin } from "@/services/coin.service";
import { listValuations } from "@/services/valuation.service";
import { NotFoundError } from "@/lib/errors";
import { ValuationsManager } from "@/components/valuations/ValuationsManager";
import { CoinImage } from "@/components/coins/CoinImage";

function formatYear(year: number): string {
  return year < 0 ? `${Math.abs(year)} BC` : String(year);
}

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

  const details: { label: string; value: string }[] = [
    coin.metal && { label: "Metal", value: coin.metal },
    coin.denomination && { label: "Denomination", value: coin.denomination },
    coin.year !== null && coin.year !== undefined && { label: "Year", value: formatYear(coin.year) },
    coin.mint && { label: "Mint", value: coin.mint },
    coin.grade && { label: "Grade", value: coin.grade },
    coin.category && { label: "Category", value: coin.category },
    coin.issuingAuthority && { label: "Issuing authority", value: coin.issuingAuthority },
    { label: "Added", value: coin.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) },
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <main className="stack">
      <p className="crumbs">
        <Link href={`/collections/${coin.collectionId}`}>← Collection</Link>
      </p>
      <div className="coin-overview">
        <div className="card coin-overview-left">
          <h1 style={{ margin: 0 }}>{coin.name}</h1>
          {details.length > 0 && (
            <section className="coin-details">
              <dl>
                {details.map(({ label, value }) => (
                  <div key={label} className="coin-details-row">
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
          <ValuationsManager coinId={id} initialValuations={valuationViews} className="stack" />
        </div>
        <CoinImage coinId={id} />
      </div>
    </main>
  );
}
