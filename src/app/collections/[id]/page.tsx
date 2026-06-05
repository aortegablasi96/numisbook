import Link from "next/link";
import { notFound } from "next/navigation";
import { auth, signIn } from "@/auth";
import { resolveCurrentUser } from "@/services/auth.service";
import { getCollection } from "@/services/collection.service";
import { listCoins } from "@/services/coin.service";
import { NotFoundError } from "@/lib/errors";
import { CoinsManager } from "@/components/coins/CoinsManager";

// Server Component for a single collection: guards on auth + ownership, then
// loads its coins. Mutations happen client-side against the coin API.
export default async function CollectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const user = await resolveCurrentUser(session);

  if (!user) {
    return (
      <main>
        <h1>Collection</h1>
        <p>Sign in to view this collection.</p>
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: `/collections/${id}` });
          }}
        >
          <button type="submit">Sign in with Google</button>
        </form>
      </main>
    );
  }

  const collection = await getCollection(user.id, id).catch((error) => {
    if (error instanceof NotFoundError) return null;
    throw error;
  });
  if (!collection) notFound();

  const coins = await listCoins(user.id, id);

  return (
    <main>
      <p>
        <Link href="/collections">← Collections</Link>
      </p>
      <h1>{collection.name}</h1>
      <CoinsManager collectionId={id} initialCoins={coins} />
    </main>
  );
}
