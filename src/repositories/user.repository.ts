import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

export type User = typeof users.$inferSelect;

// Data access for the users aggregate. The Auth.js adapter owns user *writes*
// during the OAuth flow; this repository exposes the reads application code
// needs. Only this layer touches the database.
export const userRepository = {
  async findById(id: string): Promise<User | null> {
    const [row] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return row ?? null;
  },

  async findByEmail(email: string): Promise<User | null> {
    const [row] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    return row ?? null;
  },

  /** Set (or clear, with null) the user's preferred base currency. */
  async updateBaseCurrency(
    id: string,
    baseCurrency: string | null,
  ): Promise<void> {
    await db.update(users).set({ baseCurrency }).where(eq(users.id, id));
  },
};
