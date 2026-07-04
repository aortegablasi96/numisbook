import { and, asc, desc, eq, gte, ilike, inArray, isNotNull, isNull, lte, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { coins, coinImages, collections } from "@/db/schema";

export type Coin = typeof coins.$inferSelect;
export type NewCoin = typeof coins.$inferInsert;
export type CoinPatch = Partial<Omit<NewCoin, "id" | "collectionId" | "createdAt">>;

// A recently acquired coin for the home dashboard's "Recent acquisitions" list:
// enough to derive the title (coins have no name), the category · denomination ·
// metal line, the price paid, the acquisition date, and a thumbnail.
export type RecentAcquisition = {
  id: string;
  collectionId: string;
  category: string | null;
  issuingAuthority: string | null;
  yearFrom: number | null;
  yearTo: number | null;
  mint: string | null;
  denomination: string | null;
  metal: string | null;
  finalPrice: string | null;
  priceCurrency: string | null;
  auctionDate: string | null; // YYYY-MM-DD; nullable
  firstImageId: string | null; // oldest coin image, for the row thumbnail
  secondImageId: string | null; // next-oldest image, shown beside the first
};

export type CoinSortBy = "category" | "metal" | "denomination" | "year" | "createdAt";
export type CoinSortDir = "asc" | "desc";

export type CoinFilters = {
  q?: string;
  metal?: string;
  category?: string;
  year?: number;
  sortBy?: CoinSortBy;
  sortDir?: CoinSortDir;
  limit: number;
  offset: number;
};

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

  /**
   * Search/filter coins within a collection, with pagination. Text fields use
   * case-insensitive partial matching; the free-text query `q` matches the
   * coin's identifying attributes (category / issuing authority), since coins
   * have no name. A `year` filter matches coins whose minting range contains it
   * (open-ended bounds count as unbounded on that side). Returns the page plus
   * the total count for the same filters.
   */
  async searchInCollection(
    collectionId: string,
    filters: CoinFilters,
  ): Promise<{ coins: Coin[]; total: number }> {
    const conditions: SQL[] = [eq(coins.collectionId, collectionId)];
    if (filters.q)
      conditions.push(
        or(
          ilike(coins.category, `%${filters.q}%`),
          ilike(coins.issuingAuthority, `%${filters.q}%`),
        )!,
      );
    if (filters.metal) conditions.push(ilike(coins.metal, filters.metal));
    if (filters.category) conditions.push(ilike(coins.category, filters.category));
    if (filters.year !== undefined) {
      const y = filters.year;
      // Match coins whose [year_from, year_to] range contains y. A missing bound
      // is unbounded on that side; coins with neither bound never match.
      conditions.push(
        and(
          or(isNotNull(coins.yearFrom), isNotNull(coins.yearTo)),
          or(isNull(coins.yearFrom), lte(coins.yearFrom, y)),
          or(isNull(coins.yearTo), gte(coins.yearTo, y)),
        )!,
      );
    }
    const where = and(...conditions);

    const dir = (filters.sortDir ?? "desc") === "asc" ? asc : desc;
    const orderCol = (() => {
      switch (filters.sortBy) {
        case "category":     return dir(coins.category);
        case "metal":        return dir(coins.metal);
        case "denomination": return dir(coins.denomination);
        case "year":         return dir(coins.yearFrom);
        default:             return desc(coins.createdAt);
      }
    })();

    const rows = await db
      .select()
      .from(coins)
      .where(where)
      .orderBy(orderCol)
      .limit(filters.limit)
      .offset(filters.offset);

    const [counted] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(coins)
      .where(where);

    return { coins: rows, total: counted?.total ?? 0 };
  },

  /**
   * The user's most recently acquired coins across all their collections, most
   * recent first, capped at `limit`. "Acquired" is the auction date; coins
   * without one fall back to their created-at date, so undated coins still
   * interleave by when they were added (rather than sinking below every dated
   * coin). `created_at` breaks ties. Tenant-scoped via the owning collection.
   */
  async listRecentAcquisitionsForUser(
    userId: string,
    limit: number,
  ): Promise<RecentAcquisition[]> {
    return db
      .select({
        id: coins.id,
        collectionId: coins.collectionId,
        category: coins.category,
        issuingAuthority: coins.issuingAuthority,
        yearFrom: coins.yearFrom,
        yearTo: coins.yearTo,
        mint: coins.mint,
        denomination: coins.denomination,
        metal: coins.metal,
        finalPrice: coins.finalPrice,
        priceCurrency: coins.priceCurrency,
        auctionDate: coins.auctionDate,
        firstImageId: sql<string | null>`(
          SELECT ci.id FROM ${coinImages} ci
          WHERE ci.coin_id = ${coins.id}
          ORDER BY ci.created_at ASC, ci.id ASC
          LIMIT 1
        )`,
        secondImageId: sql<string | null>`(
          SELECT ci.id FROM ${coinImages} ci
          WHERE ci.coin_id = ${coins.id}
          ORDER BY ci.created_at ASC, ci.id ASC
          LIMIT 1 OFFSET 1
        )`,
      })
      .from(coins)
      .innerJoin(collections, eq(coins.collectionId, collections.id))
      .where(eq(collections.userId, userId))
      .orderBy(
        sql`COALESCE(${coins.auctionDate}, ${coins.createdAt}::date) DESC`,
        desc(coins.createdAt),
      )
      .limit(limit);
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

  /** Distinct non-null metal and category values in a collection, for filter dropdowns. */
  async getDistinctFacets(collectionId: string): Promise<{ metals: string[]; categories: string[] }> {
    const [metalRows, categoryRows] = await Promise.all([
      db.selectDistinct({ value: coins.metal }).from(coins)
        .where(and(eq(coins.collectionId, collectionId), isNotNull(coins.metal)))
        .orderBy(asc(coins.metal)),
      db.selectDistinct({ value: coins.category }).from(coins)
        .where(and(eq(coins.collectionId, collectionId), isNotNull(coins.category)))
        .orderBy(asc(coins.category)),
    ]);
    return {
      metals: metalRows.flatMap((r) => (r.value ? [r.value] : [])),
      categories: categoryRows.flatMap((r) => (r.value ? [r.value] : [])),
    };
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
