import Link from "next/link";
import { auth, signIn } from "@/auth";
import { resolveCurrentUser } from "@/services/auth.service";
import { listCollections } from "@/services/collection.service";
import { CollectionsManager } from "@/components/collections/CollectionsManager";

// Server Component: guards on auth and loads the initial list directly through
// the service. Mutations happen client-side against /api/collections.
export default async function CollectionsPage() {
  const session = await auth();
  const user = await resolveCurrentUser(session);

  if (!user) {
    return (
      <main>
        <h1>Collections</h1>
        <p>Sign in to manage your collections.</p>
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/collections" });
          }}
        >
          <button type="submit">Sign in with Google</button>
        </form>
      </main>
    );
  }

  const collections = await listCollections(user.id);

  return (
    <main>
      <p>
        <Link href="/">← Home</Link> · <Link href="/portfolio">Portfolio</Link>
      </p>
      <h1>Collections</h1>
      <CollectionsManager initialCollections={collections} />
    </main>
  );
}
