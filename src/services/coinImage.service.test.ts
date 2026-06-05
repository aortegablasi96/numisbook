import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  setCoinImage,
  getCoinImage,
  removeCoinImage,
} from "./coinImage.service";
import { coinImageRepository } from "@/repositories/coinImage.repository";
import { coinRepository } from "@/repositories/coin.repository";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { MAX_IMAGE_BYTES } from "@/lib/images";

vi.mock("@/repositories/coinImage.repository", () => ({
  coinImageRepository: {
    upsert: vi.fn(),
    getByCoinId: vi.fn(),
    delete: vi.fn(),
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
  name: "Denarius",
  issuingAuthority: null,
  category: null,
  year: null,
  denomination: null,
  mint: null,
  metal: null,
  grade: null,
  createdAt: new Date(),
};

const png = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

beforeEach(() => vi.clearAllMocks());

describe("coinImage.service", () => {
  describe("setCoinImage", () => {
    it("stores a valid image for an owned coin", async () => {
      coins.findByIdForUser.mockResolvedValue(ownedCoin);
      await setCoinImage("user-1", "coin-1", "image/png", png);
      expect(images.upsert).toHaveBeenCalledWith("coin-1", "image/png", png);
    });

    it("rejects an unsupported mime type before any DB access", async () => {
      await expect(
        setCoinImage("user-1", "coin-1", "application/pdf", png),
      ).rejects.toBeInstanceOf(ValidationError);
      expect(coins.findByIdForUser).not.toHaveBeenCalled();
      expect(images.upsert).not.toHaveBeenCalled();
    });

    it("rejects an empty file", async () => {
      await expect(
        setCoinImage("user-1", "coin-1", "image/png", Buffer.alloc(0)),
      ).rejects.toBeInstanceOf(ValidationError);
    });

    it("rejects an oversized file", async () => {
      const tooBig = Buffer.alloc(MAX_IMAGE_BYTES + 1);
      await expect(
        setCoinImage("user-1", "coin-1", "image/png", tooBig),
      ).rejects.toBeInstanceOf(ValidationError);
      expect(images.upsert).not.toHaveBeenCalled();
    });

    it("throws NotFound when the user does not own the coin", async () => {
      coins.findByIdForUser.mockResolvedValue(null);
      await expect(
        setCoinImage("user-1", "coin-x", "image/png", png),
      ).rejects.toBeInstanceOf(NotFoundError);
      expect(images.upsert).not.toHaveBeenCalled();
    });
  });

  describe("getCoinImage", () => {
    it("returns the image for an owned coin", async () => {
      coins.findByIdForUser.mockResolvedValue(ownedCoin);
      images.getByCoinId.mockResolvedValue({ mimeType: "image/png", data: png });
      expect(await getCoinImage("user-1", "coin-1")).toEqual({
        mimeType: "image/png",
        data: png,
      });
    });

    it("throws NotFound when the coin is not the user's", async () => {
      coins.findByIdForUser.mockResolvedValue(null);
      await expect(getCoinImage("user-1", "coin-x")).rejects.toBeInstanceOf(
        NotFoundError,
      );
      expect(images.getByCoinId).not.toHaveBeenCalled();
    });

    it("throws NotFound when the coin has no image", async () => {
      coins.findByIdForUser.mockResolvedValue(ownedCoin);
      images.getByCoinId.mockResolvedValue(null);
      await expect(getCoinImage("user-1", "coin-1")).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });
  });

  describe("removeCoinImage", () => {
    it("deletes the image of an owned coin", async () => {
      coins.findByIdForUser.mockResolvedValue(ownedCoin);
      images.delete.mockResolvedValue(true);
      await expect(removeCoinImage("user-1", "coin-1")).resolves.toBeUndefined();
      expect(images.delete).toHaveBeenCalledWith("coin-1");
    });

    it("throws NotFound when the user does not own the coin", async () => {
      coins.findByIdForUser.mockResolvedValue(null);
      await expect(removeCoinImage("user-1", "coin-x")).rejects.toBeInstanceOf(
        NotFoundError,
      );
      expect(images.delete).not.toHaveBeenCalled();
    });
  });
});
