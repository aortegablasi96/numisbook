import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { coins, collections, valuations } from "@/db/schema";

// One valuation joined with its coin and collection, scoped to a user. The
// service derives portfolio figures (latest-per-coin, totals, allocation, trend)
// from these rows; aggregation is business logic and lives in the service.
export type PortfolioValuationRow = {
  coinId: string;
  coinName: string;
  metal: string | null;
  category: string | null;
  collectionId: string;
  collectionName: string;
  amount: string;
  currency: string;
  valuedAt: Date;
};

// Read-model data access for analytics. Joins across aggregates for reporting;
// like every repository it is the only layer that touches the database, and all
// reads are scoped to the owning user (tenant isolation).
export const analyticsRepository = {
  /** Every valuation for the user's coins, oldest first (for trend building). */
  async valuationsWithCoinForUser(
    userId: string,
  ): Promise<PortfolioValuationRow[]> {
    return db
      .select({
        coinId: coins.id,
        coinName: coins.name,
        metal: coins.metal,
        category: coins.category,
        collectionId: collections.id,
        collectionName: collections.name,
        amount: valuations.amount,
        currency: valuations.currency,
        valuedAt: valuations.valuedAt,
      })
      .from(valuations)
      .innerJoin(coins, eq(valuations.coinId, coins.id))
      .innerJoin(collections, eq(coins.collectionId, collections.id))
      .where(eq(collections.userId, userId))
      .orderBy(asc(valuations.valuedAt), asc(valuations.createdAt));
  },

  /** Total number of coins across the user's collections (valued or not). */
  async coinCountForUser(userId: string): Promise<number> {
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(coins)
      .innerJoin(collections, eq(coins.collectionId, collections.id))
      .where(eq(collections.userId, userId));
    return row?.count ?? 0;
  },
};
