import Link from "next/link";
import { auth, signIn, signOut } from "@/auth";
import { resolveCurrentUser } from "@/services/auth.service";

// Global app header: brand, primary nav, and auth controls. Server Component so
// it can read the session and run the sign in/out server actions.
export async function SiteHeader() {
  const session = await auth();
  const user = await resolveCurrentUser(session);

  return (
    <header className="site-header">
      <div className="container bar">
        <Link href="/" className="brand">
          NumisBook
        </Link>

        <nav className="nav">
          {user && (
            <>
              <Link href="/collections">Collections</Link>
              <Link href="/portfolio">Portfolio</Link>
              <Link href="/assistant">Assistant</Link>
            </>
          )}
          {user ? (
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <button type="submit" className="btn-sm" title={user.email ?? ""}>
                Sign out
              </button>
            </form>
          ) : (
            <form
              action={async () => {
                "use server";
                await signIn("google", { redirectTo: "/" });
              }}
            >
              <button type="submit" className="btn-primary btn-sm">
                Sign in
              </button>
            </form>
          )}
        </nav>
      </div>
    </header>
  );
}
