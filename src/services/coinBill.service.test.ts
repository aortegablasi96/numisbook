import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  addCoinBill,
  listCoinBills,
  getCoinBill,
  removeCoinBill,
} from "./coinBill.service";
import { coinBillRepository } from "@/repositories/coinBill.repository";
import { coinRepository } from "@/repositories/coin.repository";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { MAX_BILL_BYTES } from "@/lib/bills";

vi.mock("@/repositories/coinBill.repository", () => ({
  coinBillRepository: {
    insert: vi.fn(),
    listByCoinId: vi.fn(),
    getById: vi.fn(),
    deleteById: vi.fn(),
  },
}));
vi.mock("@/repositories/coin.repository", () => ({
  coinRepository: { findByIdForUser: vi.fn() },
}));

const bills = vi.mocked(coinBillRepository);
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

const pdf = Buffer.from("%PDF-1.7");

beforeEach(() => vi.clearAllMocks());

describe("coinBill.service", () => {
  describe("addCoinBill", () => {
    it("stores a valid PDF for an owned coin and returns its id", async () => {
      coins.findByIdForUser.mockResolvedValue(ownedCoin);
      bills.insert.mockResolvedValue("bill-uuid-1");
      const id = await addCoinBill("user-1", "coin-1", "application/pdf", "receipt.pdf", pdf);
      expect(id).toBe("bill-uuid-1");
      expect(bills.insert).toHaveBeenCalledWith("coin-1", "application/pdf", "receipt.pdf", pdf);
    });

    it("rejects a non-PDF mime type before any DB access", async () => {
      await expect(
        addCoinBill("user-1", "coin-1", "image/png", "x.png", pdf),
      ).rejects.toBeInstanceOf(ValidationError);
      expect(coins.findByIdForUser).not.toHaveBeenCalled();
      expect(bills.insert).not.toHaveBeenCalled();
    });

    it("rejects an empty file", async () => {
      await expect(
        addCoinBill("user-1", "coin-1", "application/pdf", "x.pdf", Buffer.alloc(0)),
      ).rejects.toBeInstanceOf(ValidationError);
    });

    it("rejects an oversized file", async () => {
      const tooBig = Buffer.alloc(MAX_BILL_BYTES + 1);
      await expect(
        addCoinBill("user-1", "coin-1", "application/pdf", "x.pdf", tooBig),
      ).rejects.toBeInstanceOf(ValidationError);
      expect(bills.insert).not.toHaveBeenCalled();
    });

    it("throws NotFound when the user does not own the coin", async () => {
      coins.findByIdForUser.mockResolvedValue(null);
      await expect(
        addCoinBill("user-1", "coin-x", "application/pdf", "x.pdf", pdf),
      ).rejects.toBeInstanceOf(NotFoundError);
      expect(bills.insert).not.toHaveBeenCalled();
    });
  });

  describe("listCoinBills", () => {
    it("returns bill metadata for an owned coin", async () => {
      const meta = [{ id: "bill-1", filename: "r.pdf", sizeBytes: 10, createdAt: new Date() }];
      coins.findByIdForUser.mockResolvedValue(ownedCoin);
      bills.listByCoinId.mockResolvedValue(meta);
      expect(await listCoinBills("user-1", "coin-1")).toEqual(meta);
    });

    it("throws NotFound when the user does not own the coin", async () => {
      coins.findByIdForUser.mockResolvedValue(null);
      await expect(listCoinBills("user-1", "coin-x")).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });
  });

  describe("getCoinBill", () => {
    it("returns bill data by id for an owned coin", async () => {
      coins.findByIdForUser.mockResolvedValue(ownedCoin);
      bills.getById.mockResolvedValue({ mimeType: "application/pdf", filename: "r.pdf", data: pdf });
      expect(await getCoinBill("user-1", "coin-1", "bill-1")).toEqual({
        mimeType: "application/pdf",
        filename: "r.pdf",
        data: pdf,
      });
    });

    it("throws NotFound when the coin is not the user's", async () => {
      coins.findByIdForUser.mockResolvedValue(null);
      await expect(
        getCoinBill("user-1", "coin-x", "bill-1"),
      ).rejects.toBeInstanceOf(NotFoundError);
      expect(bills.getById).not.toHaveBeenCalled();
    });

    it("throws NotFound when the bill does not exist", async () => {
      coins.findByIdForUser.mockResolvedValue(ownedCoin);
      bills.getById.mockResolvedValue(null);
      await expect(
        getCoinBill("user-1", "coin-1", "bill-missing"),
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe("removeCoinBill", () => {
    it("deletes a bill by id for an owned coin", async () => {
      coins.findByIdForUser.mockResolvedValue(ownedCoin);
      bills.deleteById.mockResolvedValue(true);
      await expect(
        removeCoinBill("user-1", "coin-1", "bill-1"),
      ).resolves.toBeUndefined();
      expect(bills.deleteById).toHaveBeenCalledWith("bill-1");
    });

    it("throws NotFound when the user does not own the coin", async () => {
      coins.findByIdForUser.mockResolvedValue(null);
      await expect(
        removeCoinBill("user-1", "coin-x", "bill-1"),
      ).rejects.toBeInstanceOf(NotFoundError);
      expect(bills.deleteById).not.toHaveBeenCalled();
    });

    it("throws NotFound when the bill does not exist", async () => {
      coins.findByIdForUser.mockResolvedValue(ownedCoin);
      bills.deleteById.mockResolvedValue(false);
      await expect(
        removeCoinBill("user-1", "coin-1", "bill-missing"),
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });
});
