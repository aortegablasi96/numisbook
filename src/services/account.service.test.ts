import { describe, it, expect, vi, beforeEach } from "vitest";
import { deleteAccount } from "./account.service";
import { userRepository } from "@/repositories/user.repository";
import { coinImageRepository } from "@/repositories/coinImage.repository";
import { coinInvoiceRepository } from "@/repositories/coinInvoice.repository";
import { objectStorage } from "@/lib/storage";
import { logger } from "@/lib/logger";

vi.mock("@/repositories/user.repository", () => ({
  userRepository: { deleteById: vi.fn() },
}));
vi.mock("@/repositories/coinImage.repository", () => ({
  coinImageRepository: { listStorageKeysForUser: vi.fn() },
}));
vi.mock("@/repositories/coinInvoice.repository", () => ({
  coinInvoiceRepository: { listStorageKeysForUser: vi.fn() },
}));
vi.mock("@/lib/storage", () => ({ objectStorage: { delete: vi.fn() } }));
vi.mock("@/lib/logger", () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

const userRepo = vi.mocked(userRepository);
const imageRepo = vi.mocked(coinImageRepository);
const invoiceRepo = vi.mocked(coinInvoiceRepository);
const storage = vi.mocked(objectStorage);
const log = vi.mocked(logger);

beforeEach(() => {
  vi.clearAllMocks();
  userRepo.deleteById.mockResolvedValue(undefined);
  imageRepo.listStorageKeysForUser.mockResolvedValue([]);
  invoiceRepo.listStorageKeysForUser.mockResolvedValue([]);
  storage.delete.mockResolvedValue(undefined);
});

describe("deleteAccount", () => {
  it("deletes the user row (DB cascade removes the rest)", async () => {
    await deleteAccount("user-1");
    expect(userRepo.deleteById).toHaveBeenCalledWith("user-1");
  });

  it("purges every image and invoice storage blob", async () => {
    imageRepo.listStorageKeysForUser.mockResolvedValue(["img/a", "img/b"]);
    invoiceRepo.listStorageKeysForUser.mockResolvedValue(["inv/c"]);

    await deleteAccount("user-1");

    expect(storage.delete).toHaveBeenCalledWith("img/a");
    expect(storage.delete).toHaveBeenCalledWith("img/b");
    expect(storage.delete).toHaveBeenCalledWith("inv/c");
    expect(storage.delete).toHaveBeenCalledTimes(3);
  });

  it("reads storage keys before deleting the user row", async () => {
    const order: string[] = [];
    imageRepo.listStorageKeysForUser.mockImplementation(async () => {
      order.push("enumerate");
      return [];
    });
    userRepo.deleteById.mockImplementation(async () => {
      order.push("delete-user");
    });

    await deleteAccount("user-1");

    expect(order).toEqual(["enumerate", "delete-user"]);
  });

  it("logs a warning but does not throw when a blob purge fails", async () => {
    imageRepo.listStorageKeysForUser.mockResolvedValue(["img/a", "img/b"]);
    storage.delete
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("R2 down"));

    await expect(deleteAccount("user-1")).resolves.toBeUndefined();
    expect(log.warn).toHaveBeenCalledWith(
      expect.stringContaining("orphaned storage"),
      expect.objectContaining({ userId: "user-1", failed: 1, total: 2 }),
    );
  });

  it("does not log when there are no blobs to purge", async () => {
    await deleteAccount("user-1");
    expect(storage.delete).not.toHaveBeenCalled();
    expect(log.warn).not.toHaveBeenCalled();
  });
});
