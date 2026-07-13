import { auth, signIn } from "@/auth";
import { resolveCurrentUser } from "@/services/auth.service";
import { searchAllCoins } from "@/services/coin.service";
import { AllCoinsManager } from "@/components/coins/AllCoinsManager";
import { t } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n/server";

// Server Component for the cross-collection coin listing: guards on auth, then
// loads the user's first page of coins across every collection they own. The
// listing is read-only (DDR-005) — coins are created inside a collection.
export default async function AllCoinsPage() {
  const session = await auth();
  const user = await resolveCurrentUser(session);
  const locale = await getRequestLocale(user?.locale);

  if (!user) {
    return (
      <main className="stack">
        <h1>{t(locale, "coins.allTitle")}</h1>
        <div className="card stack">
          <p>{t(locale, "collection.signInPrompt")}</p>
          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/coins" });
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

  const initial = await searchAllCoins(user.id, {});

  return (
    <main className="stack">
      <h1>{t(locale, "coins.allTitle")}</h1>
      <AllCoinsManager initial={initial} />
    </main>
  );
}
