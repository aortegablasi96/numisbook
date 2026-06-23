import Link from "next/link";
import { signIn } from "@/auth";
import { authErrorMessage } from "@/lib/auth-errors";

// Branded sign-in error page, wired via Auth.js `pages.error` (src/auth.ts).
// Auth.js redirects here with `?error=<code>` when an OAuth sign-in fails. This
// renders during auth failures, so it must not call auth() or touch the DB — it
// only reads the query param and maps it to friendly copy.
export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const { title, body } = authErrorMessage(error);

  return (
    <main className="stack">
      <h1>{title}</h1>
      <div className="card stack">
        <p className="muted" style={{ margin: 0 }}>
          {body}
        </p>
        <form
          style={{ textAlign: "center" }}
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/" });
          }}
        >
          <button type="submit" className="btn-primary">
            Try signing in again
          </button>
        </form>
        <p style={{ margin: 0, textAlign: "center" }}>
          <Link href="/">Back to home</Link>
        </p>
      </div>
    </main>
  );
}
