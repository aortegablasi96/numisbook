import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/db";
import { users, accounts, sessions, verificationTokens } from "@/db/schema";

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
  // Route OAuth sign-in failures to our branded page instead of Auth.js's
  // default error screen (see src/app/auth/error/page.tsx).
  pages: { error: "/auth/error" },
});
