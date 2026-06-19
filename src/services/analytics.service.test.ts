import { describe, it, expect, vi, beforeEach } from "vitest";
import { getPortfolioSummary, getCollectionCosts } from "./analytics.service";
import {
  analyticsRepository,
  type PortfolioCoinRow,
} from "@/repositories/analytics.repository";
import { buildConverter, type Converter } from "@/services/fx.service";

vi.mock("@/repositories/analytics.repository", () => ({
  analyticsRepository: { coinsForUser: vi.fn() },
}));

vi.mock("@/services/fx.service", () => ({ buildConverter: vi.fn() }));

const repo = vi.mocked(analyticsRepository);
const fx = vi.mocked(buildConverter);

function row(
  partial: Partial<PortfolioCoinRow> & Pick<PortfolioCoinRow, "coinId">,
): PortfolioCoinRow {
  return {
    metal: null,
    category: null,
    issuingAuthority: null,
    yearFrom: null,
    yearTo: null,
    mint: null,
    collectionId: "col",
    collectionName: "Collection",
    hammerPrice: null,
    auctionPremium: null,
    shippingCost: null,
    taxCost: null,
    finalPrice: null,
    priceCurrency: null,
    auctionDate: null,
    firstImageId: null,
    ...partial,
  };
}

// A converter that multiplies each currency's amount by a fixed factor into the
// base currency; an absent factor means "unconvertible" (null). Date-agnostic.
function fakeConverter(base: string, factors: Record<string, number>): Converter {
  const apply = (amount: number, from: string) =>
    factors[from] == null ? null : amount * factors[from];
  return {
    base,
    convert: (amount, from) => apply(amount, from),
    convertLatest: (amount, from) => apply(amount, from),
  };
}

// Coins with prices paid, ascending by acquisition date (as the repo returns).
// C1/C2 are partitioned (hammer+premium+shipping = final); C3 has only a final
// price (unsplit). C4 has no price → excluded from priced figures.
const coins: PortfolioCoinRow[] = [
  row({ coinId: "C1", hammerPrice: "80.00", auctionPremium: "15.00", shippingCost: "5.00", finalPrice: "100.00", priceCurrency: "USD", metal: "gold", category: "Romans", collectionId: "rome", collectionName: "Rome", auctionDate: "2024-06-01" }),
  row({ coinId: "C2", hammerPrice: "150.00", auctionPremium: "40.00", shippingCost: "10.00", finalPrice: "200.00", priceCurrency: "EUR", metal: "silver", category: "Greek", collectionId: "greek", collectionName: "Greek", auctionDate: "2025-03-01" }),
  row({ coinId: "C3", finalPrice: "50.00", priceCurrency: "USD", metal: "gold", category: "Romans", collectionId: "rome", collectionName: "Rome", auctionDate: "2025-06-01" }),
  row({ coinId: "C4", metal: "gold" }), // no price
];

beforeEach(() => {
  vi.clearAllMocks();
  // 1 EUR = 1.1 USD; USD identity.
  fx.mockResolvedValue(fakeConverter("USD", { USD: 1, EUR: 1.1 }));
});

