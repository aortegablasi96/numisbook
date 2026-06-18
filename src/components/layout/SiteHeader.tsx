import Link from "next/link";
import { auth, signIn, signOut } from "@/auth";
import { resolveCurrentUser } from "@/services/auth.service";
import { HeaderNav } from "./HeaderNav";

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

  return (
    <header className="site-header">
      <div className="container bar">
        <Link href="/" className="brand">
          <span className="brand-logo" aria-hidden="true">
            N
          </span>
          NumisBook
        </Link>

        <nav className="nav" aria-label="Primary">
          {user && <HeaderNav />}
          {user ? (
            <>
              <span className="nav-divider" aria-hidden="true" />
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
                  Sign out
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
                Sign in
              </button>
            </form>
          )}
        </nav>
      </div>
    </header>
  );
}
