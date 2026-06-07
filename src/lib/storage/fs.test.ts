import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { FsStorage } from "./fs";

let root: string;
let storage: FsStorage;

beforeEach(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), "numisbook-fsstorage-"));
  storage = new FsStorage(root);
});

afterEach(async () => {
  await fs.rm(root, { recursive: true, force: true });
});

describe("FsStorage", () => {
  it("round-trips bytes through put/get under a nested key", async () => {
    const key = "coins/coin-1/img-1";
    const body = Buffer.from([1, 2, 3, 4]);
    await storage.put(key, body, "image/png");
    const out = await storage.get(key);
    expect(out).toEqual(body);
  });

  it("returns null for a missing key", async () => {
    expect(await storage.get("coins/none/missing")).toBeNull();
  });

  it("delete removes the object and is a no-op when absent", async () => {
    const key = "coins/coin-1/img-1";
    await storage.put(key, Buffer.from([9]), "image/png");
    await storage.delete(key);
    expect(await storage.get(key)).toBeNull();
    // Deleting again must not throw.
    await expect(storage.delete(key)).resolves.toBeUndefined();
  });

  it("rejects keys that escape the storage root", async () => {
    await expect(
      storage.put("../escape", Buffer.from([0]), "image/png"),
    ).rejects.toThrow(/Invalid storage key/);
  });
});
