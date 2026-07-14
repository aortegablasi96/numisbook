import { randomBytes } from "node:crypto";
import { userRepository } from "@/repositories/user.repository";
import { sessionRepository } from "@/repositories/session.repository";
import { NotFoundError } from "@/lib/errors";
import { DEMO_SESSION_MAX_AGE_HOURS } from "@/lib/demo";

// The public demo tenant (ADR-016).
//
// Auth.js cannot mint this session for us: its database-session strategy only
// creates a session at the end of an OAuth callback, and the demo has no
// provider behind it. (A Credentials provider is not an escape hatch — it forces
// the JWT strategy, which would mean rewriting session handling for the whole
// app to serve the demo.)
//
// But a database session is not magic: it is a row in `sessions` plus a cookie
// carrying its token. So we create exactly that, and `auth()` then resolves the
// demo visitor like any other signed-in user. The demo user is an ordinary
// tenant — its id comes from the session and every repository query is still
// scoped by it — which is what keeps the tenant-isolation invariant intact.
//
// Framework-agnostic: it returns the token and expiry, and leaves setting the
// cookie to the caller (a Server Action).

export type DemoSession = { sessionToken: string; expires: Date };

/** Whether a demo tenant has been seeded. Drives whether the UI offers the demo at all. */
export async function isDemoAvailable(): Promise<boolean> {
  return (await userRepository.findDemo()) !== null;
}

/**
 * Start a demo session.
 *
 * The demo user is looked up by its `is_demo` flag — the id is never accepted
 * from the caller, so this grants a session for the demo tenant and nothing else.
 * Expired sessions for the tenant are swept first: every visitor mints a row, so
 * without this the table would grow with traffic and never shrink.
 */
export async function startDemoSession(): Promise<DemoSession> {
  const demo = await userRepository.findDemo();
  if (!demo) {
    throw new NotFoundError("No demo account is available.");
  }

  await sessionRepository.deleteExpiredForUser(demo.id);

  const sessionToken = randomBytes(32).toString("hex");
  const expires = new Date(
    Date.now() + DEMO_SESSION_MAX_AGE_HOURS * 60 * 60 * 1000,
  );
  await sessionRepository.create({ sessionToken, userId: demo.id, expires });

  return { sessionToken, expires };
}
