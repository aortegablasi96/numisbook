import { randomUUID } from "node:crypto";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  coinImages,
  coinInvoices,
  coins,
  collections,
  valuations,
} from "@/db/schema";
import { objectStorage } from "@/lib/storage";
import { logger } from "@/lib/logger";
import type { Collection } from "./collection.repository";
import type { Coin, NewCoin } from "./coin.repository";
import type { NewValuation, Valuation } from "./valuation.repository";

// Data access for the full-account archive (ADR-017 addendum, slice 3). Cohesive
// with account.service the way deletion is: an archive is a whole-account graph,
// not one aggregate. This is the only layer here that touches the database and
// object storage — it reads every owned row and its blobs for export, and inserts
// the whole remapped graph transactionally for restore. Every method is scoped by
// the owner's `userId`, which the service takes from the session (tenant
// isolation): a read never selects another tenant's row, and a restore only ever
// writes rows owned by the acting user.

/** An image blob with the metadata the manifest needs, bytes included. */
export type SnapshotImage = {
  coinId: string;
  mimeType: string;
  createdAt: Date;
  data: Buffer;
};

/** An invoice blob, as above plus the original filename. */
export type SnapshotInvoice = SnapshotImage & { filename: string | null };

/** The complete owned graph for one user, blobs resolved from storage. */
export type AccountSnapshot = {
  collections: Collection[];
  coins: Coin[];
  valuations: Valuation[];
  images: SnapshotImage[];
  invoices: SnapshotInvoice[];
};

/** Coin attributes to restore — everything but the ids the restore assigns. */
export type RestoreCoin = Omit<NewCoin, "id" | "collectionId">;
/** Valuation attributes to restore — everything but the ids the restore assigns. */
export type RestoreValuation = Omit<NewValuation, "id" | "coinId">;

/**
 * The remapped graph a restore inserts. Rows reference each other by their
 * **source** ids (the ids from the archive); the repository assigns fresh ids and
 * wires the foreign keys, so no archive id becomes a live id. `data` carries the
 * decoded blob bytes.
 */
export type RestoreGraph = {
  collections: { srcId: string; name: string; createdAt: Date }[];
  coins: { srcId: string; srcCollectionId: string; values: RestoreCoin }[];
  valuations: { srcCoinId: string; values: RestoreValuation }[];
  images: { srcCoinId: string; mimeType: string; createdAt: Date; data: Buffer }[];
  invoices: {
    srcCoinId: string;
    mimeType: string;
    filename: string | null;
    createdAt: Date;
    data: Buffer;
  }[];
};

export type RestoreCounts = {
  collections: number;
  coins: number;
  valuations: number;
  images: number;
  invoices: number;
};

// Insert batch size. Postgres caps bound parameters per statement at 65535; coins
// carry ~27 columns, so a batch of 500 stays well clear on the widest table while
// keeping restore to a handful of statements. Batching happens inside the one
// transaction, so atomicity holds regardless.
const BATCH = 500;

function chunk<T>(rows: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size));
  return out;
}

