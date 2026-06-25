import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  addCoinInvoice,
  listCoinInvoices,
  getCoinInvoice,
  removeCoinInvoice,
} from "./coinInvoice.service";
import { coinInvoiceRepository } from "@/repositories/coinInvoice.repository";
import { coinRepository } from "@/repositories/coin.repository";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { MAX_INVOICE_BYTES } from "@/lib/invoices";

vi.mock("@/repositories/coinInvoice.repository", () => ({
  coinInvoiceRepository: {
    insert: vi.fn(),
    listByCoinId: vi.fn(),
    getById: vi.fn(),
    deleteById: vi.fn(),
  },
}));
vi.mock("@/repositories/coin.repository", () => ({
  coinRepository: { findByIdForUser: vi.fn() },
}));

const invoices = vi.mocked(coinInvoiceRepository);
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

describe("coinInvoice.service", () => {
  describe("addCoinInvoice", () => {
    it("stores a valid PDF for an owned coin and returns its id", async () => {
      coins.findByIdForUser.mockResolvedValue(ownedCoin);
      invoices.insert.mockResolvedValue("invoice-uuid-1");
      const id = await addCoinInvoice("user-1", "coin-1", "application/pdf", "receipt.pdf", pdf);
      expect(id).toBe("invoice-uuid-1");
      expect(invoices.insert).toHaveBeenCalledWith("coin-1", "application/pdf", "receipt.pdf", pdf);
    });

    it("rejects a non-PDF mime type before any DB access", async () => {
      await expect(
        addCoinInvoice("user-1", "coin-1", "image/png", "x.png", pdf),
      ).rejects.toBeInstanceOf(ValidationError);
      expect(coins.findByIdForUser).not.toHaveBeenCalled();
      expect(invoices.insert).not.toHaveBeenCalled();
    });

    it("rejects an empty file", async () => {
      await expect(
        addCoinInvoice("user-1", "coin-1", "application/pdf", "x.pdf", Buffer.alloc(0)),
      ).rejects.toBeInstanceOf(ValidationError);
    });

    it("rejects an oversized file", async () => {
      const tooBig = Buffer.alloc(MAX_INVOICE_BYTES + 1);
      await expect(
        addCoinInvoice("user-1", "coin-1", "application/pdf", "x.pdf", tooBig),
      ).rejects.toBeInstanceOf(ValidationError);
      expect(invoices.insert).not.toHaveBeenCalled();
    });

    it("throws NotFound when the user does not own the coin", async () => {
      coins.findByIdForUser.mockResolvedValue(null);
      await expect(
        addCoinInvoice("user-1", "coin-x", "application/pdf", "x.pdf", pdf),
      ).rejects.toBeInstanceOf(NotFoundError);
      expect(invoices.insert).not.toHaveBeenCalled();
    });
  });

  describe("listCoinInvoices", () => {
    it("returns invoice metadata for an owned coin", async () => {
      const meta = [{ id: "invoice-1", filename: "r.pdf", sizeBytes: 10, createdAt: new Date() }];
      coins.findByIdForUser.mockResolvedValue(ownedCoin);
      invoices.listByCoinId.mockResolvedValue(meta);
      expect(await listCoinInvoices("user-1", "coin-1")).toEqual(meta);
    });

    it("throws NotFound when the user does not own the coin", async () => {
      coins.findByIdForUser.mockResolvedValue(null);
      await expect(listCoinInvoices("user-1", "coin-x")).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });
  });

  describe("getCoinInvoice", () => {
    it("returns invoice data by id for an owned coin", async () => {
      coins.findByIdForUser.mockResolvedValue(ownedCoin);
      invoices.getById.mockResolvedValue({ mimeType: "application/pdf", filename: "r.pdf", data: pdf });
      expect(await getCoinInvoice("user-1", "coin-1", "invoice-1")).toEqual({
        mimeType: "application/pdf",
        filename: "r.pdf",
        data: pdf,
      });
    });

    it("throws NotFound when the coin is not the user's", async () => {
      coins.findByIdForUser.mockResolvedValue(null);
      await expect(
        getCoinInvoice("user-1", "coin-x", "invoice-1"),
      ).rejects.toBeInstanceOf(NotFoundError);
      expect(invoices.getById).not.toHaveBeenCalled();
    });

    it("throws NotFound when the invoice does not exist", async () => {
      coins.findByIdForUser.mockResolvedValue(ownedCoin);
      invoices.getById.mockResolvedValue(null);
      await expect(
        getCoinInvoice("user-1", "coin-1", "invoice-missing"),
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe("removeCoinInvoice", () => {
    it("deletes an invoice by id for an owned coin", async () => {
      coins.findByIdForUser.mockResolvedValue(ownedCoin);
      invoices.deleteById.mockResolvedValue(true);
      await expect(
        removeCoinInvoice("user-1", "coin-1", "invoice-1"),
      ).resolves.toBeUndefined();
      expect(invoices.deleteById).toHaveBeenCalledWith("invoice-1");
    });

    it("throws NotFound when the user does not own the coin", async () => {
      coins.findByIdForUser.mockResolvedValue(null);
      await expect(
        removeCoinInvoice("user-1", "coin-x", "invoice-1"),
      ).rejects.toBeInstanceOf(NotFoundError);
      expect(invoices.deleteById).not.toHaveBeenCalled();
    });

    it("throws NotFound when the invoice does not exist", async () => {
      coins.findByIdForUser.mockResolvedValue(ownedCoin);
      invoices.deleteById.mockResolvedValue(false);
      await expect(
        removeCoinInvoice("user-1", "coin-1", "invoice-missing"),
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });
});
