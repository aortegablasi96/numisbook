import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/db";
import { users, accounts, sessions, verificationTokens } from "@/db/schema";

const isProduction = process.env.NODE_ENV === "production";

/**
 * The session cookie, declared explicitly rather than left to Auth.js's default.
 *
 * The demo sign-in mints a database session itself (ADR-016) and must set the
 * very cookie `auth()` will later read. Naming it here makes that a shared
 * constant instead of a guess at an Auth.js internal that a future upgrade could
 * rename underneath us.
 */
export const SESSION_COOKIE_NAME = isProduction
  ? "__Secure-numisbook.session-token"
  : "numisbook.session-token";

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax",
  path: "/",
  secure: isProduction,
} as const;

// Auth.js v5. Reads AUTH_SECRET and AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET from the
// environment automatically. Sessions are stored in the DB via the adapter.
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [Google],
  session: { strategy: "database" },
  cookies: {
    sessionToken: {
      name: SESSION_COOKIE_NAME,
      options: SESSION_COOKIE_OPTIONS,
    },
  },
  // Route OAuth sign-in failures to our branded page instead of Auth.js's
  // default error screen (see src/app/auth/error/page.tsx).
  pages: { error: "/auth/error" },
});
