import Link from "next/link";

// Branded 404, rendered inside the root layout (SiteHeader stays visible).
export default function NotFound() {
  return (
    <main className="stack">
      <h1>Page not found</h1>
      <div className="card stack">
        <p className="muted" style={{ margin: 0 }}>
          We couldn&rsquo;t find the page you were looking for. It may have been
          moved or no longer exists.
        </p>
        <p style={{ margin: 0 }}>
          <Link href="/">Back to home</Link>
        </p>
      </div>
    </main>
  );
}
