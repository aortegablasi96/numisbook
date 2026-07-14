"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS } from "@/auth";
import { startDemoSession } from "@/services/demo.service";

/**
 * Sign the visitor into the read-only demo tenant (ADR-016).
 *
 * The service mints the session row; this sets the Auth.js session cookie that
 * `auth()` reads, which is the whole of what "being signed in" means under the
 * database-session strategy. No provider, no credentials, no client input — the
 * demo user is resolved server-side from its `is_demo` flag.
 *
 * Signing out is unchanged: Auth.js's `signOut` deletes the session row.
 */
export async function startDemo(): Promise<void> {
  const { sessionToken, expires } = await startDemoSession();

  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, sessionToken, {
    ...SESSION_COOKIE_OPTIONS,
    expires,
  });

  redirect("/");
}
