// Conversation-length limits for the collection assistant (ADR-018 §1).
//
// **Deliberately stateless, and deliberately client-safe.** The client sends the
// full `messages` array on every request, so the length is already in hand at
// the route — persisting a count would store a value we are handed anyway and
// invent a consistency question (stored count vs. sent array) where none exists.
//
// Holding the rule here rather than in `assistant-limits.service` is what lets
// the widget import it: that service reaches the database through a repository,
// so it can never enter a client bundle. Both sides now enforce one rule instead
// of drifting apart — the widget for a good experience, the route for the
// guarantee.

/**
 * Messages a signed-in collector may accumulate in one conversation.
 *
 * Every turn resends the whole history, so cost per turn rises with length. This
 * bounds that; it is not a quality judgement about long conversations.
 */
export const MAX_ASSISTANT_MESSAGES = 40;

/**
 * The demo tenant is reachable without signing in, so it is the one surface
 * where an anonymous stranger drives OpenAI spend. It keeps a tighter bound.
 */
export const DEMO_MAX_ASSISTANT_MESSAGES = 20;

/**
 * Structural ceiling on a request payload, enforced by the Zod schema.
 *
 * This is an abuse guard, **not** the product limit: it must stay comfortably
 * above `MAX_ASSISTANT_MESSAGES` so that a merely-too-long conversation meets
 * the friendly limit message below rather than a generic validation error.
 * `assistant-conversation.test.ts` pins that ordering.
 */
export const MAX_ASSISTANT_MESSAGES_PAYLOAD = 200;

/** The conversation limit that applies to this caller. */
export function conversationLimit(isDemo: boolean): number {
  return isDemo ? DEMO_MAX_ASSISTANT_MESSAGES : MAX_ASSISTANT_MESSAGES;
}

/**
 * Whether a submitted conversation of `messageCount` messages exceeds the limit.
 *
 * Strictly greater-than: the limit is the number of messages a conversation may
 * *contain*, and the submitted array already includes the new user message. So a
 * conversation of exactly `limit` messages is allowed, and the next one is not —
 * preserving the demo's original `> DEMO_MAX_ASSISTANT_MESSAGES` behaviour
 * rather than quietly tightening it by one.
 */
export function conversationLimitReached(
  messageCount: number,
  isDemo: boolean,
): boolean {
  return messageCount > conversationLimit(isDemo);
}

/**
 * Whether one more message may still be sent, given `messageCount` already in
 * the conversation.
 *
 * The route checks the array it was *given* (`conversationLimitReached`); the
 * widget checks whether the next send is still allowed. Same rule, two
 * questions — kept apart so neither caller has to reason about the off-by-one.
 */
export function canSendAnotherMessage(
  messageCount: number,
  isDemo: boolean,
): boolean {
  return messageCount + 1 <= conversationLimit(isDemo);
}
