import { describe, it, expect, vi, beforeEach } from "vitest";
import { checkHealth } from "./health.service";
import { healthRepository } from "@/repositories/health.repository";

vi.mock("@/repositories/health.repository", () => ({
  healthRepository: { ping: vi.fn() },
}));
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

const repo = vi.mocked(healthRepository);

beforeEach(() => vi.clearAllMocks());

describe("checkHealth", () => {
  it("reports ok when the database responds", async () => {
    repo.ping.mockResolvedValue(undefined);

    const report = await checkHealth();

    expect(report.status).toBe("ok");
    expect(report.db).toBe("up");
    expect(report.uptimeSeconds).toBeGreaterThanOrEqual(0);
  });

  it("reports degraded when the database ping fails", async () => {
    repo.ping.mockRejectedValue(new Error("ECONNREFUSED"));

    const report = await checkHealth();

    expect(report.status).toBe("degraded");
    expect(report.db).toBe("down");
  });
});
