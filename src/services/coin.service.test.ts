import { describe, it, expect, vi, beforeEach } from "vitest";
import { ZodError } from "zod";
import { listCoins, getCoin, addCoin, editCoin, deleteCoin } from "./coin.service";
import { coinRepository, type Coin } from "@/repositories/coin.repository";
import { collectionRepository } from "@/repositories/collection.repository";
import { NotFoundError, ValidationError } from "@/lib/errors";

vi.mock("@/repositories/coin.repository", () => ({
  coinRepository: {
    listByCollection: vi.fn(),
    findByIdForUser: vi.fn(),
    create: vi.fn(),
    updateForUser: vi.fn(),
    deleteForUser: vi.fn(),
  },
}));

vi.mock("@/repositories/collection.repository", () => ({
  collectionRepository: { findByIdForUser: vi.fn() },
}));

const coins = vi.mocked(coinRepository);
const collections = vi.mocked(collectionRepository);

const ownedCollection = {
  id: "col-1",
  userId: "user-1",
  name: "Ancient Rome",
  createdAt: new Date(),
};

const fakeCoin: Coin = {
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
    it("creates a coin in an owned collection, trimming the name", async () => {
      collections.findByIdForUser.mockResolvedValue(ownedCollection);
      coins.create.mockResolvedValue(fakeCoin);
      await addCoin("user-1", "col-1", { name: "  Denarius  ", year: -44 });
      expect(coins.create).toHaveBeenCalledWith({
        collectionId: "col-1",
        name: "Denarius",
        year: -44,
      });
    });

    it("rejects invalid input before any DB access", async () => {
      await expect(
        addCoin("user-1", "col-1", { name: "" }),
      ).rejects.toBeInstanceOf(ZodError);
      expect(collections.findByIdForUser).not.toHaveBeenCalled();
      expect(coins.create).not.toHaveBeenCalled();
    });

    it("throws NotFound when the user does not own the collection", async () => {
      collections.findByIdForUser.mockResolvedValue(null);
      await expect(
        addCoin("user-1", "col-x", { name: "Denarius" }),
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
});
