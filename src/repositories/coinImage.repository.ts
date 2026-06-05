import { eq } from "drizzle-orm";
import { db } from "@/db";
import { coinImages } from "@/db/schema";

export type CoinImage = { mimeType: string; data: Buffer };

// Data access for coin images. Only this layer touches the database. Ownership
// is enforced one layer up (the service checks the coin belongs to the user), so
// these methods are keyed by coinId alone — mirroring the valuation repository.
export const coinImageRepository = {
  /** Insert or replace the single image for a coin. */
  async upsert(coinId: string, mimeType: string, data: Buffer): Promise<void> {
    await db
      .insert(coinImages)
      .values({ coinId, mimeType, data, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: coinImages.coinId,
        set: { mimeType, data, updatedAt: new Date() },
      });
  },

  async getByCoinId(coinId: string): Promise<CoinImage | null> {
    const [row] = await db
      .select({ mimeType: coinImages.mimeType, data: coinImages.data })
      .from(coinImages)
      .where(eq(coinImages.coinId, coinId))
      .limit(1);
    return row ?? null;
  },

  async delete(coinId: string): Promise<boolean> {
    const rows = await db
      .delete(coinImages)
      .where(eq(coinImages.coinId, coinId))
      .returning({ coinId: coinImages.coinId });
    return rows.length > 0;
  },
};
