import { describe, it, expect, vi, beforeEach } from "vitest";
import { deleteAccount } from "./account.service";
import { userRepository } from "@/repositories/user.repository";
import { coinImageRepository } from "@/repositories/coinImage.repository";
import { coinInvoiceRepository } from "@/repositories/coinInvoice.repository";
import { objectStorage } from "@/lib/storage";
import { forgetUserUsage } from "@/services/assistant-limits.service";
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
vi.mock("@/services/assistant-limits.service", () => ({
  forgetUserUsage: vi.fn(),
}));
vi.mock("@/lib/logger", () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

const userRepo = vi.mocked(userRepository);
const imageRepo = vi.mocked(coinImageRepository);
const invoiceRepo = vi.mocked(coinInvoiceRepository);
const storage = vi.mocked(objectStorage);
const log = vi.mocked(logger);
const forgetUsage = vi.mocked(forgetUserUsage);

beforeEach(() => {
  vi.clearAllMocks();
  userRepo.deleteById.mockResolvedValue(undefined);
  imageRepo.listStorageKeysForUser.mockResolvedValue([]);
  invoiceRepo.listStorageKeysForUser.mockResolvedValue([]);
  storage.delete.mockResolvedValue(undefined);
  forgetUsage.mockResolvedValue(undefined);
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

  // assistant_usage has no foreign key, so the DB cascade cannot reach it
  // (ADR-018 §5). Without this the deleted user's id survives deletion.
  it("forgets the user's assistant usage", async () => {
    await deleteAccount("user-1");
    expect(forgetUsage).toHaveBeenCalledWith("user-1");
  });

  // Deliberately unlike the best-effort storage purge above: an orphaned blob is
  // invisible and re-sweepable, an orphaned usage row is a privacy defect. It
  // must fail loudly rather than be swallowed for consistency.
  it("propagates a usage-purge failure instead of swallowing it", async () => {
    forgetUsage.mockRejectedValue(new Error("db down"));
    await expect(deleteAccount("user-1")).rejects.toThrow("db down");
  });
});
