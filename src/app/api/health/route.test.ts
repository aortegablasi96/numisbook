import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";
import { checkHealth } from "@/services/health.service";

vi.mock("@/services/health.service", () => ({ checkHealth: vi.fn() }));

const mocked = vi.mocked(checkHealth);

beforeEach(() => vi.clearAllMocks());

describe("GET /api/health", () => {
  it("returns 200 when healthy", async () => {
    mocked.mockResolvedValue({ status: "ok", uptimeSeconds: 5, db: "up" });

    const res = await GET();

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ status: "ok", db: "up" });
  });

  it("returns 503 when degraded", async () => {
    mocked.mockResolvedValue({ status: "degraded", uptimeSeconds: 5, db: "down" });

    const res = await GET();

    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ status: "degraded", db: "down" });
  });
});
