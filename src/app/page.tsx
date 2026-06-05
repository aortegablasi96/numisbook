import Link from "next/link";
import { auth, signIn } from "@/auth";
import { resolveCurrentUser } from "@/services/auth.service";

const FEATURES = [
  {
    href: "/collections",
    title: "Collections",
    body: "Organize your coins into collections — add, rename, and curate.",
  },
  {
    href: "/portfolio",
    title: "Portfolio",
    body: "Aggregate value, allocation by metal and collection, and trends.",
  },
  {
    href: "/assistant",
    title: "Assistant",
    body: "Chat to manage your collection — add coins, record valuations, ask questions.",
  },
];

export default async function Home() {
  const session = await auth();
  const user = await resolveCurrentUser(session);

  return (
    <main className="stack">
      <section>
        <h1>NumisBook</h1>
        <p className="muted">Collection management for coin collectors.</p>
      </section>

      {user ? (
        <>
          <p>
            Signed in as <strong>{user.name ?? user.email}</strong>.
          </p>
          <ul className="cards">
            {FEATURES.map((feature) => (
              <li key={feature.href}>
                <Link href={feature.href} className="card card-link stack">
                  <h2>{feature.title}</h2>
                  <p className="muted" style={{ margin: 0 }}>
                    {feature.body}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <div className="card stack">
          <p>Sign in to start cataloguing and valuing your coin collection.</p>
          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/" });
            }}
          >
            <button type="submit" className="btn-primary">
              Sign in with Google
            </button>
          </form>
        </div>
      )}
    </main>
  );
}