describe("getPortfolioSummary", () => {
  it("returns an empty summary when there are no coins", async () => {
    repo.coinsForUser.mockResolvedValue([]);
    const summary = await getPortfolioSummary("user-1", "EUR");
    expect(summary.totalCoins).toBe(0);
    expect(summary.pricedCoins).toBe(0);
    expect(summary.totalFinal).toBe(0);
    expect(summary.baseCurrency).toBe("EUR");
    expect(summary.costBreakdown).toEqual({
      hammer: 0,
      premium: 0,
      shipping: 0,
      tax: 0,
      unsplit: 0,
    });
    expect(summary.events).toEqual([]);
    expect(fx).not.toHaveBeenCalled();
  });

  it("returns an empty summary when coins exist but none have a price", async () => {
    repo.coinsForUser.mockResolvedValue([row({ coinId: "X", metal: "gold" })]);
    const summary = await getPortfolioSummary("user-1", "USD");
    expect(summary.totalCoins).toBe(1);
    expect(summary.pricedCoins).toBe(0);
    expect(summary.totalFinal).toBe(0);
    expect(fx).not.toHaveBeenCalled();
  });

  it("totals the final price paid in the base currency", async () => {
    repo.coinsForUser.mockResolvedValue(coins);
    const summary = await getPortfolioSummary("user-1", "USD");

    expect(summary.totalCoins).toBe(4);
    expect(summary.pricedCoins).toBe(3);
    expect(summary.baseCurrency).toBe("USD");
    // final: 100 + 200€→220 + 50 = 370.
    expect(summary.totalFinal).toBe(370);
    expect(summary.unconvertible).toBe(0);
  });

  it("splits cost into hammer/premium/shipping/tax and keeps final-only coins whole", async () => {
    repo.coinsForUser.mockResolvedValue(coins);
    const summary = await getPortfolioSummary("user-1", "USD");
    expect(summary.costBreakdown).toEqual({
      hammer: 245, // 80 + 150€→165
      premium: 59, // 15 + 40€→44
      shipping: 16, // 5 + 10€→11
      tax: 0, // none of the fixture coins carry tax
      unsplit: 50, // C3, final only
    });
    // The components reconstitute the total paid.
    const { hammer, premium, shipping, tax, unsplit } = summary.costBreakdown;
    expect(hammer + premium + shipping + tax + unsplit).toBe(summary.totalFinal);
  });

  it("includes tax as a partition component and in the event split", async () => {
    repo.coinsForUser.mockResolvedValue([
      row({ coinId: "T1", hammerPrice: "100.00", auctionPremium: "20.00", shippingCost: "5.00", taxCost: "25.00", finalPrice: "150.00", priceCurrency: "USD", category: "Romans", auctionDate: "2024-04-01" }),
    ]);
    const summary = await getPortfolioSummary("user-1", "USD");
    expect(summary.costBreakdown).toEqual({
      hammer: 100,
      premium: 20,
      shipping: 5,
      tax: 25,
      unsplit: 0,
    });
    const [event] = summary.events;
    expect(event.tax).toBe(25);
    expect(event.hammer + event.premium + event.shipping + event.tax + event.unsplit).toBeCloseTo(event.amount);
  });

  it("emits one acquisition event per dated, convertible coin", async () => {
    repo.coinsForUser.mockResolvedValue(coins);
    const summary = await getPortfolioSummary("user-1", "USD");
    expect(summary.events).toEqual([
      { id: "C1", label: "Romans", date: "2024-06-01", amount: 100, hammer: 80, premium: 15, shipping: 5, tax: 0, unsplit: 0, metal: "gold", category: "Romans", collection: "Rome", year: "2024", currency: "USD", imageId: null },
      { id: "C2", label: "Greek", date: "2025-03-01", amount: 220, hammer: 165, premium: 44, shipping: 11, tax: 0, unsplit: 0, metal: "silver", category: "Greek", collection: "Greek", year: "2025", currency: "EUR", imageId: null },
      { id: "C3", label: "Romans", date: "2025-06-01", amount: 50, hammer: 0, premium: 0, shipping: 0, tax: 0, unsplit: 50, metal: "gold", category: "Romans", collection: "Rome", year: "2025", currency: "USD", imageId: null },
    ]);
  });

  it("carries each coin's first image id onto its event (null when none)", async () => {
    repo.coinsForUser.mockResolvedValue([
      row({ coinId: "I1", finalPrice: "10.00", priceCurrency: "USD", auctionDate: "2024-01-01", firstImageId: "img-1" }),
      row({ coinId: "I2", finalPrice: "20.00", priceCurrency: "USD", auctionDate: "2024-02-01" }),
    ]);
    const summary = await getPortfolioSummary("user-1", "USD");
    expect(summary.events.map((e) => e.imageId)).toEqual(["img-1", null]);
  });

  it("attaches per-coin cost components that sum to the coin's total", async () => {
    repo.coinsForUser.mockResolvedValue(coins);
    const summary = await getPortfolioSummary("user-1", "USD");
    for (const e of summary.events) {
      expect(e.hammer + e.premium + e.shipping + e.tax + e.unsplit).toBeCloseTo(e.amount);
    }
    // Partitioned coins split; final-only coins carry their whole cost in unsplit.
    const c2 = summary.events.find((e) => e.id === "C2")!;
    expect(c2.unsplit).toBe(0);
    const c3 = summary.events.find((e) => e.id === "C3")!;
    expect({ hammer: c3.hammer, premium: c3.premium, shipping: c3.shipping }).toEqual({
      hammer: 0,
      premium: 0,
      shipping: 0,
    });
  });

  it("labels missing metal/category and excludes undated coins from events", async () => {
    repo.coinsForUser.mockResolvedValue([
      row({ coinId: "D1", finalPrice: "10.00", priceCurrency: "USD", auctionDate: "2024-01-01" }),
      row({ coinId: "D2", finalPrice: "20.00", priceCurrency: "USD" }), // no date
    ]);
    const summary = await getPortfolioSummary("user-1", "USD");
    expect(summary.events).toEqual([
      { id: "D1", label: "Untitled coin", date: "2024-01-01", amount: 10, hammer: 0, premium: 0, shipping: 0, tax: 0, unsplit: 10, metal: "Unknown", category: "Uncategorized", collection: "Collection", year: "2024", currency: "USD", imageId: null },
    ]);
    // Both coins still count toward the total (the undated one just has no point).
    expect(summary.totalFinal).toBe(30);
  });

  it("defaults the base to the dominant price currency when unset", async () => {
    repo.coinsForUser.mockResolvedValue(coins);
    const summary = await getPortfolioSummary("user-1", null);
    expect(summary.baseCurrency).toBe("USD"); // 2 USD coins vs 1 EUR
    expect(fx).toHaveBeenCalledWith("USD", expect.any(Array), expect.any(Date), expect.any(Date));
  });

  it("counts prices no rate can convert as unconvertible", async () => {
    fx.mockResolvedValue(fakeConverter("USD", { USD: 1 })); // EUR has no rate
    repo.coinsForUser.mockResolvedValue(coins);
    const summary = await getPortfolioSummary("user-1", "USD");
    // C2 (EUR) excluded; final 100 + 50 = 150.
    expect(summary.totalFinal).toBe(150);
    expect(summary.unconvertible).toBe(1);
    expect(summary.costBreakdown).toEqual({
      hammer: 80,
      premium: 15,
      shipping: 5,
      tax: 0,
      unsplit: 50,
    });
    expect(summary.events.map((e) => e.currency)).toEqual(["USD", "USD"]);
  });

  it("falls back to the current rate when the acquisition-day rate is missing", async () => {
    // EUR has no acquisition-day rate (convert → null) but a current rate exists
    // (convertLatest → 1.1). The EUR coin must convert via the fallback, not be
    // dropped as unconvertible.
    fx.mockResolvedValue({
      base: "USD",
      convert: (amount, from) => (from === "USD" ? amount : null),
      convertLatest: (amount, from) => (from === "USD" ? amount : amount * 1.1),
    });
    repo.coinsForUser.mockResolvedValue(coins);
    const summary = await getPortfolioSummary("user-1", "USD");
    // Same total as the all-rates case: 100 + 220 + 50 = 370.
    expect(summary.totalFinal).toBe(370);
    expect(summary.unconvertible).toBe(0);
  });
});

