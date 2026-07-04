"use client";

import Link from "next/link";
import { useT } from "@/components/i18n/LocaleProvider";

// App-level error boundary. Renders inside the root layout, so SiteHeader stays
// visible while the page content is replaced. Catches render-time throws from
// feature Server Components — including data fetches that fail when the database
// is unreachable. `reset()` re-attempts the render, which recovers the page once
// the underlying problem clears (no manual reload needed).
//
// Next logs the matching server-side error and attaches a stable `digest`; we
// surface it as a quotable reference, consistent with the errorId model in
// ADR-011. We do not call captureException here — that module uses node:crypto
// and must stay out of the client bundle.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useT();
  return (
    <main className="stack">
      <h1>{t("error.title")}</h1>
      <div className="card stack">
        <p className="muted" style={{ margin: 0 }}>
          {t("error.body")}
        </p>
        <div className="row">
          <button type="button" className="btn-primary" onClick={() => reset()}>
            {t("action.tryAgain")}
          </button>
          <Link href="/" className="btn-ghost">
            {t("action.backToHome")}
          </Link>
        </div>
        {error.digest && (
          <p className="muted mono-label" style={{ margin: 0 }}>
            {t("error.reference")}: {error.digest}
          </p>
        )}
      </div>
    </main>
  );
}
