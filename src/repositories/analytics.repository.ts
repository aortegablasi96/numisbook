import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { coins, coinImages, collections } from "@/db/schema";

// One coin with the data the portfolio read-model needs, scoped to a user. The
// service derives portfolio figures (totals, allocation, acquisition-cost trend)
// from the price paid; aggregation is business logic and lives in the service.
//
// Analytics is currently based on the price paid, not on market valuations —
// valuation-based value and gain/loss are a later stage (see ADR-007).
export type PortfolioCoinRow = {
  coinId: string;
  metal: string | null;
  category: string | null;
  // Title-deriving attributes (coins have no name — see src/lib/coin-format).
  issuingAuthority: string | null;
  yearFrom: number | null;
  yearTo: number | null;
  mint: string | null;
  collectionId: string;
  collectionName: string;
  hammerPrice: string | null;
  auctionPremium: string | null;
  shippingCost: string | null;
  finalPrice: string | null;
  priceCurrency: string | null;
  auctionDate: string | null; // YYYY-MM-DD
  firstImageId: string | null; // oldest coin image, for the cost-breakdown avatar
};

// Read-model data access for analytics. Joins across aggregates for reporting;
// like every repository it is the only layer that touches the database, and all
// reads are scoped to the owning user (tenant isolation).
export const analyticsRepository = {
  /** Every coin the user owns, with its price paid, oldest acquisition first. */
  async coinsForUser(userId: string): Promise<PortfolioCoinRow[]> {
    return db
      .select({
        coinId: coins.id,
        metal: coins.metal,
        category: coins.category,
        issuingAuthority: coins.issuingAuthority,
        yearFrom: coins.yearFrom,
        yearTo: coins.yearTo,
        mint: coins.mint,
        collectionId: collections.id,
        collectionName: collections.name,
        hammerPrice: coins.hammerPrice,
        auctionPremium: coins.auctionPremium,
        shippingCost: coins.shippingCost,
        finalPrice: coins.finalPrice,
        priceCurrency: coins.priceCurrency,
        auctionDate: coins.auctionDate,
        // Oldest image per coin (NULL when the coin has none); the cost-breakdown
        // chart draws it as an avatar above the coin's column.
        firstImageId: sql<string | null>`(
          SELECT ci.id FROM ${coinImages} ci
          WHERE ci.coin_id = ${coins.id}
          ORDER BY ci.created_at ASC, ci.id ASC
          LIMIT 1
        )`,
      })
      .from(coins)
      .innerJoin(collections, eq(coins.collectionId, collections.id))
      .where(eq(collections.userId, userId))
      // Ascending acquisition date (nulls last) so the trend can accumulate.
      .orderBy(asc(coins.auctionDate));
  },
};
