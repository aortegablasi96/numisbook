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

  /**
   * The public demo tenant, or null when none is seeded (ADR-016). A partial
   * unique index guarantees there is at most one. This is the only way the demo
   * user's id is ever obtained — it is never accepted from client input.
   */
  async findDemo(): Promise<User | null> {
    const [row] = await db
      .select()
      .from(users)
      .where(eq(users.isDemo, true))
      .limit(1);
    return row ?? null;
  },

  /**
   * Create the demo tenant. Used only by the seed script — the demo user has no
   * OAuth account, so the Auth.js adapter never creates it (ADR-016).
   */
  async createDemo(user: {
    email: string;
    name: string;
    baseCurrency: string;
  }): Promise<User> {
    const [row] = await db
      .insert(users)
      .values({ ...user, isDemo: true })
      .returning();
    return row;
  },

  /** Update the user's display name. */
  async updateName(id: string, name: string): Promise<void> {
    await db.update(users).set({ name }).where(eq(users.id, id));
  },

  /** Set (or clear, with null) the user's preferred base currency. */
  async updateBaseCurrency(
    id: string,
    baseCurrency: string | null,
  ): Promise<void> {
    await db.update(users).set({ baseCurrency }).where(eq(users.id, id));
  },

  /** Set (or clear, with null) the user's preferred interface language. */
  async updateLocale(id: string, locale: string | null): Promise<void> {
    await db.update(users).set({ locale }).where(eq(users.id, id));
  },

  /** Set (or clear, with null) the user's preferred interface theme. */
  async updateTheme(id: string, theme: string | null): Promise<void> {
    await db.update(users).set({ theme }).where(eq(users.id, id));
  },

  /**
   * Permanently delete the user row. Postgres foreign keys cascade the entire
   * owned graph (collections → coins → images/invoices/valuations, and the
   * Auth.js accounts/sessions). Object-storage blobs are purged separately by
   * the account service — a DB cascade cannot reach them (see ADR-013).
   */
  async deleteById(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  },
};