describe("getCollectionCosts", () => {
  it("rolls up the converted cost paid per collection", async () => {
    repo.coinsForUser.mockResolvedValue(coins);
    const result = await getCollectionCosts("user-1", "USD");
    expect(result.baseCurrency).toBe("USD");
    // rome: C1 100 + C3 50 = 150; greek: C2 200€ → 220.
    expect(result.totalPaid).toEqual({ rome: 150, greek: 220 });
  });

  it("returns empty totals (and skips FX) when nothing is priced", async () => {
    repo.coinsForUser.mockResolvedValue([row({ coinId: "X", metal: "gold" })]);
    const result = await getCollectionCosts("user-1", "USD");
    expect(result.totalPaid).toEqual({});
    expect(fx).not.toHaveBeenCalled();
  });

  it("leaves unconvertible prices out of a collection's total", async () => {
    repo.coinsForUser.mockResolvedValue([
      row({ coinId: "A", finalPrice: "10.00", priceCurrency: "USD", collectionId: "rome", auctionDate: "2024-01-01" }),
      row({ coinId: "B", finalPrice: "99.00", priceCurrency: "XYZ", collectionId: "rome", auctionDate: "2024-01-01" }),
    ]);
    const result = await getCollectionCosts("user-1", "USD");
    expect(result.totalPaid).toEqual({ rome: 10 });
  });
});
