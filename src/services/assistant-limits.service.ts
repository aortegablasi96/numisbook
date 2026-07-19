import {
  assistantUsageRepository,
  type AssistantUsageOutcome,
} from "@/repositories/assistantUsage.repository";
import { subjectKeyForUser } from "@/lib/assistant-subject";

// The subject-key rule itself lives in `@/lib/assistant-subject` — pure, and
// free of any database import, so callers that only need to *derive* a key
// (the route) do not pull `@/db` in behind it. Re-exported here so the usage
// story still reads as one thing.
export {
  subjectKeyForUser,
  subjectKeyForDemoSession,
} from "@/lib/assistant-subject";

// Usage accounting for the collection assistant (ADR-018).
//
// One question, one home: "how much has this subject spent, and may they spend
// more?" Rate limiting (#196) and cost control (#195) both enforce through here,
// so the two cannot drift apart.
//
// Framework-agnostic on purpose: this module never calls `auth()` and never
// reads a cookie. The route resolves the caller and hands in a plain string —
// that boundary is what keeps the rules testable without a request.


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
