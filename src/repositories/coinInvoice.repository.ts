import { randomUUID } from "node:crypto";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { coinInvoices, coins, collections } from "@/db/schema";
import { objectStorage } from "@/lib/storage";

export type CoinInvoiceData = {
  mimeType: string;
  filename: string | null;
  data: Buffer;
};
export type CoinInvoiceMeta = {
  id: string;
  filename: string | null;
  sizeBytes: number;
  createdAt: Date;
};

// Data access for coin invoices (PDF receipts): metadata in Postgres, bytes in
// object storage (src/lib/storage). Mirrors coinImage.repository — the only layer
// that composes the DB row with the stored object. Ownership is enforced one
// layer up (the service checks the coin belongs to the user). Multiple invoices
// per coin, ordered by createdAt ascending.
export const coinInvoiceRepository = {
  async insert(
    coinId: string,
    mimeType: string,
    filename: string | null,
    data: Buffer,
  ): Promise<string> {
    const key = `invoices/${coinId}/${randomUUID()}`;
    await objectStorage.put(key, data, mimeType);
    try {
      const [row] = await db
        .insert(coinInvoices)
        .values({ coinId, mimeType, filename, storageKey: key, sizeBytes: data.length })
        .returning({ id: coinInvoices.id });
      return row.id;
    } catch (err) {
      // Don't leak an orphaned object if the metadata write fails.
      await objectStorage.delete(key).catch(() => {});
      throw err;
    }
  },

  async listByCoinId(coinId: string): Promise<CoinInvoiceMeta[]> {
    return db
      .select({
        id: coinInvoices.id,
        filename: coinInvoices.filename,
        sizeBytes: coinInvoices.sizeBytes,
        createdAt: coinInvoices.createdAt,
      })
      .from(coinInvoices)
      .where(eq(coinInvoices.coinId, coinId))
      .orderBy(asc(coinInvoices.createdAt));
  },

  async getById(id: string): Promise<CoinInvoiceData | null> {
    const [row] = await db
      .select({
        mimeType: coinInvoices.mimeType,
        filename: coinInvoices.filename,
        storageKey: coinInvoices.storageKey,
      })
      .from(coinInvoices)
      .where(eq(coinInvoices.id, id))
      .limit(1);
    if (!row) return null;
    const data = await objectStorage.get(row.storageKey);
    if (!data) return null;
    return { mimeType: row.mimeType, filename: row.filename, data };
  },

  async deleteById(id: string): Promise<boolean> {
    const [row] = await db
      .delete(coinInvoices)
      .where(eq(coinInvoices.id, id))
      .returning({ storageKey: coinInvoices.storageKey });
    if (!row) return false;
    await objectStorage.delete(row.storageKey).catch(() => {});
    return true;
  },

  /**
   * All invoice storage keys owned by a user (via their collections' coins).
   * Used by account deletion to purge blobs the DB cascade can't reach (ADR-013).
   */
  async listStorageKeysForUser(userId: string): Promise<string[]> {
    const rows = await db
      .select({ storageKey: coinInvoices.storageKey })
      .from(coinInvoices)
      .innerJoin(coins, eq(coinInvoices.coinId, coins.id))
      .innerJoin(collections, eq(coins.collectionId, collections.id))
      .where(eq(collections.userId, userId));
    return rows.map((r) => r.storageKey);
  },
};
