import { describe, it, expect, vi, beforeEach } from "vitest";
import { userRepository } from "@/repositories/user.repository";
import { sessionRepository } from "@/repositories/session.repository";
import { NotFoundError } from "@/lib/errors";
import { isDemoAvailable, startDemoSession } from "./demo.service";

vi.mock("@/repositories/user.repository", () => ({
  userRepository: { findDemo: vi.fn() },
}));
vi.mock("@/repositories/session.repository", () => ({
  sessionRepository: { create: vi.fn(), deleteExpiredForUser: vi.fn() },
}));

const demoUser = { id: "demo-user-id", isDemo: true };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("isDemoAvailable", () => {
  it("is true when a demo tenant is seeded", async () => {
    vi.mocked(userRepository.findDemo).mockResolvedValue(demoUser as never);
    expect(await isDemoAvailable()).toBe(true);
  });

  it("is false when none is seeded, so the UI can hide the entry point", async () => {
    vi.mocked(userRepository.findDemo).mockResolvedValue(null);
    expect(await isDemoAvailable()).toBe(false);
  });
});

describe("startDemoSession", () => {
  it("mints a session for the demo tenant", async () => {
    vi.mocked(userRepository.findDemo).mockResolvedValue(demoUser as never);

    const session = await startDemoSession();

    expect(sessionRepository.create).toHaveBeenCalledWith({
      sessionToken: session.sessionToken,
      userId: "demo-user-id",
      expires: session.expires,
    });
    expect(session.expires.getTime()).toBeGreaterThan(Date.now());
  });

  it("takes the user id from the is_demo flag, never from a caller", async () => {
    vi.mocked(userRepository.findDemo).mockResolvedValue(demoUser as never);

    await startDemoSession();

    // The only lookup is by flag: there is no argument an attacker could supply
    // to obtain a session for a different tenant.
    expect(userRepository.findDemo).toHaveBeenCalledWith();
    expect(startDemoSession.length).toBe(0);
  });

  it("mints an unguessable token, and a fresh one each time", async () => {
    vi.mocked(userRepository.findDemo).mockResolvedValue(demoUser as never);

    const first = await startDemoSession();
    const second = await startDemoSession();

    expect(first.sessionToken).not.toBe(second.sessionToken);
    expect(first.sessionToken).toMatch(/^[0-9a-f]{64}$/);
  });

  it("sweeps the tenant's expired sessions before adding another", async () => {
    vi.mocked(userRepository.findDemo).mockResolvedValue(demoUser as never);

    await startDemoSession();

    expect(sessionRepository.deleteExpiredForUser).toHaveBeenCalledWith(
      "demo-user-id",
    );
  });

  it("raises NotFoundError when no demo tenant is seeded", async () => {
    vi.mocked(userRepository.findDemo).mockResolvedValue(null);

    await expect(startDemoSession()).rejects.toThrow(NotFoundError);
    expect(sessionRepository.create).not.toHaveBeenCalled();
  });
});
