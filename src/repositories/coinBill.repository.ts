import { randomUUID } from "node:crypto";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { coinBills } from "@/db/schema";
import { objectStorage } from "@/lib/storage";

export type CoinBillData = {
  mimeType: string;
  filename: string | null;
  data: Buffer;
};
export type CoinBillMeta = {
  id: string;
  filename: string | null;
  sizeBytes: number;
  createdAt: Date;
};

// Data access for coin bills (PDF receipts): metadata in Postgres, bytes in
// object storage (src/lib/storage). Mirrors coinImage.repository — the only layer
// that composes the DB row with the stored object. Ownership is enforced one
// layer up (the service checks the coin belongs to the user). Multiple bills per
// coin, ordered by createdAt ascending.
export const coinBillRepository = {
  async insert(
    coinId: string,
    mimeType: string,
    filename: string | null,
    data: Buffer,
  ): Promise<string> {
    const key = `bills/${coinId}/${randomUUID()}`;
    await objectStorage.put(key, data, mimeType);
    try {
      const [row] = await db
        .insert(coinBills)
        .values({ coinId, mimeType, filename, storageKey: key, sizeBytes: data.length })
        .returning({ id: coinBills.id });
      return row.id;
    } catch (err) {
      // Don't leak an orphaned object if the metadata write fails.
      await objectStorage.delete(key).catch(() => {});
      throw err;
    }
  },

  async listByCoinId(coinId: string): Promise<CoinBillMeta[]> {
    return db
      .select({
        id: coinBills.id,
        filename: coinBills.filename,
        sizeBytes: coinBills.sizeBytes,
        createdAt: coinBills.createdAt,
      })
      .from(coinBills)
      .where(eq(coinBills.coinId, coinId))
      .orderBy(asc(coinBills.createdAt));
  },

  async getById(id: string): Promise<CoinBillData | null> {
    const [row] = await db
      .select({
        mimeType: coinBills.mimeType,
        filename: coinBills.filename,
        storageKey: coinBills.storageKey,
      })
      .from(coinBills)
      .where(eq(coinBills.id, id))
      .limit(1);
    if (!row) return null;
    const data = await objectStorage.get(row.storageKey);
    if (!data) return null;
    return { mimeType: row.mimeType, filename: row.filename, data };
  },

  async deleteById(id: string): Promise<boolean> {
    const [row] = await db
      .delete(coinBills)
      .where(eq(coinBills.id, id))
      .returning({ storageKey: coinBills.storageKey });
    if (!row) return false;
    await objectStorage.delete(row.storageKey).catch(() => {});
    return true;
  },
};
