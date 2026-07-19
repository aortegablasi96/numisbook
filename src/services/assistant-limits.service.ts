import { createHash } from "node:crypto";
import {
  assistantUsageRepository,
  type AssistantUsageOutcome,
} from "@/repositories/assistantUsage.repository";

// Usage accounting for the collection assistant (ADR-018).
//
// One question, one home: "how much has this subject spent, and may they spend
// more?" Rate limiting (#196) and cost control (#195) both enforce through here,
// so the two cannot drift apart.
//
// Framework-agnostic on purpose: this module never calls `auth()` and never
// reads a cookie. The route resolves the caller and hands in a plain string —
// that boundary is what keeps the rules testable without a request.

/**
 * The metered subject.
 *
 * Prefixed, and the prefix is load-bearing: without it a user uuid and a session
 * hash share one namespace, so a collision would merge two subjects' budgets and
 * the account-deletion purge could not target rows exactly.
 */
export function subjectKeyForUser(userId: string): string {
  return `user:${userId}`;
}

/**
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

/** Start of a rolling window `windowMs` back from now. */
function windowStart(windowMs: number): Date {
  return new Date(Date.now() - windowMs);
}

/**
 * Requests this subject has made in the trailing window.
 *
 * Callers compare against their own threshold: the numbers are deliberately not
 * set here, because ADR-018 §10 defers them to measured usage rather than
 * guesswork.
 */
export function countRequestsInWindow(
  subjectKey: string,
  windowMs: number,
): Promise<number> {
  return assistantUsageRepository.countSince(subjectKey, windowStart(windowMs));
}

/** Tokens this subject has consumed in the trailing window. */
export function sumTokensInWindow(
  subjectKey: string,
  windowMs: number,
): Promise<number> {
  return assistantUsageRepository.sumTokensSince(
    subjectKey,
    windowStart(windowMs),
  );
}

/** Record what one assistant request consumed. */
export function recordUsage(input: {
  subjectKey: string;
  promptTokens: number;
  completionTokens: number;
  outcome: AssistantUsageOutcome;
}): Promise<void> {
  return assistantUsageRepository.record(input);
}

/**
 * Forget a user's usage history, called when their account is deleted.
 *
 * Lives here rather than in `account.service` so the subject-key rule stays in
 * one place — the purge must use exactly the key the writes used.
 */
export function forgetUserUsage(userId: string): Promise<void> {
  return assistantUsageRepository.deleteBySubject(subjectKeyForUser(userId));
}
