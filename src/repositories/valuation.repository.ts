import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { valuations } from "@/db/schema";

export type Valuation = typeof valuations.$inferSelect;
export type NewValuation = typeof valuations.$inferInsert;

// Data access for the valuations aggregate. Only this layer touches the database.
// A valuation's tenant is its coin's owner; ownership is enforced in the service
// (which checks the coin) before these methods run.
export const valuationRepository = {
  /** Value history for a coin, most recent valuation first. */
  async listByCoin(coinId: string): Promise<Valuation[]> {
    return db
      .select()
      .from(valuations)
      .where(eq(valuations.coinId, coinId))
      .orderBy(desc(valuations.valuedAt));
  },

  async create(input: NewValuation): Promise<Valuation> {
    const [row] = await db.insert(valuations).values(input).returning();
    return row;
  },
};
