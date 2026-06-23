"use client";

import "./globals.css";

// Root-level fallback. Unlike error.tsx, this catches failures in the root
// layout itself — which is the real database-outage path, because layout.tsx
// renders SiteHeader / FloatingAssistant, both of which call the DB-backed
// auth(). When the layout throws there is no shell to render into, so this
// component must provide its own <html>/<body>. We import globals.css directly
// so the design-system tokens and utility classes still apply.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <div className="container">
          <main className="stack">
            <h1>NumisBook is temporarily unavailable</h1>
            <div className="card stack">
              <p className="muted" style={{ margin: 0 }}>
                Your collection is safe — we&rsquo;re having trouble reaching our
                servers right now. Please try again in a moment.
              </p>
              <div className="row">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => reset()}
                >
                  Try again
                </button>
              </div>
              {error.digest && (
                <p className="muted mono-label" style={{ margin: 0 }}>
                  Reference: {error.digest}
                </p>
              )}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
