import { auth, signIn, signOut } from "@/auth";
import { resolveCurrentUser } from "@/services/auth.service";

export default async function Home() {
  const session = await auth();
  const user = await resolveCurrentUser(session);

  return (
    <main>
      <h1>NumisBook</h1>
      <p>Collection management for coin collectors. MVP under construction.</p>

      {user ? (
        <section>
          <p>Signed in as {user.name ?? user.email}.</p>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <button type="submit">Sign out</button>
          </form>
        </section>
      ) : (
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/" });
          }}
        >
          <button type="submit">Sign in with Google</button>
        </form>
      )}
    </main>
  );
}
