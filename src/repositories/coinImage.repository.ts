import { randomUUID } from "node:crypto";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { coinImages } from "@/db/schema";
import { objectStorage } from "@/lib/storage";

export type CoinImageData = { mimeType: string; data: Buffer };
export type CoinImageMeta = { id: string; createdAt: Date };

// Data access for coin images: metadata in Postgres, bytes in object storage
// (src/lib/storage). This repository is the only layer that touches image
// storage — it composes the DB row with the stored object so callers keep
// seeing a single { mimeType, data } shape. Ownership is enforced one layer up
// (the service checks the coin belongs to the user). Multiple images per coin,
// ordered by createdAt ascending.
export const coinImageRepository = {
  async insert(coinId: string, mimeType: string, data: Buffer): Promise<string> {
    const key = `coins/${coinId}/${randomUUID()}`;
    await objectStorage.put(key, data, mimeType);
    try {
      const [row] = await db
        .insert(coinImages)
        .values({ coinId, mimeType, storageKey: key, sizeBytes: data.length })
        .returning({ id: coinImages.id });
      return row.id;
    } catch (err) {
      // Don't leak an orphaned object if the metadata write fails.
      await objectStorage.delete(key).catch(() => {});
      throw err;
    }
  },

  async listByCoinId(coinId: string): Promise<CoinImageMeta[]> {
    return db
      .select({ id: coinImages.id, createdAt: coinImages.createdAt })
      .from(coinImages)
      .where(eq(coinImages.coinId, coinId))
      .orderBy(asc(coinImages.createdAt));
  },

  async getById(id: string): Promise<CoinImageData | null> {
    const [row] = await db
      .select({ mimeType: coinImages.mimeType, storageKey: coinImages.storageKey })
      .from(coinImages)
      .where(eq(coinImages.id, id))
      .limit(1);
    if (!row) return null;
    const data = await objectStorage.get(row.storageKey);
    if (!data) return null;
    return { mimeType: row.mimeType, data };
  },

  async getFirstByCoinId(coinId: string): Promise<CoinImageData | null> {
    const [row] = await db
      .select({ mimeType: coinImages.mimeType, storageKey: coinImages.storageKey })
      .from(coinImages)
      .where(eq(coinImages.coinId, coinId))
      .orderBy(asc(coinImages.createdAt))
      .limit(1);
    if (!row) return null;
    const data = await objectStorage.get(row.storageKey);
    if (!data) return null;
    return { mimeType: row.mimeType, data };
  },

  async deleteById(id: string): Promise<boolean> {
    const [row] = await db
      .delete(coinImages)
      .where(eq(coinImages.id, id))
      .returning({ storageKey: coinImages.storageKey });
    if (!row) return false;
    await objectStorage.delete(row.storageKey).catch(() => {});
    return true;
  },
};
