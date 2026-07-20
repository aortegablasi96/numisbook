import { createHash } from "node:crypto";

// Who an assistant request is metered against (ADR-018 §3).
//
// Pure and free of any database import on purpose: the route needs to *derive*
// a subject key without pulling the usage repository — and therefore `@/db` —
// into its module graph. Only the code that actually reads or writes usage rows
// should depend on the database.

/**
 * The metered subject for a signed-in collector.
 *
 * Prefixed, and the prefix is load-bearing: without it a user id and a session
 * hash share one namespace, so a collision would merge two subjects' budgets and
 * the account-deletion purge could not target rows exactly.
 */
export function subjectKeyForUser(userId: string): string {
  return `user:${userId}`;
}

/**
 * The metered subject for a demo visitor.
 *
 * Demo visitors all share one tenant id (ADR-016), so metering them by user id
 * would make every visitor compete for a single budget — on a sales surface.
 * Each visitor is metered by their own session instead.
 *
 * The token is **hashed, never stored raw**: it is a live credential, and a
 * leaked backup of `assistant_usage` must not be a set of usable sessions.
 *
 * Weaker than the signed-in key — clearing cookies buys a fresh budget — and
 * that is accepted knowingly (ADR-018 §3): the demo tenant is read-only and its
 * conversation cap bounds each session. This is a spend guard, not a security
 * boundary.
 */
export function subjectKeyForDemoSession(sessionToken: string): string {
  return `demo:${createHash("sha256").update(sessionToken).digest("hex")}`;
}
