import { signIn } from "@/auth";
import { t, type Locale } from "@/lib/i18n";

// A persistent, non-dismissible bar shown on every page of a demo session
// (DDR-007).
//
// Non-dismissible on purpose: it is the only thing explaining why the
// create/edit/delete controls are missing. A visitor who dismissed it would be
// left with a product that silently appears to be missing half its features.
//
// The call to action signs in with Google *directly* rather than linking home:
// the visitor is already signed in (as the demo tenant), so a link to "/" would
// just show them the demo again. A successful Google sign-in overwrites the
// session cookie, and the abandoned demo session row is swept when it expires.
//
// A Server Component — the demo state is already known on the server, so the
// banner costs no client JavaScript.
export function DemoBanner({ locale }: { locale: Locale }) {
  return (
    <div className="demo-banner">
      <p className="demo-banner-text">
        <span className="badge demo-banner-badge">{t(locale, "demo.badge")}</span>
        <span>{t(locale, "demo.banner")}</span>
      </p>
      <form
        action={async () => {
          "use server";
          await signIn("google", { redirectTo: "/" });
        }}
      >
        <button type="submit" className="demo-banner-cta">
          {t(locale, "demo.banner.cta")}
          <span aria-hidden="true"> →</span>
        </button>
      </form>
    </div>
  );
}
