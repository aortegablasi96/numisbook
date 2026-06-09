import { describe, it, expect, vi, beforeEach } from "vitest";
import { getPortfolioSummary } from "./analytics.service";
import {
  analyticsRepository,
  type PortfolioValuationRow,
} from "@/repositories/analytics.repository";

vi.mock("@/repositories/analytics.repository", () => ({
  analyticsRepository: {
    valuationsWithCoinForUser: vi.fn(),
    coinCountForUser: vi.fn(),
  },
}));

const repo = vi.mocked(analyticsRepository);

function row(
  partial: Partial<PortfolioValuationRow> &
    Pick<PortfolioValuationRow, "coinId" | "amount" | "currency" | "valuedAt">,
): PortfolioValuationRow {
  return {
    metal: null,
    category: null,
    collectionId: "col",
    collectionName: "Collection",
    ...partial,
  };
}

// Ascending by valuedAt, as the repository returns them.
const history: PortfolioValuationRow[] = [
  row({ coinId: "A", amount: "100.00", currency: "USD", valuedAt: new Date("2026-01-01"), metal: "gold", collectionName: "Rome" }),
  row({ coinId: "B", amount: "50.00", currency: "USD", valuedAt: new Date("2026-02-01"), metal: "silver", collectionName: "Greek" }),
  row({ coinId: "D", amount: "200.00", currency: "EUR", valuedAt: new Date("2026-02-10"), metal: null, collectionName: "Greek" }),
  row({ coinId: "C", amount: "80.00", currency: "USD", valuedAt: new Date("2026-02-15"), metal: "gold", collectionName: "Rome" }),
  row({ coinId: "A", amount: "120.00", currency: "USD", valuedAt: new Date("2026-03-01"), metal: "gold", collectionName: "Rome" }),
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getPortfolioSummary", () => {
  it("returns an empty summary when there are no valuations", async () => {
    repo.valuationsWithCoinForUser.mockResolvedValue([]);
    repo.coinCountForUser.mockResolvedValue(3);

    const summary = await getPortfolioSummary("user-1");
    expect(summary.totalCoins).toBe(3);
    expect(summary.valuedCoins).toBe(0);
    expect(summary.totalsByCurrency).toEqual([]);
    expect(summary.primaryCurrency).toBeNull();
    expect(summary.allocationByMetal).toEqual([]);
    expect(summary.allocationByCollection).toEqual([]);
    expect(summary.trend).toEqual([]);
  });

  it("uses each coin's latest valuation and totals per currency", async () => {
    repo.valuationsWithCoinForUser.mockResolvedValue(history);
    repo.coinCountForUser.mockResolvedValue(5);

    const summary = await getPortfolioSummary("user-1");

    // 4 distinct coins valued (A, B, C, D); 5 total exist.
    expect(summary.valuedCoins).toBe(4);
    expect(summary.totalCoins).toBe(5);

    // USD uses A's latest (120) + B(50) + C(80) = 250; EUR = 200. Largest first.
    expect(summary.totalsByCurrency).toEqual([
      { currency: "USD", total: 250, coinCount: 3 },
      { currency: "EUR", total: 200, coinCount: 1 },
    ]);
    expect(summary.primaryCurrency).toBe("USD");
  });

  it("allocates the primary currency by metal and collection", async () => {
    repo.valuationsWithCoinForUser.mockResolvedValue(history);
    repo.coinCountForUser.mockResolvedValue(5);

    const summary = await getPortfolioSummary("user-1");

    expect(summary.allocationByMetal).toEqual([
      { label: "gold", total: 200 }, // A(120) + C(80)
      { label: "silver", total: 50 },
    ]);
    expect(summary.allocationByCollection).toEqual([
      { label: "Rome", total: 200 },
      { label: "Greek", total: 50 },
    ]);
  });

  it("labels a missing metal as Unknown", async () => {
    repo.valuationsWithCoinForUser.mockResolvedValue([
      row({ coinId: "X", amount: "10.00", currency: "USD", valuedAt: new Date("2026-01-01"), metal: null }),
    ]);
    repo.coinCountForUser.mockResolvedValue(1);

    const summary = await getPortfolioSummary("user-1");
    expect(summary.allocationByMetal).toEqual([{ label: "Unknown", total: 10 }]);
  });

  it("builds a portfolio-value trend (primary currency, one point per day)", async () => {
    repo.valuationsWithCoinForUser.mockResolvedValue(history);
    repo.coinCountForUser.mockResolvedValue(5);

    const summary = await getPortfolioSummary("user-1");

    // EUR (coin D) is excluded; only USD movements count.
    expect(summary.trend).toEqual([
      { date: "2026-01-01", total: 100 }, // A=100
      { date: "2026-02-01", total: 150 }, // A=100, B=50
      { date: "2026-02-15", total: 230 }, // + C=80
      { date: "2026-03-01", total: 250 }, // A re-valued to 120
    ]);
  });
});
