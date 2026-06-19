import { describe, it, expect, vi, beforeEach } from "vitest";
import { ZodError } from "zod";
import { listValuations, recordValuation } from "./valuation.service";
import {
  valuationRepository,
  type Valuation,
} from "@/repositories/valuation.repository";
import { coinRepository } from "@/repositories/coin.repository";
import { NotFoundError } from "@/lib/errors";

vi.mock("@/repositories/valuation.repository", () => ({
  valuationRepository: { listByCoin: vi.fn(), create: vi.fn() },
}));

vi.mock("@/repositories/coin.repository", () => ({
  coinRepository: { findByIdForUser: vi.fn() },
}));

const valuations = vi.mocked(valuationRepository);
const coins = vi.mocked(coinRepository);

const ownedCoin = {
  id: "coin-1",
  collectionId: "col-1",
  issuingAuthority: null,
  category: null,
  yearFrom: null,
  yearTo: null,
  denomination: null,
  mint: null,
  metal: null,
  grade: null,
  weight: null,
  diameter: null,
  obverseDescription: null,
  reverseDescription: null,
  observations: null,
  catalogueReferences: null,
  pedigree: null,
  auctionHouse: null,
  auctionName: null,
  auctionLot: null,
  auctionDate: null,
  hammerPrice: null,
  auctionPremium: null,
  shippingCost: null,
  taxCost: null,
  finalPrice: null,
  priceCurrency: null,
  createdAt: new Date(),
};

const fakeValuation: Valuation = {
  id: "val-1",
  coinId: "coin-1",
  amount: "100.00",
  currency: "USD",
  source: "auction",
  sourceUrl: null,
  valuedAt: new Date("2026-01-01T00:00:00Z"),
  createdAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("valuation.service", () => {
  describe("listValuations", () => {
    it("returns history when the user owns the coin", async () => {
      coins.findByIdForUser.mockResolvedValue(ownedCoin);
      valuations.listByCoin.mockResolvedValue([fakeValuation]);
      expect(await listValuations("user-1", "coin-1")).toEqual([fakeValuation]);
      expect(valuations.listByCoin).toHaveBeenCalledWith("coin-1");
    });

    it("throws NotFound when the user does not own the coin", async () => {
      coins.findByIdForUser.mockResolvedValue(null);
      await expect(listValuations("user-1", "coin-x")).rejects.toBeInstanceOf(
        NotFoundError,
      );
      expect(valuations.listByCoin).not.toHaveBeenCalled();
    });
  });

  describe("recordValuation", () => {
    it("records a valuation, normalizing amount and currency and keeping the link", async () => {
      coins.findByIdForUser.mockResolvedValue(ownedCoin);
      valuations.create.mockResolvedValue(fakeValuation);
      await recordValuation("user-1", "coin-1", {
        amount: 100,
        currency: "usd",
        source: "auction",
        sourceUrl: "https://example.com/lot/42",
        valuedAt: "2026-01-01T00:00:00Z",
      });
      expect(valuations.create).toHaveBeenCalledWith({
        coinId: "coin-1",
        amount: "100.00",
        currency: "USD",
        source: "auction",
        sourceUrl: "https://example.com/lot/42",
        valuedAt: new Date("2026-01-01T00:00:00Z"),
      });
    });

    it("defaults source and link to null when omitted", async () => {
      coins.findByIdForUser.mockResolvedValue(ownedCoin);
      valuations.create.mockResolvedValue(fakeValuation);
      await recordValuation("user-1", "coin-1", {
        amount: 100,
        currency: "USD",
        valuedAt: "2026-01-01T00:00:00Z",
      });
      expect(valuations.create).toHaveBeenCalledWith(
        expect.objectContaining({ source: null, sourceUrl: null }),
      );
    });

    it("rejects an invalid link URL", async () => {
      await expect(
        recordValuation("user-1", "coin-1", {
          amount: 10,
          currency: "USD",
          sourceUrl: "not-a-url",
          valuedAt: "2026-01-01",
        }),
      ).rejects.toBeInstanceOf(ZodError);
      expect(valuations.create).not.toHaveBeenCalled();
    });

    it("rejects invalid input before any DB access", async () => {
      await expect(
        recordValuation("user-1", "coin-1", {
          amount: -5,
          currency: "USD",
          valuedAt: "2026-01-01",
        }),
      ).rejects.toBeInstanceOf(ZodError);
      expect(coins.findByIdForUser).not.toHaveBeenCalled();
      expect(valuations.create).not.toHaveBeenCalled();
    });

    it("rejects a non-ISO currency code", async () => {
      await expect(
        recordValuation("user-1", "coin-1", {
          amount: 10,
          currency: "dollars",
          valuedAt: "2026-01-01",
        }),
      ).rejects.toBeInstanceOf(ZodError);
    });

    it("rejects a future valuation date", async () => {
      const future = new Date(Date.now() + 86_400_000).toISOString();
      await expect(
        recordValuation("user-1", "coin-1", {
          amount: 10,
          currency: "USD",
          valuedAt: future,
        }),
      ).rejects.toBeInstanceOf(ZodError);
    });

    it("throws NotFound when the user does not own the coin", async () => {
      coins.findByIdForUser.mockResolvedValue(null);
      await expect(
        recordValuation("user-1", "coin-x", {
          amount: 10,
          currency: "USD",
          valuedAt: "2026-01-01",
        }),
      ).rejects.toBeInstanceOf(NotFoundError);
      expect(valuations.create).not.toHaveBeenCalled();
    });
  });
});
