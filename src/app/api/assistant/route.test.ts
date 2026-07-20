import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the auth boundary (used by currentUser in ../_lib) and the assistant
// service — no OpenAI client is ever constructed in these tests.
vi.mock("@/auth", () => ({
  auth: vi.fn(),
  SESSION_COOKIE_NAME: "numisbook.session-token",
}));
vi.mock("@/services/auth.service", () => ({ resolveCurrentUser: vi.fn() }));
vi.mock("@/services/assistant.service", () => ({ chatStream: vi.fn() }));
vi.mock("@/services/assistant-limits.service", () => ({
  assertWithinLimits: vi.fn(),
}));
// The route reads the session cookie to meter demo visitors per session.
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: () => ({ value: "demo-session-token" }) })),
}));

import { auth } from "@/auth";
import { resolveCurrentUser } from "@/services/auth.service";
import { chatStream } from "@/services/assistant.service";
import { assertWithinLimits } from "@/services/assistant-limits.service";
import { RateLimitError } from "@/lib/errors";
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

/** A stand-in for the service's async generator. */
async function* streamOf(events: unknown[]) {
  for (const event of events) yield event as never;
}

/** Read an SSE response body back into the events it carried. */
async function readEvents(res: Response) {
  const text = await res.text();
  return text
    .split("\n\n")
    .filter((block) => block.startsWith("data:"))
    .map((block) => JSON.parse(block.slice(5).trim()) as { type: string });
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
  vi.mocked(chatStream).mockReturnValue(streamOf([
    { type: "text", delta: "hi" },
    { type: "done" },
  ]));
  vi.mocked(assertWithinLimits).mockResolvedValue(undefined);
});

