import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { coinImages, coins, collections } from "@/db/schema";

export type Collection = typeof collections.$inferSelect;
// `coverCoinId`/`coverImageId` identify the first image of the collection's
// oldest coin, used as the collection card's background (null when no coin in
// the collection has an image).
export type CollectionWithCount = Collection & {
  coinCount: number;
  coverCoinId: string | null;
  coverImageId: string | null;
};

// Data access for the collections aggregate. Only this layer touches the
// database; methods are intention-revealing and return domain-shaped rows.
export const collectionRepository = {
  /**
   * The user's collections, each with the number of coins it holds. The LEFT
   * JOIN keeps empty collections (count 0); scoping by `collections.userId`
   * keeps the counts tenant-isolated (only the owner's collections are joined).
   */
  async listByUserWithCounts(userId: string): Promise<CollectionWithCount[]> {
    // The two cover subqueries are ordered identically (oldest coin first, then
    // its oldest image) so they resolve to the same image row — the coin id is
    // needed to build the thumbnail URL (/api/coins/:id/images/:imageId).
    const coverOrder = sql`ORDER BY c2.created_at ASC, c2.id ASC, ci.created_at ASC, ci.id ASC`;
    return db
      .select({
        id: collections.id,
        userId: collections.userId,
        name: collections.name,
        createdAt: collections.createdAt,
        coinCount: sql<number>`count(${coins.id})::int`,
        coverCoinId: sql<string | null>`(
          SELECT c2.id FROM ${coinImages} ci
          JOIN ${coins} c2 ON c2.id = ci.coin_id
          WHERE c2.collection_id = ${collections.id}
          ${coverOrder}
          LIMIT 1
        )`,
        coverImageId: sql<string | null>`(
          SELECT ci.id FROM ${coinImages} ci
          JOIN ${coins} c2 ON c2.id = ci.coin_id
          WHERE c2.collection_id = ${collections.id}
          ${coverOrder}
          LIMIT 1
        )`,
      })
      .from(collections)
      .leftJoin(coins, eq(coins.collectionId, collections.id))
      .where(eq(collections.userId, userId))
      .groupBy(collections.id)
      .orderBy(desc(collections.createdAt));
  },

  /** Find a collection scoped to its owner, so callers never see others' rows. */
  async findByIdForUser(
    id: string,
    userId: string,
  ): Promise<Collection | null> {
    const [row] = await db
      .select()
      .from(collections)
      .where(and(eq(collections.id, id), eq(collections.userId, userId)))
      .limit(1);
    return row ?? null;
  },

  async create(input: { userId: string; name: string }): Promise<Collection> {
    const [row] = await db.insert(collections).values(input).returning();
    return row;
  },

  /** Update an owner's collection; returns null when nothing matched. */
  async update(
    id: string,
    userId: string,
    patch: { name: string },
  ): Promise<Collection | null> {
    const [row] = await db
      .update(collections)
      .set(patch)
      .where(and(eq(collections.id, id), eq(collections.userId, userId)))
      .returning();
    return row ?? null;
  },

  /** Delete an owner's collection; returns whether a row was removed. */
  async delete(id: string, userId: string): Promise<boolean> {
    const rows = await db
      .delete(collections)
      .where(and(eq(collections.id, id), eq(collections.userId, userId)))
      .returning({ id: collections.id });
    return rows.length > 0;
  },
};
