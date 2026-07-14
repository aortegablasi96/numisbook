import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { auth, signIn } from "@/auth";
import { resolveCurrentUser } from "@/services/auth.service";
import {
  parseLocalePreference,
  parseThemePreference,
  setBaseCurrency,
  setLocale,
  setTheme,
} from "@/services/user.service";
import { assertWritable } from "@/lib/demo";
import { COMMON_CURRENCIES } from "@/lib/currencies";
import {
  LOCALES,
  LOCALE_LABELS,
  LOCALE_COOKIE,
  t,
  type Locale,
} from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n/server";
import { THEME_COOKIE, type ResolvedTheme, type Theme } from "@/lib/theme";
import { getRequestTheme } from "@/lib/theme/server";
import { ProfileForm } from "@/components/settings/ProfileForm";
import { ThemeToggle } from "@/components/settings/ThemeToggle";
import { DeleteAccountSection } from "@/components/settings/DeleteAccountSection";

export const metadata = { title: "Settings · NumisBook" };

const PREF_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // one year

// Preferences: language, theme + base currency, each a Server Component form
// reusing the framework-agnostic services (setLocale / setTheme /
// setBaseCurrency). Rendered between Profile and the Danger zone.
function PreferencesSection({
  activeLocale,
  localePref,
  resolvedTheme,
  baseCurrency,
  isDemo,
}: {
  activeLocale: Locale;
  localePref: string | null;
  resolvedTheme: ResolvedTheme;
  baseCurrency: string | null;
  isDemo: boolean;
}) {
  // Language and theme stay usable in the demo (ADR-016). Both preferences are
  // cookie-backed, and the demo user's `locale`/`theme` columns are deliberately
  // NULL, so resolution falls through to the visitor's own cookie. Writing the
  // cookie but skipping the row therefore gives each demo visitor a private
  // preference — where writing the row would change the theme for every other
  // stranger browsing the shared tenant at the same time.
  async function updateLocale(formData: FormData) {
    "use server";
    const session = await auth();
    const user = await resolveCurrentUser(session);
    if (!user) return;
    const requested = String(formData.get("locale") ?? "");
    const resolved = user.isDemo
      ? parseLocalePreference(requested)
      : await setLocale(user.id, requested);
    // Keep the cookie in sync so SSR / signed-out visits agree with the
    // preference (ADR-014). Clearing the preference clears the cookie.
    const store = await cookies();
    if (resolved) {
      store.set(LOCALE_COOKIE, resolved, {
        path: "/",
        maxAge: PREF_COOKIE_MAX_AGE,
        sameSite: "lax",
      });
    } else {
      store.delete(LOCALE_COOKIE);
    }
    // Re-render the whole tree (header + page) in the new language.
    revalidatePath("/", "layout");
  }

  async function updateTheme(theme: Theme) {
    "use server";
    const session = await auth();
    const user = await resolveCurrentUser(session);
    if (!user) return;
    const resolved = user.isDemo
      ? parseThemePreference(theme)
      : await setTheme(user.id, theme);
    // Sync the THEME cookie so SSR / signed-out visits match the stored
    // preference (DDR-003). The toggle only submits light/dark (DDR-004).
    const store = await cookies();
    if (resolved) {
      store.set(THEME_COOKIE, resolved, {
        path: "/",
        maxAge: PREF_COOKIE_MAX_AGE,
        sameSite: "lax",
      });
    } else {
      store.delete(THEME_COOKIE);
    }
    // Re-render the whole tree so <html data-theme> updates immediately.
    revalidatePath("/", "layout");
  }

  // Unlike language and theme, the base currency has no cookie to fall back on —
  // it is read straight off the user row — so the demo tenant cannot offer it
  // per-visitor. Refuse it (the form is not rendered for a demo session).
  async function updateBaseCurrency(formData: FormData) {
    "use server";
    const session = await auth();
    const user = await resolveCurrentUser(session);
    if (!user) return;
    assertWritable(user);
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

      <div className="field">
        <span className="mono-label">{t(activeLocale, "settings.theme.label")}</span>
        <ThemeToggle initialTheme={resolvedTheme} action={updateTheme} />
        <p className="muted" style={{ margin: 0 }}>
          {t(activeLocale, "settings.theme.help")}
        </p>
      </div>

      {!isDemo && (
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
      )}
    </section>
  );
}

export default async function SettingsPage() {
  const session = await auth();
  const user = await resolveCurrentUser(session);
  const locale = await getRequestLocale(user?.locale);
  const resolvedTheme = await getRequestTheme(user?.theme);

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

  // The demo tenant is shared, so its profile, base currency and (emphatically)
  // its deletion are withheld — one visitor must not be able to rename or delete
  // the collection every other visitor is looking at (ADR-016, DDR-007).
  // Language and theme survive: they are cookie-backed, so each visitor keeps a
  // private preference without the shared row ever being written.
  return (
    <main className="stack settings-page">
      <h1 style={{ margin: 0 }}>{t(locale, "settings.title")}</h1>
      {user.isDemo ? (
        <section className="card stack">
          <p style={{ margin: 0 }}>{t(locale, "demo.settings.note")}</p>
        </section>
      ) : (
        <ProfileForm initialName={user.name ?? ""} email={user.email} />
      )}
      <PreferencesSection
        activeLocale={locale}
        localePref={user.locale}
        resolvedTheme={resolvedTheme}
        baseCurrency={user.baseCurrency}
        isDemo={user.isDemo}
      />
      {!user.isDemo && <DeleteAccountSection />}
    </main>
  );
}
