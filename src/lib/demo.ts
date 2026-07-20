import { ForbiddenError } from "@/lib/errors";

// The public demo tenant (ADR-016).
//
// The demo user is an ordinary tenant: its id comes from the session and every
// repository query is scoped by it, exactly as for a Google user. What makes it
// a demo is that it is *shared* and *read-only* — many strangers browse the same
// rows at the same time, so any write would be a write on everyone else's behalf.

/** Identity of the seeded demo tenant. The seed script owns this row. */
export const DEMO_EMAIL = "demo@numisbook.app";
export const DEMO_NAME = "Demo Collector";
/** Demo sessions are short-lived; visitors are not building anything to keep. */
export const DEMO_SESSION_MAX_AGE_HOURS = 4;

// The demo's assistant conversation cap now lives in `@/lib/assistant-conversation`
// as one case of the general limit rather than a demo special case (ADR-018 §1).

/** Minimal shape the guard needs — any user row satisfies it. */
type MaybeDemoUser = { isDemo: boolean };

/**
 * Refuse a state-changing action from the demo tenant.
 *
 * Call this in **every** mutating API route (straight after `currentUser()`) and
 * in every mutating Server Action. Hiding the UI controls is cosmetic; this is
 * the enforcement. `src/app/api/write-guard.test.ts` fails the build if a
 * mutating route handler omits it.
 */
export function assertWritable(user: MaybeDemoUser): void {
  if (user.isDemo) {
    throw new ForbiddenError(
      "This is a read-only demo account. Sign in to make changes.",
    );
  }
}
