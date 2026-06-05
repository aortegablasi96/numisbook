import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { coins, collections } from "@/db/schema";

export type Coin = typeof coins.$inferSelect;
export type NewCoin = typeof coins.$inferInsert;
export type CoinPatch = Partial<Omit<NewCoin, "id" | "collectionId" | "createdAt">>;

// Subquery of collection ids owned by a user. Coin writes are scoped through it
// so a user can only touch coins inside their own collections (tenant isolation).
function ownedCollectionIds(userId: string) {
  return db
    .select({ id: collections.id })
    .from(collections)
    .where(eq(collections.userId, userId));
}

// Data access for the coins aggregate. Only this layer touches the database.
// A coin's tenant is its collection's owner; methods that act on a coin by id
// scope by `userId` via the owning collection.
export const coinRepository = {
  async listByCollection(collectionId: string): Promise<Coin[]> {
    return db
      .select()
      .from(coins)
      .where(eq(coins.collectionId, collectionId))
      .orderBy(desc(coins.createdAt));
  },

  /** Find a coin only if it lives in one of the user's collections. */
  async findByIdForUser(id: string, userId: string): Promise<Coin | null> {
    const [row] = await db
      .select()
      .from(coins)
      .where(
        and(eq(coins.id, id), inArray(coins.collectionId, ownedCollectionIds(userId))),
      )
      .limit(1);
    return row ?? null;
  },

  async create(input: NewCoin): Promise<Coin> {
    const [row] = await db.insert(coins).values(input).returning();
    return row;
  },

  /** Update a coin only if it lives in one of the user's collections. */
  async updateForUser(
    id: string,
    userId: string,
    patch: CoinPatch,
  ): Promise<Coin | null> {
    const [row] = await db
      .update(coins)
      .set(patch)
      .where(
        and(eq(coins.id, id), inArray(coins.collectionId, ownedCollectionIds(userId))),
      )
      .returning();
    return row ?? null;
  },

  /** Delete a coin only if it lives in one of the user's collections. */
  async deleteForUser(id: string, userId: string): Promise<boolean> {
    const rows = await db
      .delete(coins)
      .where(
        and(eq(coins.id, id), inArray(coins.collectionId, ownedCollectionIds(userId))),
      )
      .returning({ id: coins.id });
    return rows.length > 0;
  },
};
