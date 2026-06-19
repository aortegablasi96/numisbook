import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  addCoinImage,
  listCoinImages,
  getCoinImage,
  getFirstCoinImage,
  removeCoinImage,
  setCoinImage,
} from "./coinImage.service";
import { coinImageRepository } from "@/repositories/coinImage.repository";
import { coinRepository } from "@/repositories/coin.repository";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { MAX_IMAGE_BYTES } from "@/lib/images";

vi.mock("@/repositories/coinImage.repository", () => ({
  coinImageRepository: {
    insert: vi.fn(),
    listByCoinId: vi.fn(),
    getById: vi.fn(),
    getFirstByCoinId: vi.fn(),
    deleteById: vi.fn(),
  },
}));
vi.mock("@/repositories/coin.repository", () => ({
  coinRepository: { findByIdForUser: vi.fn() },
}));

const images = vi.mocked(coinImageRepository);
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

const png = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

beforeEach(() => vi.clearAllMocks());

describe("coinImage.service", () => {
  describe("addCoinImage", () => {
    it("stores a valid image for an owned coin and returns its id", async () => {
      coins.findByIdForUser.mockResolvedValue(ownedCoin);
      images.insert.mockResolvedValue("img-uuid-1");
      const id = await addCoinImage("user-1", "coin-1", "image/png", png);
      expect(id).toBe("img-uuid-1");
      expect(images.insert).toHaveBeenCalledWith("coin-1", "image/png", png);
    });

    it("rejects an unsupported mime type before any DB access", async () => {
      await expect(
        addCoinImage("user-1", "coin-1", "application/pdf", png),
      ).rejects.toBeInstanceOf(ValidationError);
      expect(coins.findByIdForUser).not.toHaveBeenCalled();
      expect(images.insert).not.toHaveBeenCalled();
    });

    it("rejects an empty file", async () => {
      await expect(
        addCoinImage("user-1", "coin-1", "image/png", Buffer.alloc(0)),
      ).rejects.toBeInstanceOf(ValidationError);
    });

    it("rejects an oversized file", async () => {
      const tooBig = Buffer.alloc(MAX_IMAGE_BYTES + 1);
      await expect(
        addCoinImage("user-1", "coin-1", "image/png", tooBig),
      ).rejects.toBeInstanceOf(ValidationError);
      expect(images.insert).not.toHaveBeenCalled();
    });

    it("throws NotFound when the user does not own the coin", async () => {
      coins.findByIdForUser.mockResolvedValue(null);
      await expect(
        addCoinImage("user-1", "coin-x", "image/png", png),
      ).rejects.toBeInstanceOf(NotFoundError);
      expect(images.insert).not.toHaveBeenCalled();
    });
  });

  describe("setCoinImage", () => {
    it("is a thin wrapper over addCoinImage", async () => {
      coins.findByIdForUser.mockResolvedValue(ownedCoin);
      images.insert.mockResolvedValue("img-uuid-2");
      await expect(
        setCoinImage("user-1", "coin-1", "image/png", png),
      ).resolves.toBeUndefined();
      expect(images.insert).toHaveBeenCalledWith("coin-1", "image/png", png);
    });
  });

  describe("listCoinImages", () => {
    it("returns image metadata for an owned coin", async () => {
      const meta = [{ id: "img-1", createdAt: new Date() }];
      coins.findByIdForUser.mockResolvedValue(ownedCoin);
      images.listByCoinId.mockResolvedValue(meta);
      expect(await listCoinImages("user-1", "coin-1")).toEqual(meta);
    });

    it("throws NotFound when the user does not own the coin", async () => {
      coins.findByIdForUser.mockResolvedValue(null);
      await expect(listCoinImages("user-1", "coin-x")).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });
  });

  describe("getCoinImage", () => {
    it("returns image data by id for an owned coin", async () => {
      coins.findByIdForUser.mockResolvedValue(ownedCoin);
      images.getById.mockResolvedValue({ mimeType: "image/png", data: png });
      expect(await getCoinImage("user-1", "coin-1", "img-1")).toEqual({
        mimeType: "image/png",
        data: png,
      });
    });

    it("throws NotFound when the coin is not the user's", async () => {
      coins.findByIdForUser.mockResolvedValue(null);
      await expect(
        getCoinImage("user-1", "coin-x", "img-1"),
      ).rejects.toBeInstanceOf(NotFoundError);
      expect(images.getById).not.toHaveBeenCalled();
    });

    it("throws NotFound when the image does not exist", async () => {
      coins.findByIdForUser.mockResolvedValue(ownedCoin);
      images.getById.mockResolvedValue(null);
      await expect(
        getCoinImage("user-1", "coin-1", "img-missing"),
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe("getFirstCoinImage", () => {
    it("returns the first image for an owned coin", async () => {
      coins.findByIdForUser.mockResolvedValue(ownedCoin);
      images.getFirstByCoinId.mockResolvedValue({ mimeType: "image/jpeg", data: png });
      expect(await getFirstCoinImage("user-1", "coin-1")).toEqual({
        mimeType: "image/jpeg",
        data: png,
      });
    });

    it("throws NotFound when the coin has no images", async () => {
      coins.findByIdForUser.mockResolvedValue(ownedCoin);
      images.getFirstByCoinId.mockResolvedValue(null);
      await expect(
        getFirstCoinImage("user-1", "coin-1"),
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe("removeCoinImage", () => {
    it("deletes an image by id for an owned coin", async () => {
      coins.findByIdForUser.mockResolvedValue(ownedCoin);
      images.deleteById.mockResolvedValue(true);
      await expect(
        removeCoinImage("user-1", "coin-1", "img-1"),
      ).resolves.toBeUndefined();
      expect(images.deleteById).toHaveBeenCalledWith("img-1");
    });

    it("throws NotFound when the user does not own the coin", async () => {
      coins.findByIdForUser.mockResolvedValue(null);
      await expect(
        removeCoinImage("user-1", "coin-x", "img-1"),
      ).rejects.toBeInstanceOf(NotFoundError);
      expect(images.deleteById).not.toHaveBeenCalled();
    });

    it("throws NotFound when the image does not exist", async () => {
      coins.findByIdForUser.mockResolvedValue(ownedCoin);
      images.deleteById.mockResolvedValue(false);
      await expect(
        removeCoinImage("user-1", "coin-1", "img-missing"),
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });
});
