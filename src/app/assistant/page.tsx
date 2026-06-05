import Link from "next/link";
import { auth, signIn } from "@/auth";
import { resolveCurrentUser } from "@/services/auth.service";
import { AssistantChat } from "@/components/assistant/AssistantChat";

// Server Component: guards on auth, then hosts the client chat which talks to
// /api/assistant. All assistant actions are scoped to the signed-in user.
export default async function AssistantPage() {
  const session = await auth();
  const user = await resolveCurrentUser(session);

  if (!user) {
    return (
      <main>
        <h1>Assistant</h1>
        <p>Sign in to chat with your collection assistant.</p>
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/assistant" });
          }}
        >
          <button type="submit">Sign in with Google</button>
        </form>
      </main>
    );
  }

  return (
    <main>
      <p>
        <Link href="/">← Home</Link> ·{" "}
        <Link href="/collections">Collections</Link> ·{" "}
        <Link href="/portfolio">Portfolio</Link>
      </p>
      <h1>Collection assistant</h1>
      <AssistantChat />
    </main>
  );
}