export const archiveRepository = {
  /**
   * Read every collection, coin, valuation, image and invoice the user owns, with
   * the image/invoice bytes fetched from object storage. Buffered whole (ADR-017
   * §8). Coins and valuations are reached only through the user's collections, so
   * the scope is the same indirect `collections.user_id` the coin surfaces use.
   */
  async readAccountSnapshot(userId: string): Promise<AccountSnapshot> {
    const ownedCollections = await db
      .select()
      .from(collections)
      .where(eq(collections.userId, userId))
      .orderBy(asc(collections.createdAt));

    const ownedCoins = await db
      .select()
      .from(coins)
      .innerJoin(collections, eq(coins.collectionId, collections.id))
      .where(eq(collections.userId, userId))
      .orderBy(asc(coins.createdAt))
      .then((rows) => rows.map((r) => r.coins));

    const ownedValuations = await db
      .select()
      .from(valuations)
      .innerJoin(coins, eq(valuations.coinId, coins.id))
      .innerJoin(collections, eq(coins.collectionId, collections.id))
      .where(eq(collections.userId, userId))
      .orderBy(asc(valuations.valuedAt))
      .then((rows) => rows.map((r) => r.valuations));

    const imageRows = await db
      .select({
        coinId: coinImages.coinId,
        mimeType: coinImages.mimeType,
        storageKey: coinImages.storageKey,
        createdAt: coinImages.createdAt,
      })
      .from(coinImages)
      .innerJoin(coins, eq(coinImages.coinId, coins.id))
      .innerJoin(collections, eq(coins.collectionId, collections.id))
      .where(eq(collections.userId, userId))
      .orderBy(asc(coinImages.createdAt));

    const invoiceRows = await db
      .select({
        coinId: coinInvoices.coinId,
        mimeType: coinInvoices.mimeType,
        filename: coinInvoices.filename,
        storageKey: coinInvoices.storageKey,
        createdAt: coinInvoices.createdAt,
      })
      .from(coinInvoices)
      .innerJoin(coins, eq(coinInvoices.coinId, coins.id))
      .innerJoin(collections, eq(coins.collectionId, collections.id))
      .where(eq(collections.userId, userId))
      .orderBy(asc(coinInvoices.createdAt));

    // A metadata row whose blob is missing from storage is skipped rather than
    // failing the whole export — the same best-effort tolerance the media
    // repositories accept for a purge, applied to a read.
    const images: SnapshotImage[] = [];
    for (const row of imageRows) {
      const data = await objectStorage.get(row.storageKey);
      if (!data) {
        logger.warn("archive export skipped an image with no stored bytes", {
          userId,
          storageKey: row.storageKey,
        });
        continue;
      }
      images.push({ coinId: row.coinId, mimeType: row.mimeType, createdAt: row.createdAt, data });
    }

    const invoices: SnapshotInvoice[] = [];
    for (const row of invoiceRows) {
      const data = await objectStorage.get(row.storageKey);
      if (!data) {
        logger.warn("archive export skipped an invoice with no stored bytes", {
          userId,
          storageKey: row.storageKey,
        });
        continue;
      }
      invoices.push({
        coinId: row.coinId,
        mimeType: row.mimeType,
        filename: row.filename,
        createdAt: row.createdAt,
        data,
      });
    }

    return { collections: ownedCollections, coins: ownedCoins, valuations: ownedValuations, images, invoices };
  },

  /**
   * Restore a remapped graph into the user's account (additive — ADR-017 addendum
   * §14 restated for archives: fresh ids, nothing overwritten).
   *
   * New ids are minted in JS up front so blob storage keys can be formed before
   * anything is written. Order of operations makes the write clean on failure:
   *   1. Put every blob to storage. A failure here aborts before any DB write,
   *      leaving only orphaned objects (logged), never a half-written graph.
   *   2. Insert the whole relational graph in a single transaction. A failure
   *      rolls the DB back and the just-written blobs are best-effort deleted.
   * So the outcome is all-or-nothing for the database, with at worst some
   * orphaned blobs — the exact tolerance `deleteAccount` already accepts (ADR-013).
   */
  async restoreAccount(userId: string, graph: RestoreGraph): Promise<RestoreCounts> {
    const collIds = new Map<string, string>();
    for (const c of graph.collections) collIds.set(c.srcId, randomUUID());
    const coinIds = new Map<string, string>();
    for (const k of graph.coins) coinIds.set(k.srcId, randomUUID());

    // Blobs first, so a storage failure never leaves a half-written graph.
    const putKeys: string[] = [];
    const imageRows: (typeof coinImages.$inferInsert)[] = [];
    const invoiceRows: (typeof coinInvoices.$inferInsert)[] = [];
    try {
      for (const img of graph.images) {
        const coinId = coinIds.get(img.srcCoinId);
        if (!coinId) continue; // orphan reference; validated away by the service
        const key = `coins/${coinId}/${randomUUID()}`;
        await objectStorage.put(key, img.data, img.mimeType);
        putKeys.push(key);
        imageRows.push({
          coinId,
          mimeType: img.mimeType,
          storageKey: key,
          sizeBytes: img.data.length,
          createdAt: img.createdAt,
        });
      }
      for (const inv of graph.invoices) {
        const coinId = coinIds.get(inv.srcCoinId);
        if (!coinId) continue;
        const key = `invoices/${coinId}/${randomUUID()}`;
        await objectStorage.put(key, inv.data, inv.mimeType);
        putKeys.push(key);
        invoiceRows.push({
          coinId,
          mimeType: inv.mimeType,
          filename: inv.filename,
          storageKey: key,
          sizeBytes: inv.data.length,
          createdAt: inv.createdAt,
        });
      }

      await db.transaction(async (tx) => {
        const collectionValues = graph.collections.map((c) => ({
          id: collIds.get(c.srcId)!,
          userId,
          name: c.name,
          createdAt: c.createdAt,
        }));
        for (const batch of chunk(collectionValues, BATCH)) {
          await tx.insert(collections).values(batch);
        }

        const coinValues = graph.coins.map((k) => ({
          ...k.values,
          id: coinIds.get(k.srcId)!,
          collectionId: collIds.get(k.srcCollectionId)!,
        }));
        for (const batch of chunk(coinValues, BATCH)) {
          await tx.insert(coins).values(batch);
        }

        const valuationValues = graph.valuations.map((v) => ({
          ...v.values,
          coinId: coinIds.get(v.srcCoinId)!,
        }));
        for (const batch of chunk(valuationValues, BATCH)) {
          await tx.insert(valuations).values(batch);
        }

        for (const batch of chunk(imageRows, BATCH)) {
          await tx.insert(coinImages).values(batch);
        }
        for (const batch of chunk(invoiceRows, BATCH)) {
          await tx.insert(coinInvoices).values(batch);
        }
      });
    } catch (err) {
      // The DB rolled back (or was never touched); clean up any blobs we put.
      const results = await Promise.allSettled(putKeys.map((k) => objectStorage.delete(k)));
      const failed = results.filter((r) => r.status === "rejected").length;
      if (failed > 0) {
        logger.warn("archive restore left orphaned storage objects after failure", {
          userId,
          failed,
          total: putKeys.length,
        });
      }
      throw err;
    }

    return {
      collections: graph.collections.length,
      coins: graph.coins.length,
      valuations: graph.valuations.length,
      images: imageRows.length,
      invoices: invoiceRows.length,
    };
  },
};
