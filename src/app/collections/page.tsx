import { auth, signIn } from "@/auth";
import { resolveCurrentUser } from "@/services/auth.service";
import { listCollections } from "@/services/collection.service";
import { getCollectionCosts } from "@/services/analytics.service";
import { CollectionsManager } from "@/components/collections/CollectionsManager";
import { t } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n/server";

// Server Component: guards on auth and loads the initial list directly through
// the service. Mutations happen client-side against /api/collections.
export default async function CollectionsPage() {
  const session = await auth();
  const user = await resolveCurrentUser(session);
  const locale = await getRequestLocale(user?.locale);

  if (!user) {
    return (
      <main className="stack">
        <h1>{t(locale, "nav.collections")}</h1>
        <div className="card stack">
          <p>{t(locale, "collections.signInPrompt")}</p>
          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/collections" });
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

  // Counts come from the repository aggregate; the converted cost per collection
  // is business logic from the analytics service (ADR-008).
  const [collections, costs] = await Promise.all([
    listCollections(user.id),
    getCollectionCosts(user.id, user.baseCurrency),
  ]);
  const views = collections.map((c) => ({
    id: c.id,
    name: c.name,
    coinCount: c.coinCount,
    totalPaid: costs.totalPaid[c.id] ?? null,
    coverCoinId: c.coverCoinId,
    coverImageId: c.coverImageId,
  }));

  return (
    <main className="stack">
      <h1>{t(locale, "nav.collections")}</h1>
      <CollectionsManager initialCollections={views} baseCurrency={costs.baseCurrency} />
    </main>
  );
}
