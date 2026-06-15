import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { coins, collections } from "@/db/schema";

export type Collection = typeof collections.$inferSelect;
export type CollectionWithCount = Collection & { coinCount: number };

// Data access for the collections aggregate. Only this layer touches the
// database; methods are intention-revealing and return domain-shaped rows.
export const collectionRepository = {
  /**
   * The user's collections, each with the number of coins it holds. The LEFT
   * JOIN keeps empty collections (count 0); scoping by `collections.userId`
   * keeps the counts tenant-isolated (only the owner's collections are joined).
   */
  async listByUserWithCounts(userId: string): Promise<CollectionWithCount[]> {
    return db
      .select({
        id: collections.id,
        userId: collections.userId,
        name: collections.name,
        createdAt: collections.createdAt,
        coinCount: sql<number>`count(${coins.id})::int`,
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
