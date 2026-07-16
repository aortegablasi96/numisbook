import { describe, it, expect, vi, beforeEach } from "vitest";
import { ZodError } from "zod";
import {
  listCoins,
  searchCoins,
  searchAllCoins,
  getCoinFacets,
  getAllCoinFacets,
  getCoin,
  addCoin,
  editCoin,
  deleteCoin,
  listRecentAcquisitions,
  exportCoins,
  exportAllCoins,
  slugForFilename,
  buildExportFilename,
  COINS_PAGE_SIZE,
  RECENT_ACQUISITIONS_LIMIT,
  type CoinSearch,
} from "./coin.service";
import {
  coinRepository,
  type Coin,
  type CoinWithCollection,
} from "@/repositories/coin.repository";
import { collectionRepository } from "@/repositories/collection.repository";
import { buildConverter, type Converter } from "@/services/fx.service";
import { NotFoundError, ValidationError } from "@/lib/errors";

vi.mock("@/repositories/coin.repository", () => ({
  coinRepository: {
    listByCollection: vi.fn(),
    searchInCollection: vi.fn(),
    searchForUser: vi.fn(),
    getDistinctFacets: vi.fn(),
    getDistinctFacetsForUser: vi.fn(),
    listForExportInCollection: vi.fn(),
    listForExportForUser: vi.fn(),
    listRecentAcquisitionsForUser: vi.fn(),
    findByIdForUser: vi.fn(),
    create: vi.fn(),
    updateForUser: vi.fn(),
    deleteForUser: vi.fn(),
  },
}));

vi.mock("@/repositories/collection.repository", () => ({
  collectionRepository: { findByIdForUser: vi.fn() },
}));

vi.mock("@/services/fx.service", () => ({ buildConverter: vi.fn() }));

const coins = vi.mocked(coinRepository);
const collections = vi.mocked(collectionRepository);
const fx = vi.mocked(buildConverter);

const ownedCollection = {
  id: "col-1",
  userId: "user-1",
  name: "Ancient Rome",
  createdAt: new Date(),
};

