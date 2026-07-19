import { describe, it, expect } from "vitest";
import {
  MAX_ASSISTANT_MESSAGES,
  DEMO_MAX_ASSISTANT_MESSAGES,
  MAX_ASSISTANT_MESSAGES_PAYLOAD,
  conversationLimit,
  conversationLimitReached,
  canSendAnotherMessage,
} from "./assistant-conversation";

describe("conversationLimit", () => {
  it("gives the demo a tighter bound than a signed-in user", () => {
    expect(conversationLimit(true)).toBe(DEMO_MAX_ASSISTANT_MESSAGES);
    expect(conversationLimit(false)).toBe(MAX_ASSISTANT_MESSAGES);
    expect(DEMO_MAX_ASSISTANT_MESSAGES).toBeLessThan(MAX_ASSISTANT_MESSAGES);
  });
});

describe("conversationLimitReached", () => {
  // The limit is how many messages a conversation may *contain*, and the
  // submitted array already includes the new user message — so exactly `limit`
  // is allowed. This preserves the demo's original `> DEMO_MAX` behaviour; an
  // off-by-one here silently shortens every demo conversation by one turn.
  it("allows a conversation of exactly the limit", () => {
    expect(conversationLimitReached(MAX_ASSISTANT_MESSAGES, false)).toBe(false);
    expect(conversationLimitReached(DEMO_MAX_ASSISTANT_MESSAGES, true)).toBe(false);
  });

  it("rejects one message beyond the limit", () => {
    expect(conversationLimitReached(MAX_ASSISTANT_MESSAGES + 1, false)).toBe(true);
    expect(conversationLimitReached(DEMO_MAX_ASSISTANT_MESSAGES + 1, true)).toBe(true);
  });

  it("holds the demo to its own bound, not the signed-in one", () => {
    const between = DEMO_MAX_ASSISTANT_MESSAGES + 1;
    expect(conversationLimitReached(between, true)).toBe(true);
    expect(conversationLimitReached(between, false)).toBe(false);
  });

  it("allows an empty or short conversation", () => {
    expect(conversationLimitReached(0, true)).toBe(false);
    expect(conversationLimitReached(1, true)).toBe(false);
  });
});

describe("canSendAnotherMessage", () => {
  it("permits a send while there is room for one more message", () => {
    expect(canSendAnotherMessage(MAX_ASSISTANT_MESSAGES - 1, false)).toBe(true);
    expect(canSendAnotherMessage(DEMO_MAX_ASSISTANT_MESSAGES - 1, true)).toBe(true);
  });

  it("refuses once the conversation already holds the limit", () => {
    expect(canSendAnotherMessage(MAX_ASSISTANT_MESSAGES, false)).toBe(false);
    expect(canSendAnotherMessage(DEMO_MAX_ASSISTANT_MESSAGES, true)).toBe(false);
  });

  // The widget asks "may I send?", the route asks "is what I got too long?".
  // They must not disagree: whatever the widget lets through must be accepted.
  it("agrees with conversationLimitReached at the boundary", () => {
    for (const isDemo of [true, false]) {
      const limit = conversationLimit(isDemo);
      for (let existing = 0; existing <= limit + 2; existing++) {
        if (canSendAnotherMessage(existing, isDemo)) {
          // The send would submit `existing + 1` messages; the route must accept it.
          expect(conversationLimitReached(existing + 1, isDemo)).toBe(false);
        }
      }
    }
  });
});

describe("payload ceiling", () => {
  // The Zod bound is a structural abuse guard. If it ever slipped below the
  // product limit, a merely-too-long conversation would meet a generic
  // validation error instead of the friendly message.
  it("stays above every product limit", () => {
    expect(MAX_ASSISTANT_MESSAGES_PAYLOAD).toBeGreaterThan(MAX_ASSISTANT_MESSAGES);
    expect(MAX_ASSISTANT_MESSAGES_PAYLOAD).toBeGreaterThan(
      DEMO_MAX_ASSISTANT_MESSAGES,
    );
  });
});
