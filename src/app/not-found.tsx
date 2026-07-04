import Link from "next/link";
import { t } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n/server";

// Branded 404, rendered inside the root layout (SiteHeader stays visible).
export default async function NotFound() {
  const locale = await getRequestLocale();
  return (
    <main className="stack">
      <h1>{t(locale, "notFound.title")}</h1>
      <div className="card stack">
        <p className="muted" style={{ margin: 0 }}>
          {t(locale, "notFound.body")}
        </p>
        <p style={{ margin: 0 }}>
          <Link href="/">{t(locale, "action.backToHome")}</Link>
        </p>
      </div>
    </main>
  );
}
