import { and, asc, desc, eq, getTableColumns, ilike, inArray, isNotNull, or, sql, type SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { coins, coinGradeEnum, coinImages, collections } from "@/db/schema";

export type Coin = typeof coins.$inferSelect;
export type NewCoin = typeof coins.$inferInsert;
export type CoinPatch = Partial<Omit<NewCoin, "id" | "collectionId" | "createdAt">>;
export type CoinGrade = (typeof coinGradeEnum.enumValues)[number];

/** A coin listed outside its collection, carrying the owner collection for display. */
export type CoinWithCollection = Coin & {
  collectionName: string;
};

/** Distinct values available for the faceted filter dropdowns. */
export type CoinFacets = {
  metals: string[];
  categories: string[];
  denominations: string[];
  mints: string[];
};

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
  metals?: string[];
  categories?: string[];
  denominations?: string[];
  mints?: string[];
  grades?: CoinGrade[];
  yearFrom?: number;
  yearTo?: number;
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

/**
 * The filter predicates, built once and composed by every coin search — the
 * per-collection table and the cross-collection view differ only in the scoping
 * predicate they prepend, so the two surfaces cannot drift (ADR-015).
 *
 * Semantics: values within a field are OR'd, separate fields are AND'd. A NULL
 * column never satisfies a positive filter (SQL's own semantics — a coin with no
 * metal is not matched by a metal filter).
 */
function buildCoinConditions(filters: CoinFilters): SQL[] {
  const conditions: SQL[] = [];

  // Free-text search spans every attribute that identifies a coin. Coins have no
  // name (ADR-006), so this is the closest thing to searching "the coin".
  if (filters.q) {
    const like = `%${filters.q}%`;
    conditions.push(
      or(
        ilike(coins.category, like),
        ilike(coins.issuingAuthority, like),
        ilike(coins.denomination, like),
        ilike(coins.mint, like),
        ilike(coins.catalogueReferences, like),
      )!,
    );
  }

  // Faceted values stay case-insensitive, as the single-value filters were.
  const anyOf = (column: AnyPgColumn, values: string[] | undefined) => {
    if (!values?.length) return;
    conditions.push(or(...values.map((value) => ilike(column, value)))!);
  };
  anyOf(coins.metal, filters.metals);
  anyOf(coins.category, filters.categories);
  anyOf(coins.denomination, filters.denominations);
  anyOf(coins.mint, filters.mints);

  // Grade is a Postgres enum, so an exact set membership rather than a text match.
  if (filters.grades?.length) conditions.push(inArray(coins.grade, filters.grades));

  // Year: overlap between the coin's [year_from, year_to] minting range and the
  // queried range. A half-populated range collapses to a single year via COALESCE
  // (the schema stores a known single year as from == to). A coin with neither
  // bound yields NULL on both sides, so it drops out whenever a year filter is
  // active — which is the intended "nulls don't match a positive filter" rule.
  if (filters.yearTo !== undefined)
    conditions.push(
      sql`COALESCE(${coins.yearFrom}, ${coins.yearTo}) <= ${filters.yearTo}`,
    );
  if (filters.yearFrom !== undefined)
    conditions.push(
      sql`COALESCE(${coins.yearTo}, ${coins.yearFrom}) >= ${filters.yearFrom}`,
    );

  return conditions;
}

function buildCoinOrderBy(filters: CoinFilters): SQL {
  const dir = (filters.sortDir ?? "desc") === "asc" ? asc : desc;
  switch (filters.sortBy) {
    case "category":     return dir(coins.category);
    case "metal":        return dir(coins.metal);
    case "denomination": return dir(coins.denomination);
    case "year":         return dir(coins.yearFrom);
    default:             return desc(coins.createdAt);
  }
}

/** Distinct non-null values of each faceted column, within an arbitrary scope. */
async function distinctFacets(scope: SQL): Promise<CoinFacets> {
  const valuesOf = async (column: AnyPgColumn): Promise<string[]> => {
    const rows = await db
      .selectDistinct({ value: column })
      .from(coins)
      .where(and(scope, isNotNull(column)))
      .orderBy(asc(column));
    return rows.flatMap((row) => (row.value ? [String(row.value)] : []));
  };

  const [metals, categories, denominations, mints] = await Promise.all([
    valuesOf(coins.metal),
    valuesOf(coins.category),
    valuesOf(coins.denomination),
    valuesOf(coins.mint),
  ]);
  return { metals, categories, denominations, mints };
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
   * Search/filter coins within a collection, with pagination. Returns the page
   * plus the total count for the same filters. See `buildCoinConditions` for the
   * filter semantics.
   */
  async searchInCollection(
    collectionId: string,
    filters: CoinFilters,
  ): Promise<{ coins: Coin[]; total: number }> {
    const where = and(
      eq(coins.collectionId, collectionId),
      ...buildCoinConditions(filters),
    );

    const rows = await db
      .select()
      .from(coins)
      .where(where)
      .orderBy(buildCoinOrderBy(filters))
      .limit(filters.limit)
      .offset(filters.offset);

    const [counted] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(coins)
      .where(where);

    return { coins: rows, total: counted?.total ?? 0 };
  },

  /**
   * Search/filter the user's coins across **every** collection they own — the
   * cross-collection `/coins` view. Identical filter semantics to
   * `searchInCollection`; only the scoping predicate differs.
   *
   * Tenant isolation: coins carry no `user_id`, so scoping goes through the
   * owning collection (`collections.user_id`), the same join
   * `listRecentAcquisitionsForUser` already uses for cross-collection reads. The
   * join is required regardless, to carry the collection name for display.
   */
  async searchForUser(
    userId: string,
    filters: CoinFilters,
  ): Promise<{ coins: CoinWithCollection[]; total: number }> {
    const where = and(
      eq(collections.userId, userId),
      ...buildCoinConditions(filters),
    );

    const rows = await db
      .select({ ...getTableColumns(coins), collectionName: collections.name })
      .from(coins)
      .innerJoin(collections, eq(coins.collectionId, collections.id))
      .where(where)
      .orderBy(buildCoinOrderBy(filters))
      .limit(filters.limit)
      .offset(filters.offset);

    const [counted] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(coins)
      .innerJoin(collections, eq(coins.collectionId, collections.id))
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

  /** Distinct faceted values within a collection, for the filter dropdowns. */
  async getDistinctFacets(collectionId: string): Promise<CoinFacets> {
    return distinctFacets(eq(coins.collectionId, collectionId));
  },

  /**
   * Distinct faceted values across every collection the user owns.
   *
   * Tenant isolation: scoped through the user's own collection ids. An unscoped
   * `SELECT DISTINCT mint` would leak *other* collectors' data through a filter
   * dropdown — a facets query is still a data read (ADR-015).
   */
  async getDistinctFacetsForUser(userId: string): Promise<CoinFacets> {
    return distinctFacets(inArray(coins.collectionId, ownedCollectionIds(userId)));
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
