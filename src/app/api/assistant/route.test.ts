import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the auth boundary (used by currentUser in ../_lib) and the assistant
// service — no OpenAI client is ever constructed in these tests.
vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/services/auth.service", () => ({ resolveCurrentUser: vi.fn() }));
vi.mock("@/services/assistant.service", () => ({ chat: vi.fn() }));

import { auth } from "@/auth";
import { resolveCurrentUser } from "@/services/auth.service";
import { chat } from "@/services/assistant.service";
import {
  MAX_ASSISTANT_MESSAGES,
  DEMO_MAX_ASSISTANT_MESSAGES,
} from "@/lib/assistant-conversation";
import { POST } from "./route";

const baseUser = {
  id: "u1",
  name: "Ada",
  email: "ada@example.com",
  emailVerified: null,
  image: null,
  baseCurrency: null,
  locale: null,
  theme: null,
  isDemo: false,
  createdAt: new Date(),
};

function signedIn(isDemo = false) {
  vi.mocked(auth).mockResolvedValue({ user: { id: "u1" } } as never);
  vi.mocked(resolveCurrentUser).mockResolvedValue({ ...baseUser, isDemo });
}

/** A conversation of `n` alternating messages. */
function conversation(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    role: i % 2 === 0 ? "user" : "assistant",
    content: `m${i}`,
  }));
}

function post(messages: unknown) {
  return new Request("http://test/api/assistant", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ messages }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.OPENAI_API_KEY = "test-key";
  vi.mocked(chat).mockResolvedValue({ reply: "hi", actions: [] });
});

describe("POST /api/assistant — conversation limits", () => {
  it("accepts a conversation of exactly the signed-in limit", async () => {
    signedIn();
    const res = await POST(post(conversation(MAX_ASSISTANT_MESSAGES)));
    expect(res.status).toBe(200);
    expect(chat).toHaveBeenCalled();
  });

  it("rejects one message beyond the signed-in limit", async () => {
    signedIn();
    const res = await POST(post(conversation(MAX_ASSISTANT_MESSAGES + 1)));
    expect(res.status).toBe(400);
    expect(chat).not.toHaveBeenCalled();
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/reached its limit/i);
  });

  // The demo is reachable without signing in, so it must be bounded at least as
  // tightly. A conversation legal for a signed-in user is refused for the demo.
  it("holds the demo to its tighter bound", async () => {
    signedIn(true);
    const res = await POST(post(conversation(DEMO_MAX_ASSISTANT_MESSAGES + 1)));
    expect(res.status).toBe(400);
    expect(chat).not.toHaveBeenCalled();
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/sign in with google/i);
  });

  it("accepts a conversation of exactly the demo limit", async () => {
    signedIn(true);
    const res = await POST(post(conversation(DEMO_MAX_ASSISTANT_MESSAGES)));
    expect(res.status).toBe(200);
  });

  it("still passes readOnly through for the demo tenant", async () => {
    signedIn(true);
    await POST(post(conversation(2)));
    expect(chat).toHaveBeenCalledWith(
      "u1",
      expect.any(Array),
      undefined,
      { readOnly: true },
    );
  });

  it("401s when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    vi.mocked(resolveCurrentUser).mockResolvedValue(null);
    const res = await POST(post(conversation(2)));
    expect(res.status).toBe(401);
  });

  it("503s when the assistant is not configured", async () => {
    signedIn();
    delete process.env.OPENAI_API_KEY;
    const res = await POST(post(conversation(2)));
    expect(res.status).toBe(503);
  });
});
