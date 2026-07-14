import Link from "next/link";
import { notFound } from "next/navigation";
import { auth, signIn } from "@/auth";
import { resolveCurrentUser } from "@/services/auth.service";
import { getCollection } from "@/services/collection.service";
import { searchCoins } from "@/services/coin.service";
import { NotFoundError } from "@/lib/errors";
import { CoinsManager } from "@/components/coins/CoinsManager";
import { t } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n/server";

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
  const locale = await getRequestLocale(user?.locale);

  if (!user) {
    return (
      <main className="stack">
        <h1>{t(locale, "collection.fallbackTitle")}</h1>
        <div className="card stack">
          <p>{t(locale, "collection.signInPrompt")}</p>
          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: `/collections/${id}` });
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

  const collection = await getCollection(user.id, id).catch((error) => {
    if (error instanceof NotFoundError) return null;
    throw error;
  });
  if (!collection) notFound();

  const initial = await searchCoins(user.id, id, {});

  return (
    <main className="stack">
      <nav className="crumbs" aria-label={t(locale, "breadcrumb.aria")}>
        <Link href="/collections">{t(locale, "nav.collections")}</Link>
        <span className="crumb-sep" aria-hidden="true">
          ›
        </span>
        <span className="crumb-current" aria-current="page">
          {collection.name}
        </span>
      </nav>
      <h1>{collection.name}</h1>
      <CoinsManager collectionId={id} collectionName={collection.name} initial={initial} />
    </main>
  );
}
