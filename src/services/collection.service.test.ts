import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  listCollections,
  getCollection,
  createCollection,
  renameCollection,
  deleteCollection,
} from "./collection.service";
import {
  collectionRepository,
  type Collection,
} from "@/repositories/collection.repository";
import { NotFoundError, ValidationError } from "@/lib/errors";

vi.mock("@/repositories/collection.repository", () => ({
  collectionRepository: {
    listByUserWithCounts: vi.fn(),
    findByIdForUser: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

const repo = vi.mocked(collectionRepository);

const fakeCollection: Collection = {
  id: "col-1",
  userId: "user-1",
  name: "Ancient Rome",
  createdAt: new Date(),
};

describe("collection.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("listCollections", () => {
    it("returns the user's collections with their coin counts", async () => {
      const withCount = { ...fakeCollection, coinCount: 3 };
      repo.listByUserWithCounts.mockResolvedValue([withCount]);
      expect(await listCollections("user-1")).toEqual([withCount]);
      expect(repo.listByUserWithCounts).toHaveBeenCalledWith("user-1");
    });
  });

  describe("getCollection", () => {
    it("returns the collection when it belongs to the user", async () => {
      repo.findByIdForUser.mockResolvedValue(fakeCollection);
      expect(await getCollection("user-1", "col-1")).toEqual(fakeCollection);
      expect(repo.findByIdForUser).toHaveBeenCalledWith("col-1", "user-1");
    });

    it("throws NotFound when it is not the user's (or missing)", async () => {
      repo.findByIdForUser.mockResolvedValue(null);
      await expect(getCollection("user-1", "col-x")).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });
  });

  describe("createCollection", () => {
    it("trims the name and creates the collection for the user", async () => {
      repo.create.mockResolvedValue(fakeCollection);
      await createCollection("user-1", "  Ancient Rome  ");
      expect(repo.create).toHaveBeenCalledWith({
        userId: "user-1",
        name: "Ancient Rome",
      });
    });

    it("rejects an empty / whitespace-only name", async () => {
      await expect(createCollection("user-1", "   ")).rejects.toBeInstanceOf(
        ValidationError,
      );
      expect(repo.create).not.toHaveBeenCalled();
    });

    it("rejects a name over the length limit", async () => {
      await expect(
        createCollection("user-1", "x".repeat(121)),
      ).rejects.toBeInstanceOf(ValidationError);
      expect(repo.create).not.toHaveBeenCalled();
    });
  });

  describe("renameCollection", () => {
    it("updates the name scoped to the owner", async () => {
      repo.update.mockResolvedValue({ ...fakeCollection, name: "Greek" });
      const result = await renameCollection("user-1", "col-1", "  Greek  ");
      expect(repo.update).toHaveBeenCalledWith("col-1", "user-1", {
        name: "Greek",
      });
      expect(result.name).toBe("Greek");
    });

    it("throws NotFound when the collection is not the user's (or missing)", async () => {
      repo.update.mockResolvedValue(null);
      await expect(
        renameCollection("user-1", "col-x", "Greek"),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it("validates the new name before touching the repository", async () => {
      await expect(
        renameCollection("user-1", "col-1", ""),
      ).rejects.toBeInstanceOf(ValidationError);
      expect(repo.update).not.toHaveBeenCalled();
    });
  });

  describe("deleteCollection", () => {
    it("deletes when the collection belongs to the user", async () => {
      repo.delete.mockResolvedValue(true);
      await expect(deleteCollection("user-1", "col-1")).resolves.toBeUndefined();
      expect(repo.delete).toHaveBeenCalledWith("col-1", "user-1");
    });

    it("throws NotFound when nothing was deleted", async () => {
      repo.delete.mockResolvedValue(false);
      await expect(deleteCollection("user-1", "col-x")).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });
  });
});
