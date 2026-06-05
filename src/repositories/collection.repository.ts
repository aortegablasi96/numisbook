import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { collections } from "@/db/schema";

export type Collection = typeof collections.$inferSelect;

// Data access for the collections aggregate. Only this layer touches the
// database; methods are intention-revealing and return domain-shaped rows.
export const collectionRepository = {
  async listByUser(userId: string): Promise<Collection[]> {
    return db
      .select()
      .from(collections)
      .where(eq(collections.userId, userId))
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
