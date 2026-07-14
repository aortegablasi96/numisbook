import { and, eq, lt } from "drizzle-orm";
import { db } from "@/db";
import { sessions } from "@/db/schema";

// Data access for Auth.js `sessions`. The Drizzle adapter owns this table during
// the OAuth flow; this repository exists for the one session Auth.js cannot mint
// for us — the demo tenant's, which has no OAuth provider behind it (ADR-016).
//
// A session row plus the session cookie *is* a signed-in session as far as
// Auth.js's database strategy is concerned, so the demo user ends up an ordinary
// tenant: `auth()` resolves it exactly like a Google one.
export const sessionRepository = {
  /** Create a session row for a user. Returns nothing — the caller holds the token. */
  async create(session: {
    sessionToken: string;
    userId: string;
    expires: Date;
  }): Promise<void> {
    await db.insert(sessions).values(session);
  },

  /**
   * Delete a user's expired sessions. Every demo visitor mints a row, so without
   * this the table would grow with traffic and never shrink; the demo sign-in
   * sweeps opportunistically. Live sessions are untouched.
   */
  async deleteExpiredForUser(userId: string, now: Date = new Date()): Promise<void> {
    await db
      .delete(sessions)
      .where(and(eq(sessions.userId, userId), lt(sessions.expires, now)));
  },
};
