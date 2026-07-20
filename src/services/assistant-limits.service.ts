import {
  assistantUsageRepository,
  type AssistantUsageOutcome,
} from "@/repositories/assistantUsage.repository";
import { subjectKeyForUser } from "@/lib/assistant-subject";
import { RateLimitError } from "@/lib/errors";
import { logger } from "@/lib/logger";

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


const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

/**
 * The budgets a subject may spend (#196).
 *
 * Two dimensions, because they catch different abuse: `requests` stops a burst
 * (a script hammering the endpoint), `tokens` stops a slow drip of very
 * expensive requests that would never trip a request count. Either alone leaves
 * an obvious way through.
 *
 * The demo is bounded more tightly than a signed-in collector: it is reachable
 * without signing in, so it is the one surface an anonymous stranger can spend
 * from.
 *
 * These are the **strict** settings chosen when the guard shipped. They are
 * provisional — ADR-018 §10 expects them revisited once production usage rows
 * show what real collectors actually consume.
 */
export const LIMITS = {
  user: {
    requests: { max: 15, windowMs: 15 * MINUTE },
    tokens: { max: 200_000, windowMs: 24 * HOUR },
  },
  demo: {
    requests: { max: 8, windowMs: 15 * MINUTE },
    tokens: { max: 60_000, windowMs: 24 * HOUR },
  },
} as const;

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

/**
 * Refuse the request if this subject has exhausted either budget.
 *
 * **Fails closed** (ADR-018 §6): if the usage store cannot be read, the request
 * is refused rather than waved through. A spend guard that opens under exactly
 * the conditions an attacker could induce is not a guard — and it is also the
 * mechanism that closes the hole left by a usage write that failed earlier, so
 * a lost write cannot become a way in.
 *
 * Enforcement is approximate under concurrency by design: two simultaneous
 * requests can both observe room and both proceed. Locking every assistant
 * request to prevent an occasional off-by-one is a poor trade for a spend guard
 * (ADR-018 §7). **Do not "fix" this without revisiting that decision.**
 */
export async function assertWithinLimits(
  subjectKey: string,
  isDemo: boolean,
): Promise<void> {
  const limits = isDemo ? LIMITS.demo : LIMITS.user;

  let requests: number;
  let tokens: number;
  try {
    [requests, tokens] = await Promise.all([
      countRequestsInWindow(subjectKey, limits.requests.windowMs),
      sumTokensInWindow(subjectKey, limits.tokens.windowMs),
    ]);
  } catch (error) {
    logger.error("assistant limit check failed — refusing request", {
      error: error instanceof Error ? error.message : String(error),
    });
    throw new RateLimitError(
      "The assistant is temporarily unavailable. Please try again shortly.",
      new Date(Date.now() + MINUTE),
    );
  }

  if (requests >= limits.requests.max) {
    throw new RateLimitError(
      "You've reached the assistant's request limit. Please try again later.",
      await retryAfter(subjectKey, limits.requests.windowMs),
    );
  }

  if (tokens >= limits.tokens.max) {
    throw new RateLimitError(
      "You've reached the assistant's daily usage limit. Please try again later.",
      await retryAfter(subjectKey, limits.tokens.windowMs),
    );
  }
}

/**
 * When the subject regains room: the moment their oldest in-window request
 * ages out. Falls back to a full window if the row cannot be found (it can only
 * have just been pruned), which errs towards telling the caller to wait longer
 * rather than inviting an immediate retry that would fail again.
 */
async function retryAfter(subjectKey: string, windowMs: number): Promise<Date> {
  const oldest = await assistantUsageRepository.oldestSince(
    subjectKey,
    windowStart(windowMs),
  );
  return new Date((oldest?.getTime() ?? Date.now()) + windowMs);
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
