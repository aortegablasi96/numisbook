import Link from "next/link";
import { auth, signIn, signOut } from "@/auth";
import { resolveCurrentUser } from "@/services/auth.service";
import { t } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n/server";
import { HeaderNav } from "./HeaderNav";

function IconSettings() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 8 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H2a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 3.6 8a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H8a1.65 1.65 0 0 0 1-1.51V2a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V8a1.65 1.65 0 0 0 1.51 1H22a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function IconSignOut() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

// Global app header: gold "N" mark + Fraunces wordmark, primary nav (with an
// active pill via the client HeaderNav), and auth controls. Server Component so
// it can read the session and run the sign in/out server actions.
export async function SiteHeader() {
  const session = await auth();
  const user = await resolveCurrentUser(session);
  const locale = await getRequestLocale(user?.locale);

  return (
    <header className="site-header">
      <div className="container bar">
        <Link href="/" className="brand">
          <span className="brand-logo" aria-hidden="true">
            N
          </span>
          {t(locale, "app.name")}
        </Link>

        <nav className="nav" aria-label={t(locale, "nav.primaryAria")}>
          {user && <HeaderNav />}
          {user ? (
            <>
              <span className="nav-divider" aria-hidden="true" />
              <Link
                href="/settings"
                className="nav-signout"
                title={t(locale, "nav.settings")}
              >
                <IconSettings />
                {t(locale, "nav.settings")}
              </Link>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <button
                  type="submit"
                  className="nav-signout"
                  title={user.email ?? ""}
                >
                  <IconSignOut />
                  {t(locale, "nav.signOut")}
                </button>
              </form>
            </>
          ) : (
            <form
              action={async () => {
                "use server";
                await signIn("google", { redirectTo: "/" });
              }}
            >
              <button type="submit" className="btn-primary btn-sm">
                {t(locale, "nav.signIn")}
              </button>
            </form>
          )}
        </nav>
      </div>
    </header>
  );
}
