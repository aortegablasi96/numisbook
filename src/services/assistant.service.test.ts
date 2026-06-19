import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildHandlers } from "./assistant.service";
import * as collectionService from "@/services/collection.service";
import * as coinService from "@/services/coin.service";
import * as valuationService from "@/services/valuation.service";
import * as analyticsService from "@/services/analytics.service";

vi.mock("@/services/collection.service", () => ({
  listCollections: vi.fn(),
  createCollection: vi.fn(),
  renameCollection: vi.fn(),
  deleteCollection: vi.fn(),
}));
vi.mock("@/services/coin.service", () => ({
  listCoins: vi.fn(),
  addCoin: vi.fn(),
  editCoin: vi.fn(),
  deleteCoin: vi.fn(),
}));
vi.mock("@/services/valuation.service", () => ({
  listValuations: vi.fn(),
  recordValuation: vi.fn(),
}));
vi.mock("@/services/analytics.service", () => ({
  getPortfolioSummary: vi.fn(),
}));
vi.mock("@/services/coinImage.service", () => ({
  setCoinImage: vi.fn(),
}));
vi.mock("@/repositories/user.repository", () => ({
  userRepository: { findById: vi.fn() },
}));

const collections = vi.mocked(collectionService);
const coins = vi.mocked(coinService);
const valuations = vi.mocked(valuationService);
const analytics = vi.mocked(analyticsService);

const USER = "user-1";

beforeEach(() => vi.clearAllMocks());

describe("assistant handlers — tenant scoping", () => {
  // The security invariant: the model never supplies a userId; every handler
  // forwards the server-captured user id to the domain service.
  it("injects the acting user's id into every read and write", async () => {
    const actions: string[] = [];
    const h = buildHandlers(USER, actions);

    // Mutating handlers read fields off the result; give them shapes to return.
    const collection = { id: "c1", userId: USER, name: "Rome", createdAt: new Date() };
    const coin = {
      id: "k1",
      collectionId: "c1",
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
    collections.createCollection.mockResolvedValue(collection);
    collections.renameCollection.mockResolvedValue(collection);
    coins.addCoin.mockResolvedValue(coin);
    coins.editCoin.mockResolvedValue(coin);
    valuations.recordValuation.mockResolvedValue({
      id: "v1",
      coinId: "k1",
      amount: "100.00",
      currency: "USD",
      source: null,
      sourceUrl: null,
      valuedAt: new Date(),
      createdAt: new Date(),
    });

    await h.list_collections();
    expect(collections.listCollections).toHaveBeenCalledWith(USER);

    await h.create_collection({ name: "Rome" });
    expect(collections.createCollection).toHaveBeenCalledWith(USER, "Rome");

    await h.rename_collection({ collectionId: "c1", name: "Greek" });
    expect(collections.renameCollection).toHaveBeenCalledWith(USER, "c1", "Greek");

    await h.delete_collection({ collectionId: "c1" });
    expect(collections.deleteCollection).toHaveBeenCalledWith(USER, "c1");

    await h.list_coins({ collectionId: "c1" });
    expect(coins.listCoins).toHaveBeenCalledWith(USER, "c1");

    await h.add_coin({ collectionId: "c1", category: "Romans", metal: "silver" });
    expect(coins.addCoin).toHaveBeenCalledWith(USER, "c1", {
      category: "Romans",
      metal: "silver",
    });

    await h.edit_coin({ coinId: "k1", grade: "VF" });
    expect(coins.editCoin).toHaveBeenCalledWith(USER, "k1", { grade: "VF" });

    await h.delete_coin({ coinId: "k1" });
    expect(coins.deleteCoin).toHaveBeenCalledWith(USER, "k1");

    await h.list_valuations({ coinId: "k1" });
    expect(valuations.listValuations).toHaveBeenCalledWith(USER, "k1");

    await h.record_valuation({
      coinId: "k1",
      amount: 100,
      currency: "USD",
      valuedAt: "2026-01-01",
    });
    expect(valuations.recordValuation).toHaveBeenCalledWith(USER, "k1", {
      amount: 100,
      currency: "USD",
      valuedAt: "2026-01-01",
    });

    await h.get_portfolio_summary();
    // The user's saved base-currency preference is resolved and forwarded;
    // with no stored preference it falls back to null (auto).
    expect(analytics.getPortfolioSummary).toHaveBeenCalledWith(USER, null);
  });

  it("logs mutations (not reads) to the actions list", async () => {
    const actions: string[] = [];
    const h = buildHandlers(USER, actions);

    collections.createCollection.mockResolvedValue({
      id: "c1",
      userId: USER,
      name: "Rome",
      createdAt: new Date(),
    });
    coins.addCoin.mockResolvedValue({
      id: "k1",
      collectionId: "c1",
      issuingAuthority: null,
      category: "Romans",
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
    });

    await h.list_collections();
    expect(actions).toHaveLength(0); // reads don't log

    await h.create_collection({ name: "Rome" });
    await h.add_coin({ collectionId: "c1", category: "Romans" });
    expect(actions).toEqual([
      'Created collection "Rome"',
      'Added coin "Romans"',
    ]);
  });
});
