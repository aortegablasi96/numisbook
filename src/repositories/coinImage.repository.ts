import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { coinImages } from "@/db/schema";

export type CoinImageData = { mimeType: string; data: Buffer };
export type CoinImageMeta = { id: string; createdAt: Date };

// Data access for coin images. Ownership is enforced one layer up (the service
// checks the coin belongs to the user). Multiple images per coin, ordered by
// createdAt ascending.
export const coinImageRepository = {
  async insert(coinId: string, mimeType: string, data: Buffer): Promise<string> {
    const [row] = await db
      .insert(coinImages)
      .values({ coinId, mimeType, data })
      .returning({ id: coinImages.id });
    return row.id;
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
      .select({ mimeType: coinImages.mimeType, data: coinImages.data })
      .from(coinImages)
      .where(eq(coinImages.id, id))
      .limit(1);
    return row ?? null;
  },

  async getFirstByCoinId(coinId: string): Promise<CoinImageData | null> {
    const [row] = await db
      .select({ mimeType: coinImages.mimeType, data: coinImages.data })
      .from(coinImages)
      .where(eq(coinImages.coinId, coinId))
      .orderBy(asc(coinImages.createdAt))
      .limit(1);
    return row ?? null;
  },

  async deleteById(id: string): Promise<boolean> {
    const rows = await db
      .delete(coinImages)
      .where(eq(coinImages.id, id))
      .returning({ id: coinImages.id });
    return rows.length > 0;
  },
};