const fakeCoin: Coin = {
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

beforeEach(() => {
  vi.clearAllMocks();
});

describe("coin.service", () => {
  describe("listCoins", () => {
    it("lists coins when the user owns the collection", async () => {
      collections.findByIdForUser.mockResolvedValue(ownedCollection);
      coins.listByCollection.mockResolvedValue([fakeCoin]);
      expect(await listCoins("user-1", "col-1")).toEqual([fakeCoin]);
      expect(coins.listByCollection).toHaveBeenCalledWith("col-1");
    });

    it("throws NotFound when the collection is not the user's", async () => {
      collections.findByIdForUser.mockResolvedValue(null);
      await expect(listCoins("user-1", "col-x")).rejects.toBeInstanceOf(
        NotFoundError,
      );
      expect(coins.listByCollection).not.toHaveBeenCalled();
    });
  });

  describe("searchCoins", () => {
    it("throws NotFound when the user does not own the collection", async () => {
      collections.findByIdForUser.mockResolvedValue(null);
      await expect(searchCoins("user-1", "col-x", {})).rejects.toBeInstanceOf(
        NotFoundError,
      );
      expect(coins.searchInCollection).not.toHaveBeenCalled();
    });

    it("forwards multi-value filters and computes the pagination offset", async () => {
      collections.findByIdForUser.mockResolvedValue(ownedCollection);
      coins.searchInCollection.mockResolvedValue({ coins: [fakeCoin], total: 25 });

      const result = await searchCoins("user-1", "col-1", {
        q: "  denarius ",
        metals: ["Silver", "Gold"],
        grades: ["VF", "EF"],
        yearFrom: -100,
        yearTo: -44,
        page: 2,
      });

      expect(coins.searchInCollection).toHaveBeenCalledWith("col-1", {
        q: "denarius",
        metals: ["Silver", "Gold"],
        categories: undefined,
        denominations: undefined,
        mints: undefined,
        grades: ["VF", "EF"],
        yearFrom: -100,
        yearTo: -44,
        sortBy: undefined,
        sortDir: undefined,
        limit: COINS_PAGE_SIZE,
        offset: COINS_PAGE_SIZE, // page 2 → offset = pageSize
      });
      expect(result).toEqual({
        coins: [fakeCoin],
        total: 25,
        page: 2,
        pageSize: COINS_PAGE_SIZE,
      });
    });

    it("drops empty filter lists so an absent filter is undefined, not []", async () => {
      collections.findByIdForUser.mockResolvedValue(ownedCollection);
      coins.searchInCollection.mockResolvedValue({ coins: [], total: 0 });

      await searchCoins("user-1", "col-1", { metals: [], categories: [], grades: [] });

      expect(coins.searchInCollection).toHaveBeenCalledWith(
        "col-1",
        expect.objectContaining({ metals: undefined, categories: undefined, grades: undefined }),
      );
    });

    it("defaults to page 1 and ignores non-finite year bounds", async () => {
      collections.findByIdForUser.mockResolvedValue(ownedCollection);
      coins.searchInCollection.mockResolvedValue({ coins: [], total: 0 });

      await searchCoins("user-1", "col-1", { yearFrom: Number.NaN });

      expect(coins.searchInCollection).toHaveBeenCalledWith(
        "col-1",
        expect.objectContaining({
          yearFrom: undefined,
          offset: 0,
          limit: COINS_PAGE_SIZE,
        }),
      );
    });
  });

  describe("searchAllCoins (cross-collection)", () => {
    const acrossCollections = { ...fakeCoin, collectionName: "Ancient Rome" };

    it("scopes to the acting user and never takes a collection id from the caller", async () => {
      coins.searchForUser.mockResolvedValue({ coins: [acrossCollections], total: 1 });

      const result = await searchAllCoins("user-1", { metals: ["Silver"], page: 3 });

      // Tenant isolation lives in the repository: the service passes the session
      // userId straight through, and there is no collection to check ownership of.
      expect(coins.searchForUser).toHaveBeenCalledWith(
        "user-1",
        expect.objectContaining({
          metals: ["Silver"],
          offset: COINS_PAGE_SIZE * 2,
          limit: COINS_PAGE_SIZE,
        }),
      );
      expect(collections.findByIdForUser).not.toHaveBeenCalled();
      expect(result).toEqual({
        coins: [acrossCollections],
        total: 1,
        page: 3,
        pageSize: COINS_PAGE_SIZE,
      });
    });

    it("applies the identical filter contract as the per-collection search", async () => {
      coins.searchForUser.mockResolvedValue({ coins: [], total: 0 });
      coins.searchInCollection.mockResolvedValue({ coins: [], total: 0 });
      collections.findByIdForUser.mockResolvedValue(ownedCollection);

      const search: CoinSearch = {
        q: "athens",
        metals: ["Silver"],
        mints: ["Athens"],
        grades: ["MS"],
        yearFrom: -400,
        yearTo: -300,
      };
      await searchAllCoins("user-1", { ...search });
      await searchCoins("user-1", "col-1", { ...search });

      const [, allFilters] = coins.searchForUser.mock.calls[0];
      const [, oneFilters] = coins.searchInCollection.mock.calls[0];
      expect(allFilters).toEqual(oneFilters);
    });
  });

  describe("facets", () => {
    const facets = {
      metals: ["Silver"],
      categories: ["Romans"],
      denominations: ["Denarius"],
      mints: ["Rome"],
    };

    it("throws NotFound when the user does not own the collection", async () => {
      collections.findByIdForUser.mockResolvedValue(null);
      await expect(getCoinFacets("user-1", "col-x")).rejects.toBeInstanceOf(NotFoundError);
      expect(coins.getDistinctFacets).not.toHaveBeenCalled();
    });

    it("scopes the cross-collection facets to the acting user", async () => {
      coins.getDistinctFacetsForUser.mockResolvedValue(facets);

      await expect(getAllCoinFacets("user-1")).resolves.toEqual(facets);
      // The facets query is a data read: unscoped, it would leak other collectors'
      // mint/metal values through a filter dropdown (ADR-015).
      expect(coins.getDistinctFacetsForUser).toHaveBeenCalledWith("user-1");
    });
  });

  describe("listRecentAcquisitions", () => {
    // A converter into `base` that multiplies by a per-currency factor; an absent
    // factor means unconvertible (null). Date-agnostic, like the analytics tests.
    function fakeConverter(base: string, factors: Record<string, number>): Converter {
      const apply = (amount: number, from: string) =>
        from === base ? amount : factors[from] == null ? null : amount * factors[from];
      return {
        base,
        convert: (amount, from) => apply(amount, from),
        convertLatest: (amount, from) => apply(amount, from),
      };
    }

    it("returns rows unconverted (basePrice null) when no base currency is given", async () => {
      const rows = [{ id: "coin-1", finalPrice: "100.00", priceCurrency: "USD" }] as never;
      coins.listRecentAcquisitionsForUser.mockResolvedValue(rows);
      const result = await listRecentAcquisitions("user-1", null);
      expect(coins.listRecentAcquisitionsForUser).toHaveBeenCalledWith(
        "user-1",
        RECENT_ACQUISITIONS_LIMIT,
      );
      expect(fx).not.toHaveBeenCalled();
      expect(result).toEqual([
        expect.objectContaining({ id: "coin-1", basePrice: null, baseCurrency: null }),
      ]);
    });

    it("converts each price paid to the base currency at its acquisition date", async () => {
      const rows = [
        { id: "a", finalPrice: "100.00", priceCurrency: "USD", auctionDate: "2024-06-01" },
        { id: "b", finalPrice: "200.00", priceCurrency: "EUR", auctionDate: "2025-03-01" },
        { id: "c", finalPrice: null, priceCurrency: null, auctionDate: null },
      ] as never;
      coins.listRecentAcquisitionsForUser.mockResolvedValue(rows);
      fx.mockResolvedValue(fakeConverter("EUR", { USD: 0.9 }));

      const result = await listRecentAcquisitions("user-1", "EUR");

      expect(fx).toHaveBeenCalledWith(
        "EUR",
        expect.arrayContaining(["USD", "EUR"]),
        expect.any(Date),
        expect.any(Date),
      );
      expect(result[0]).toMatchObject({ id: "a", basePrice: 90, baseCurrency: "EUR" });
      expect(result[1]).toMatchObject({ id: "b", basePrice: 200, baseCurrency: "EUR" });
      // Unpriced coin: no conversion, but still carries the resolved base.
      expect(result[2]).toMatchObject({ id: "c", basePrice: null, baseCurrency: "EUR" });
    });

    it("leaves basePrice null for a currency ECB cannot convert", async () => {
      const rows = [
        { id: "x", finalPrice: "50.00", priceCurrency: "XAU", auctionDate: "2024-01-01" },
      ] as never;
      coins.listRecentAcquisitionsForUser.mockResolvedValue(rows);
      fx.mockResolvedValue(fakeConverter("EUR", {})); // no factor for XAU

      const result = await listRecentAcquisitions("user-1", "EUR");
      expect(result[0]).toMatchObject({ id: "x", basePrice: null, baseCurrency: "EUR" });
    });

    it("skips FX entirely when no row is priced", async () => {
      coins.listRecentAcquisitionsForUser.mockResolvedValue([
        { id: "n", finalPrice: null, priceCurrency: null } as never,
      ]);
      const result = await listRecentAcquisitions("user-1", "EUR");
      expect(fx).not.toHaveBeenCalled();
      expect(result[0]).toMatchObject({ basePrice: null, baseCurrency: "EUR" });
    });

    it("clamps a fractional or below-one limit to at least one", async () => {
      coins.listRecentAcquisitionsForUser.mockResolvedValue([]);
      await listRecentAcquisitions("user-1", null, 0);
      expect(coins.listRecentAcquisitionsForUser).toHaveBeenCalledWith("user-1", 1);
      await listRecentAcquisitions("user-1", null, 3.9);
      expect(coins.listRecentAcquisitionsForUser).toHaveBeenLastCalledWith("user-1", 3);
    });
  });

  describe("getCoin", () => {
    it("returns the coin when it is in one of the user's collections", async () => {
      coins.findByIdForUser.mockResolvedValue(fakeCoin);
      expect(await getCoin("user-1", "coin-1")).toEqual(fakeCoin);
      expect(coins.findByIdForUser).toHaveBeenCalledWith("coin-1", "user-1");
    });

    it("throws NotFound when the coin is not the user's", async () => {
      coins.findByIdForUser.mockResolvedValue(null);
      await expect(getCoin("user-1", "coin-x")).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });
  });

  describe("addCoin", () => {
    it("creates a coin in an owned collection from its attributes", async () => {
      collections.findByIdForUser.mockResolvedValue(ownedCollection);
      coins.create.mockResolvedValue(fakeCoin);
      await addCoin("user-1", "col-1", { category: "Romans", yearFrom: -44, yearTo: -44 });
      expect(coins.create).toHaveBeenCalledWith({
        collectionId: "col-1",
        category: "Romans",
        yearFrom: -44,
        yearTo: -44,
      });
    });

    it("stores weight/diameter as fixed-scale strings and auctionDate as a date", async () => {
      collections.findByIdForUser.mockResolvedValue(ownedCollection);
      coins.create.mockResolvedValue(fakeCoin);
      await addCoin("user-1", "col-1", {
        denomination: "Tetradrachm",
        weight: 17.2,
        diameter: 30,
        grade: "EF",
        auctionDate: "2023-05-01",
      });
      expect(coins.create).toHaveBeenCalledWith({
        collectionId: "col-1",
        denomination: "Tetradrachm",
        weight: "17.20",
        diameter: "30.00",
        grade: "EF",
        auctionDate: "2023-05-01",
      });
    });

    it("computes final_price as the sum of the price partition (uppercasing currency)", async () => {
      collections.findByIdForUser.mockResolvedValue(ownedCollection);
      coins.create.mockResolvedValue(fakeCoin);
      await addCoin("user-1", "col-1", {
        hammerPrice: 1000,
        auctionPremium: 200,
        shippingCost: 50,
        priceCurrency: "eur",
      });
      expect(coins.create).toHaveBeenCalledWith({
        collectionId: "col-1",
        hammerPrice: "1000.00",
        auctionPremium: "200.00",
        shippingCost: "50.00",
        finalPrice: "1250.00",
        priceCurrency: "EUR",
      });
    });

    it("includes tax in the computed final_price partition sum", async () => {
      collections.findByIdForUser.mockResolvedValue(ownedCollection);
      coins.create.mockResolvedValue(fakeCoin);
      await addCoin("user-1", "col-1", {
        hammerPrice: 1000,
        auctionPremium: 200,
        shippingCost: 50,
        taxCost: 100,
      });
      expect(coins.create).toHaveBeenCalledWith({
        collectionId: "col-1",
        hammerPrice: "1000.00",
        auctionPremium: "200.00",
        shippingCost: "50.00",
        taxCost: "100.00",
        finalPrice: "1350.00",
      });
    });

    it("uses a directly-provided final_price when no partition is given", async () => {
      collections.findByIdForUser.mockResolvedValue(ownedCollection);
      coins.create.mockResolvedValue(fakeCoin);
      await addCoin("user-1", "col-1", { finalPrice: 1500, priceCurrency: "USD" });
      expect(coins.create).toHaveBeenCalledWith({
        collectionId: "col-1",
        finalPrice: "1500.00",
        priceCurrency: "USD",
      });
    });

    it("rejects invalid input before any DB access", async () => {
      await expect(
        addCoin("user-1", "col-1", { weight: -5 }),
      ).rejects.toBeInstanceOf(ZodError);
      expect(collections.findByIdForUser).not.toHaveBeenCalled();
      expect(coins.create).not.toHaveBeenCalled();
    });

    it("rejects an out-of-set grade", async () => {
      await expect(
        addCoin("user-1", "col-1", { grade: "XF" }),
      ).rejects.toBeInstanceOf(ZodError);
      expect(coins.create).not.toHaveBeenCalled();
    });

    it("rejects a year range where the start is after the end", async () => {
      await expect(
        addCoin("user-1", "col-1", { yearFrom: 100, yearTo: 50 }),
      ).rejects.toBeInstanceOf(ZodError);
      expect(coins.create).not.toHaveBeenCalled();
    });

    it("throws NotFound when the user does not own the collection", async () => {
      collections.findByIdForUser.mockResolvedValue(null);
      await expect(
        addCoin("user-1", "col-x", { category: "Romans" }),
      ).rejects.toBeInstanceOf(NotFoundError);
      expect(coins.create).not.toHaveBeenCalled();
    });
  });

  describe("editCoin", () => {
    it("updates only provided fields, scoped to the owner", async () => {
      coins.updateForUser.mockResolvedValue({ ...fakeCoin, grade: "VF" });
      const result = await editCoin("user-1", "coin-1", { grade: "VF" });
      expect(coins.updateForUser).toHaveBeenCalledWith("coin-1", "user-1", {
        grade: "VF",
      });
      expect(result.grade).toBe("VF");
    });

    it("rejects an empty patch", async () => {
      await expect(editCoin("user-1", "coin-1", {})).rejects.toBeInstanceOf(
        ValidationError,
      );
      expect(coins.updateForUser).not.toHaveBeenCalled();
    });

    it("throws NotFound when the coin is not in one of the user's collections", async () => {
      coins.updateForUser.mockResolvedValue(null);
      await expect(
        editCoin("user-1", "coin-x", { grade: "VF" }),
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe("deleteCoin", () => {
    it("deletes a coin the user owns", async () => {
      coins.deleteForUser.mockResolvedValue(true);
      await expect(deleteCoin("user-1", "coin-1")).resolves.toBeUndefined();
      expect(coins.deleteForUser).toHaveBeenCalledWith("coin-1", "user-1");
    });

    it("throws NotFound when nothing was deleted", async () => {
      coins.deleteForUser.mockResolvedValue(false);
      await expect(deleteCoin("user-1", "coin-x")).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });
  });

  // ---- CSV export (ADR-017) -------------------------------------------------

  const exportableCoin: CoinWithCollection = {
    ...fakeCoin,
    collectionName: "Ancient Rome",
  };

  /** The CSV's data rows, BOM and header row dropped. */
  const dataRows = (csv: string): string[] =>
    csv.replace(/^﻿/, "").trimEnd().split("\r\n").slice(1);

  const headerRow = (csv: string): string =>
    csv.replace(/^﻿/, "").split("\r\n")[0];

  describe("slugForFilename", () => {
    it("folds diacritics rather than dropping the word", () => {
      expect(slugForFilename("Münzen", "collection")).toBe("munzen");
    });

    it("reduces punctuation and spaces to single dashes", () => {
      expect(slugForFilename("Roman  Silver / Denarii!", "collection")).toBe(
        "roman-silver-denarii",
      );
    });

    it("strips characters that could break out of a header", () => {
      // The Content-Disposition injection vector: quotes and newlines cannot
      // survive the fold (ADR-017 §9).
      const slug = slugForFilename('evil"\r\nX-Injected: yes', "collection");
      expect(slug).not.toMatch(/["\r\n]/);
    });

    it("falls back when a name slugs away to nothing", () => {
      expect(slugForFilename("中国钱币", "collection")).toBe("collection");
      expect(slugForFilename("!!!", "collection")).toBe("collection");
    });

    it("leaves no trailing dash when a long name is truncated", () => {
      const slug = slugForFilename(`${"a".repeat(59)} tail`, "collection");
      expect(slug.endsWith("-")).toBe(false);
      expect(slug.length).toBeLessThanOrEqual(60);
    });
  });

  describe("buildExportFilename", () => {
    it("names the source and the date", () => {
      expect(buildExportFilename("coins", new Date("2026-07-16T10:00:00Z"))).toBe(
        "numisbook-coins-2026-07-16.csv",
      );
    });
  });

  describe("exportCoins", () => {
    it("exports a collection's coins as CSV named after the collection", async () => {
      collections.findByIdForUser.mockResolvedValue(ownedCollection);
      coins.listForExportInCollection.mockResolvedValue([exportableCoin]);

      const result = await exportCoins("user-1", "col-1", {});

      expect(result.filename).toMatch(/^numisbook-ancient-rome-\d{4}-\d{2}-\d{2}\.csv$/);
      expect(headerRow(result.csv).startsWith("title,collection,")).toBe(true);
      expect(dataRows(result.csv)).toHaveLength(1);
    });

    it("exports the whole filtered list, not a page", async () => {
      // The repository read must receive no page window: an export is of
      // everything matching, not the 20 rows in view.
      collections.findByIdForUser.mockResolvedValue(ownedCollection);
      coins.listForExportInCollection.mockResolvedValue([]);

      await exportCoins("user-1", "col-1", { metals: ["Silver"], sortBy: "year" });

      const [collectionId, criteria] = coins.listForExportInCollection.mock.calls[0];
      expect(collectionId).toBe("col-1");
      expect(criteria).toMatchObject({ metals: ["Silver"], sortBy: "year" });
      expect(criteria).not.toHaveProperty("limit");
      expect(criteria).not.toHaveProperty("offset");
    });

    it("produces a valid header-only file when nothing matches", async () => {
      collections.findByIdForUser.mockResolvedValue(ownedCollection);
      coins.listForExportInCollection.mockResolvedValue([]);

      const result = await exportCoins("user-1", "col-1", { q: "nothing" });

      expect(headerRow(result.csv)).toContain("title");
      expect(dataRows(result.csv)).toEqual([]);
      expect(result.filename).toContain("ancient-rome");
    });

    it("throws NotFound for a collection the user does not own", async () => {
      // Tenant isolation: another user's collection is invisible, not forbidden.
      collections.findByIdForUser.mockResolvedValue(null);

      await expect(exportCoins("user-1", "col-x", {})).rejects.toBeInstanceOf(
        NotFoundError,
      );
      expect(coins.listForExportInCollection).not.toHaveBeenCalled();
    });

    it("scopes the collection lookup by the acting user", async () => {
      collections.findByIdForUser.mockResolvedValue(ownedCollection);
      coins.listForExportInCollection.mockResolvedValue([]);

      await exportCoins("user-1", "col-1", {});

      expect(collections.findByIdForUser).toHaveBeenCalledWith("col-1", "user-1");
    });
  });

  describe("exportAllCoins", () => {
    it("exports the user's coins across collections", async () => {
      coins.listForExportForUser.mockResolvedValue([
        exportableCoin,
        { ...exportableCoin, id: "coin-2", collectionName: "Greek Bronze" },
      ]);

      const result = await exportAllCoins("user-1", {});

      expect(result.filename).toMatch(/^numisbook-coins-\d{4}-\d{2}-\d{2}\.csv$/);
      expect(dataRows(result.csv)).toHaveLength(2);
      // Each row names its own collection — the file is self-describing.
      expect(result.csv).toContain("Ancient Rome");
      expect(result.csv).toContain("Greek Bronze");
    });

    it("scopes the read by the acting user and applies no page window", async () => {
      // Coins carry no user_id, so this is the only thing standing between one
      // collector's export and another's inventory.
      coins.listForExportForUser.mockResolvedValue([]);

      await exportAllCoins("user-1", { metals: ["Gold"] });

      const [userId, criteria] = coins.listForExportForUser.mock.calls[0];
      expect(userId).toBe("user-1");
      expect(criteria).toMatchObject({ metals: ["Gold"] });
      expect(criteria).not.toHaveProperty("limit");
    });
  });
});
