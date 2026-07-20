import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  assertWithinLimits,
  LIMITS,
  countRequestsInWindow,
  sumTokensInWindow,
  recordUsage,
  forgetUserUsage,
} from "./assistant-limits.service";
import {
  subjectKeyForUser,
  subjectKeyForDemoSession,
} from "@/lib/assistant-subject";
import { assistantUsageRepository } from "@/repositories/assistantUsage.repository";
import { RateLimitError } from "@/lib/errors";

vi.mock("@/repositories/assistantUsage.repository", () => ({
  assistantUsageRepository: {
    record: vi.fn(),
    countSince: vi.fn(),
    sumTokensSince: vi.fn(),
    deleteBySubject: vi.fn(),
    oldestSince: vi.fn(),
    deleteOlderThan: vi.fn(),
  },
}));

const repo = vi.mocked(assistantUsageRepository);

beforeEach(() => {
  vi.clearAllMocks();
  repo.countSince.mockResolvedValue(0);
  repo.sumTokensSince.mockResolvedValue(0);
  repo.record.mockResolvedValue(undefined);
  repo.deleteBySubject.mockResolvedValue(undefined);
});

describe("subjectKeyForUser", () => {
  it("prefixes the user id", () => {
    expect(subjectKeyForUser("abc-123")).toBe("user:abc-123");
  });
});

describe("subjectKeyForDemoSession", () => {
  it("prefixes a sha256 hex digest of the session token", () => {
    expect(subjectKeyForDemoSession("tok")).toMatch(/^demo:[0-9a-f]{64}$/);
  });

  it("is deterministic for the same token", () => {
    expect(subjectKeyForDemoSession("tok")).toBe(subjectKeyForDemoSession("tok"));
  });

  it("distinguishes different sessions", () => {
    expect(subjectKeyForDemoSession("a")).not.toBe(subjectKeyForDemoSession("b"));
  });

  // The privacy property, asserted directly: a leaked backup of assistant_usage
  // must not be a set of usable session tokens. Checking the hash *format* alone
  // would still pass if the raw token were appended somewhere.
  it("never embeds the raw session token", () => {
    const token = "super-secret-session-token";
    expect(subjectKeyForDemoSession(token)).not.toContain(token);
  });
});

describe("subject key namespaces", () => {
  it("cannot collide between a user and a demo session", () => {
    // Even if a user id were somehow the same string as a session hash, the
    // prefixes keep the two budgets apart.
    const user = subjectKeyForUser("x");
    const demo = subjectKeyForDemoSession("x");
    expect(user).not.toBe(demo);
    expect(user.startsWith("user:")).toBe(true);
    expect(demo.startsWith("demo:")).toBe(true);
  });
});

describe("window helpers", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-19T12:00:00.000Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("counts requests from the start of the trailing window", async () => {
    repo.countSince.mockResolvedValue(4);

    await expect(countRequestsInWindow("user:u1", 60_000)).resolves.toBe(4);
    expect(repo.countSince).toHaveBeenCalledWith(
      "user:u1",
      new Date("2026-07-19T11:59:00.000Z"),
    );
  });

  it("sums tokens from the start of the trailing window", async () => {
    repo.sumTokensSince.mockResolvedValue(1234);

    await expect(sumTokensInWindow("demo:abc", 3_600_000)).resolves.toBe(1234);
    expect(repo.sumTokensSince).toHaveBeenCalledWith(
      "demo:abc",
      new Date("2026-07-19T11:00:00.000Z"),
    );
  });
});

describe("recordUsage", () => {
  it("passes the usage through to the repository", async () => {
    await recordUsage({
      subjectKey: "user:u1",
      promptTokens: 100,
      completionTokens: 20,
      outcome: "completed",
    });

    expect(repo.record).toHaveBeenCalledWith({
      subjectKey: "user:u1",
      promptTokens: 100,
      completionTokens: 20,
      outcome: "completed",
    });
  });
});

describe("forgetUserUsage", () => {
  it("purges using exactly the prefixed key the writes used", async () => {
    await forgetUserUsage("u1");
    expect(repo.deleteBySubject).toHaveBeenCalledWith("user:u1");
  });
});

// --- Rate limiting (#196, ADR-018 §§2,6,7) ----------------------------------

describe("assertWithinLimits", () => {
  beforeEach(() => {
    repo.oldestSince.mockResolvedValue(new Date("2026-07-19T12:00:00.000Z"));
  });

  it("allows a subject inside both budgets", async () => {
    repo.countSince.mockResolvedValue(1);
    repo.sumTokensSince.mockResolvedValue(100);
    await expect(assertWithinLimits("user:u1", false)).resolves.toBeUndefined();
  });

  it("refuses once the request budget is spent", async () => {
    repo.countSince.mockResolvedValue(LIMITS.user.requests.max);
    repo.sumTokensSince.mockResolvedValue(0);
    await expect(assertWithinLimits("user:u1", false)).rejects.toBeInstanceOf(
      RateLimitError,
    );
  });

  // Two dimensions catch different abuse: a slow drip of very expensive
  // requests never trips a request count.
  it("refuses once the token budget is spent, even with few requests", async () => {
    repo.countSince.mockResolvedValue(1);
    repo.sumTokensSince.mockResolvedValue(LIMITS.user.tokens.max);
    await expect(assertWithinLimits("user:u1", false)).rejects.toBeInstanceOf(
      RateLimitError,
    );
  });

  it("holds the demo to a tighter budget than a signed-in collector", async () => {
    expect(LIMITS.demo.requests.max).toBeLessThan(LIMITS.user.requests.max);
    expect(LIMITS.demo.tokens.max).toBeLessThan(LIMITS.user.tokens.max);

    // A load legal for a signed-in user is refused for the demo.
    repo.countSince.mockResolvedValue(LIMITS.demo.requests.max);
    repo.sumTokensSince.mockResolvedValue(0);
    await expect(assertWithinLimits("demo:abc", true)).rejects.toBeInstanceOf(
      RateLimitError,
    );
    await expect(assertWithinLimits("user:u1", false)).resolves.toBeUndefined();
  });

  // ADR-018 §6. A spend guard that opens when the store is unreachable is not a
  // guard — and this is what closes the hole left by a failed usage write.
  it("fails closed when the usage store cannot be read", async () => {
    repo.countSince.mockRejectedValue(new Error("db down"));
    repo.sumTokensSince.mockRejectedValue(new Error("db down"));
    await expect(assertWithinLimits("user:u1", false)).rejects.toBeInstanceOf(
      RateLimitError,
    );
  });

  it("reports the moment the oldest request ages out of the window", async () => {
    const oldest = new Date("2026-07-19T12:00:00.000Z");
    repo.countSince.mockResolvedValue(LIMITS.user.requests.max);
    repo.sumTokensSince.mockResolvedValue(0);
    repo.oldestSince.mockResolvedValue(oldest);

    const error = await assertWithinLimits("user:u1", false).catch((e) => e);
    expect(error).toBeInstanceOf(RateLimitError);
    expect((error as RateLimitError).retryAfter).toEqual(
      new Date(oldest.getTime() + LIMITS.user.requests.windowMs),
    );
  });

  // The guard must run before any spend, so it never calls OpenAI to find out.
  it("decides from stored usage alone", async () => {
    repo.countSince.mockResolvedValue(0);
    repo.sumTokensSince.mockResolvedValue(0);
    await assertWithinLimits("user:u1", false);
    expect(repo.countSince).toHaveBeenCalledWith("user:u1", expect.any(Date));
    expect(repo.sumTokensSince).toHaveBeenCalledWith("user:u1", expect.any(Date));
  });
});
