import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { auth, signIn } from "@/auth";
import { resolveCurrentUser } from "@/services/auth.service";
import { setBaseCurrency, setLocale } from "@/services/user.service";
import { COMMON_CURRENCIES } from "@/lib/currencies";
import {
  LOCALES,
  LOCALE_LABELS,
  LOCALE_COOKIE,
  t,
  type Locale,
} from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n/server";
import { ProfileForm } from "@/components/settings/ProfileForm";
import { DeleteAccountSection } from "@/components/settings/DeleteAccountSection";

export const metadata = { title: "Settings · NumisBook" };

const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // one year

// Preferences: language + base currency, each a Server Component form reusing
// the framework-agnostic services (setLocale / setBaseCurrency). Rendered
// between Profile and the Danger zone.
function PreferencesSection({
  activeLocale,
  localePref,
  baseCurrency,
}: {
  activeLocale: Locale;
  localePref: string | null;
  baseCurrency: string | null;
}) {
  async function updateLocale(formData: FormData) {
    "use server";
    const session = await auth();
    const user = await resolveCurrentUser(session);
    if (!user) return;
    const resolved = await setLocale(user.id, String(formData.get("locale") ?? ""));
    // Keep the cookie in sync so SSR / signed-out visits agree with the
    // preference (ADR-014). Clearing the preference clears the cookie.
    const store = await cookies();
    if (resolved) {
      store.set(LOCALE_COOKIE, resolved, {
        path: "/",
        maxAge: LOCALE_COOKIE_MAX_AGE,
        sameSite: "lax",
      });
    } else {
      store.delete(LOCALE_COOKIE);
    }
    // Re-render the whole tree (header + page) in the new language.
    revalidatePath("/", "layout");
  }

  async function updateBaseCurrency(formData: FormData) {
    "use server";
    const session = await auth();
    const user = await resolveCurrentUser(session);
    if (!user) return;
    await setBaseCurrency(user.id, String(formData.get("baseCurrency") ?? ""));
    revalidatePath("/settings");
  }

  return (
    <section className="card stack">
      <h2 style={{ margin: 0 }}>{t(activeLocale, "settings.preferences.heading")}</h2>

      <form action={updateLocale} className="field">
        <label htmlFor="locale" className="mono-label">
          {t(activeLocale, "settings.language.label")}
        </label>
        <div className="row">
          <select id="locale" name="locale" defaultValue={localePref ?? ""}>
            <option value="">{t(activeLocale, "settings.language.systemDefault")}</option>
            {LOCALES.map((code) => (
              <option key={code} value={code}>
                {LOCALE_LABELS[code]}
              </option>
            ))}
          </select>
          <button type="submit" className="btn-sm">
            {t(activeLocale, "action.apply")}
          </button>
        </div>
        <p className="muted" style={{ margin: 0 }}>
          {t(activeLocale, "settings.language.help")}
        </p>
      </form>

      <form action={updateBaseCurrency} className="field">
        <label htmlFor="baseCurrency" className="mono-label">
          {t(activeLocale, "settings.baseCurrency.label")}
        </label>
        <div className="row">
          <select id="baseCurrency" name="baseCurrency" defaultValue={baseCurrency ?? ""}>
            <option value="">{t(activeLocale, "settings.baseCurrency.auto")}</option>
            {COMMON_CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <button type="submit" className="btn-sm">
            {t(activeLocale, "action.apply")}
          </button>
        </div>
        <p className="muted" style={{ margin: 0 }}>
          {t(activeLocale, "settings.baseCurrency.help")}
        </p>
      </form>
    </section>
  );
}

export default async function SettingsPage() {
  const session = await auth();
  const user = await resolveCurrentUser(session);
  const locale = await getRequestLocale(user?.locale);

  if (!user) {
    return (
      <main className="stack">
        <h1>{t(locale, "settings.title")}</h1>
        <div className="card stack">
          <p>{t(locale, "settings.signInPrompt")}</p>
          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/settings" });
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

  return (
    <main className="stack settings-page">
      <h1 style={{ margin: 0 }}>{t(locale, "settings.title")}</h1>
      <ProfileForm initialName={user.name ?? ""} email={user.email} />
      <PreferencesSection
        activeLocale={locale}
        localePref={user.locale}
        baseCurrency={user.baseCurrency}
      />
      <DeleteAccountSection />
    </main>
  );
}
