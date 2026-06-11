import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildConverter } from "./fx.service";
import { fxRateRepository } from "@/repositories/fxRate.repository";
import { fxRateProvider } from "@/lib/fx";

vi.mock("@/repositories/fxRate.repository", () => ({
  fxRateRepository: {
    ratesInRange: vi.fn(),
    rateDateBounds: vi.fn(),
    upsertMany: vi.fn(),
  },
}));

vi.mock("@/lib/fx", () => ({
  fxRateProvider: { timeSeries: vi.fn() },
}));

const repo = vi.mocked(fxRateRepository);
const provider = vi.mocked(fxRateProvider);

// Units of currency per 1 EUR.
const cached = [
  { rateDate: "2026-01-01", currency: "USD", rate: "1.10" },
  { rateDate: "2026-02-01", currency: "USD", rate: "1.20" },
  { rateDate: "2026-01-01", currency: "GBP", rate: "0.80" },
];

const min = new Date("2026-01-01");
const max = new Date("2026-02-01");

beforeEach(() => {
  vi.clearAllMocks();
  // Default: cache is fresh (recent end) and reaches back to the oldest needed
  // date (2026-01-01), so no provider fetch happens.
  const today = new Date().toISOString().slice(0, 10);
  repo.rateDateBounds.mockResolvedValue({
    USD: { min: "2026-01-01", max: today },
    GBP: { min: "2026-01-01", max: today },
  });
  repo.ratesInRange.mockResolvedValue(cached);
  repo.upsertMany.mockResolvedValue(undefined);
  // The provider contract is to resolve to {} (never throw/undefined) when it
  // has nothing; individual tests override this when they assert a fetch.
  provider.timeSeries.mockResolvedValue({});
});

describe("buildConverter — conversion via the EUR pivot", () => {
  it("treats EUR as the pivot (rate 1) in both directions", async () => {
    const c = await buildConverter("USD", ["EUR", "USD"], min, max);
    // 100 EUR → USD at the latest USD rate (1.20).
    expect(c.convertLatest(100, "EUR")).toBeCloseTo(120, 5);
    // A USD amount with a USD base is identity.
    expect(c.convertLatest(50, "USD")).toBeCloseTo(50, 5);
  });

  it("uses the rate on or before the given date for historical conversion", async () => {
    const c = await buildConverter("USD", ["GBP", "USD"], min, max);
    // 80 GBP → USD on 2026-01-15: GBP/EUR=0.80, USD/EUR=1.10 (the 2026-01-01
    // rate, since none later than the 15th exists) → 80 / 0.80 * 1.10 = 110.
    expect(c.convert(80, "GBP", new Date("2026-01-15"))).toBeCloseTo(110, 5);
  });

  it("uses the latest known rate for the current snapshot", async () => {
    const c = await buildConverter("EUR", ["USD"], min, max);
    // 120 USD → EUR at the latest USD rate (1.20): 120 / 1.20 = 100.
    expect(c.convertLatest(120, "USD")).toBeCloseTo(100, 5);
  });

  it("returns null when no rate covers the currency (unconvertible)", async () => {
    const c = await buildConverter("USD", ["JPY"], min, max);
    expect(c.convertLatest(1000, "JPY")).toBeNull();
    expect(c.convert(1000, "JPY", new Date("2026-01-15"))).toBeNull();
  });
});

describe("buildConverter — cache and provider orchestration", () => {
  it("does not fetch when the cache is fresh", async () => {
    await buildConverter("USD", ["GBP", "USD"], min, max);
    expect(provider.timeSeries).not.toHaveBeenCalled();
  });

  it("fetches and upserts stale/missing currencies", async () => {
    repo.rateDateBounds.mockResolvedValue({}); // nothing cached → stale
    provider.timeSeries.mockResolvedValue({
      "2026-02-01": { USD: 1.2 },
      "2026-01-01": { USD: 1.1 },
    });

    await buildConverter("USD", ["USD"], min, max);

    expect(provider.timeSeries).toHaveBeenCalledOnce();
    expect(repo.upsertMany).toHaveBeenCalledWith(
      expect.arrayContaining([
        { rateDate: "2026-02-01", currency: "USD", rate: "1.2" },
        { rateDate: "2026-01-01", currency: "USD", rate: "1.1" },
      ]),
    );
  });

  it("refetches when the recent end is fresh but history is missing", async () => {
    // Cache holds only recent rates (fresh max) but does not reach back to the
    // oldest needed date — historical conversions would otherwise find no rate.
    const today = new Date().toISOString().slice(0, 10);
    repo.rateDateBounds.mockResolvedValue({
      USD: { min: "2026-01-20", max: today },
    });

    await buildConverter("USD", ["USD"], new Date("2026-01-01"), max);

    expect(provider.timeSeries).toHaveBeenCalledOnce();
  });

  it("falls back to cached rates when the provider is unreachable", async () => {
    repo.rateDateBounds.mockResolvedValue({}); // triggers a fetch attempt
    provider.timeSeries.mockResolvedValue({}); // offline → empty

    const c = await buildConverter("USD", ["GBP", "USD"], min, max);

    // Conversion still works from the cached rows.
    expect(c.convertLatest(100, "EUR")).toBeCloseTo(120, 5);
  });
});