describe("POST /api/assistant — conversation limits", () => {
  it("accepts a conversation of exactly the signed-in limit", async () => {
    signedIn();
    const res = await POST(post(conversation(MAX_ASSISTANT_MESSAGES)));
    expect(res.status).toBe(200);
    expect(chatStream).toHaveBeenCalled();
  });

  it("rejects one message beyond the signed-in limit", async () => {
    signedIn();
    const res = await POST(post(conversation(MAX_ASSISTANT_MESSAGES + 1)));
    expect(res.status).toBe(400);
    expect(chatStream).not.toHaveBeenCalled();
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/reached its limit/i);
  });

  // The demo is reachable without signing in, so it must be bounded at least as
  // tightly. A conversation legal for a signed-in user is refused for the demo.
  it("holds the demo to its tighter bound", async () => {
    signedIn(true);
    const res = await POST(post(conversation(DEMO_MAX_ASSISTANT_MESSAGES + 1)));
    expect(res.status).toBe(400);
    expect(chatStream).not.toHaveBeenCalled();
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
    expect(chatStream).toHaveBeenCalledWith(
      "u1",
      expect.any(Array),
      undefined,
      expect.objectContaining({ readOnly: true }),
    );
  });

  // Demo visitors share one tenant id, so they must be metered per session —
  // otherwise one visitor could exhaust every other visitor's budget.
  it("meters a demo visitor by their hashed session, not the shared tenant id", async () => {
    signedIn(true);
    await POST(post(conversation(2)));
    const options = vi.mocked(chatStream).mock.calls[0][3] as { subjectKey: string };
    expect(options.subjectKey).toMatch(/^demo:[0-9a-f]{64}$/);
    expect(options.subjectKey).not.toContain("u1");
    expect(options.subjectKey).not.toContain("demo-session-token");
  });

  it("meters a signed-in collector by their user id", async () => {
    signedIn();
    await POST(post(conversation(2)));
    const options = vi.mocked(chatStream).mock.calls[0][3] as { subjectKey: string };
    expect(options.subjectKey).toBe("user:u1");
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

describe("POST /api/assistant — rate limiting", () => {
  it("checks the limit before spending anything on OpenAI", async () => {
    signedIn();
    await POST(post(conversation(2)));
    expect(assertWithinLimits).toHaveBeenCalledWith("user:u1", false);
    // Order matters: a guard that runs after the model call saves nothing.
    const limitOrder = vi.mocked(assertWithinLimits).mock.invocationCallOrder[0];
    const chatOrder = vi.mocked(chatStream).mock.invocationCallOrder[0];
    expect(limitOrder).toBeLessThan(chatOrder);
  });

  it("returns 429 with a Retry-After header and the exact moment", async () => {
    signedIn();
    const retryAfter = new Date(Date.now() + 5 * 60_000);
    vi.mocked(assertWithinLimits).mockRejectedValue(
      new RateLimitError("slow down", retryAfter),
    );

    const res = await POST(post(conversation(2)));

    expect(res.status).toBe(429);
    expect(Number(res.headers.get("Retry-After"))).toBeGreaterThan(0);
    const body = (await res.json()) as { error: string; retryAfter: string };
    expect(body.retryAfter).toBe(retryAfter.toISOString());
    expect(chatStream).not.toHaveBeenCalled();
  });

  it("passes the demo flag so the tighter budget applies", async () => {
    signedIn(true);
    await POST(post(conversation(2)));
    expect(assertWithinLimits).toHaveBeenCalledWith(
      expect.stringMatching(/^demo:/),
      true,
    );
  });
});

describe("POST /api/assistant — SSE contract", () => {
  it("responds as an event stream, not JSON", async () => {
    signedIn();
    const res = await POST(post(conversation(2)));

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/event-stream");
    // Asks intermediaries not to buffer: streaming that arrives all at once in
    // production looks like success while delivering none of the benefit.
    expect(res.headers.get("X-Accel-Buffering")).toBe("no");
    expect(res.headers.get("Cache-Control")).toContain("no-transform");
  });

  it("serializes every service event, terminator included", async () => {
    signedIn();
    vi.mocked(chatStream).mockReturnValue(
      streamOf([
        { type: "text", delta: "Hel" },
        { type: "text", delta: "lo" },
        { type: "action", action: 'Created collection "Rome"' },
        { type: "done" },
      ]),
    );

    const events = await readEvents(await POST(post(conversation(2))));

    expect(events).toEqual([
      { type: "text", delta: "Hel" },
      { type: "text", delta: "lo" },
      { type: "action", action: 'Created collection "Rome"' },
      { type: "done" },
    ]);
  });

  // A stream that dies silently is indistinguishable from a finished reply, so
  // an unexpected failure must still reach the client as an error event.
  it("sends an error event when the stream blows up mid-flight", async () => {
    signedIn();
    vi.mocked(chatStream).mockReturnValue(
      (async function* () {
        yield { type: "text", delta: "partial" } as never;
        throw new Error("kaboom");
      })(),
    );

    const events = await readEvents(await POST(post(conversation(2))));

    expect(events[0]).toEqual({ type: "text", delta: "partial" });
    expect(events.at(-1)).toMatchObject({ type: "error" });
  });

  // Text containing a blank line must not be read as an SSE record boundary.
  it("survives a delta containing a blank line", async () => {
    signedIn();
    vi.mocked(chatStream).mockReturnValue(
      streamOf([{ type: "text", delta: "a\n\nb" }, { type: "done" }]),
    );

    const events = await readEvents(await POST(post(conversation(2))));
    expect(events[0]).toEqual({ type: "text", delta: "a\n\nb" });
  });

  // The whole point of the slice: the route must forward each event as it is
  // produced, not accumulate the reply and send it at the end. Proven without
  // timers — the first event is read back *while* the generator is still
  // suspended, which is impossible if the response were buffered.
  it("flushes events before the generator has finished", async () => {
    signedIn();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let finished = false;

    vi.mocked(chatStream).mockReturnValue(
      (async function* () {
        yield { type: "text", delta: "first" } as never;
        await gate;
        yield { type: "text", delta: "second" } as never;
        yield { type: "done" } as never;
        finished = true;
      })(),
    );

    const res = await POST(post(conversation(2)));
    const reader = res.body!.getReader();

    const { value } = await reader.read();
    expect(new TextDecoder().decode(value)).toContain("first");
    expect(finished).toBe(false); // still mid-flight

    release();
    const rest: string[] = [];
    for (;;) {
      const { done, value: chunk } = await reader.read();
      if (done) break;
      rest.push(new TextDecoder().decode(chunk));
    }
    expect(rest.join("")).toContain("second");
    expect(finished).toBe(true);
  });
});
