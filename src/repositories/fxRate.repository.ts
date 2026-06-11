import { and, gte, inArray, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { fxRates } from "@/db/schema";

export type FxRate = typeof fxRates.$inferSelect;
export type NewFxRate = typeof fxRates.$inferInsert;

// One cached rate row, as the FX service consumes it. `rate` is units of
// `currency` per 1 EUR on `rateDate` (YYYY-MM-DD).
export type CachedRate = {
  rateDate: string;
  currency: string;
  rate: string;
};

// Data access for the FX-rate cache (ADR-007). Not tenant-scoped: exchange rates
// are global reference data, shared across all users. Only this layer touches
// the database.
export const fxRateRepository = {
  /** Cached rates for the given currencies within [start, end] (inclusive). */
  async ratesInRange(
    currencies: string[],
    start: string,
    end: string,
  ): Promise<CachedRate[]> {
    if (currencies.length === 0) return [];
    return db
      .select({
        rateDate: fxRates.rateDate,
        currency: fxRates.currency,
        rate: fxRates.rate,
      })
      .from(fxRates)
      .where(
        and(
          inArray(fxRates.currency, currencies),
          gte(fxRates.rateDate, start),
          lte(fxRates.rateDate, end),
        ),
      );
  },

  /**
   * Cached `rate_date` bounds per currency: the oldest and newest rate held.
   * The FX service uses `max` for freshness (is the recent end stale?) and `min`
   * for coverage (does the cache reach back to the oldest needed date?).
   * Currencies with no cached rows are absent from the result.
   */
  async rateDateBounds(
    currencies: string[],
  ): Promise<Record<string, { min: string; max: string }>> {
    if (currencies.length === 0) return {};
    const rows = await db
      .select({
        currency: fxRates.currency,
        minDate: sql<string>`min(${fxRates.rateDate})`,
        maxDate: sql<string>`max(${fxRates.rateDate})`,
      })
      .from(fxRates)
      .where(inArray(fxRates.currency, currencies))
      .groupBy(fxRates.currency);
    return Object.fromEntries(
      rows.map((r) => [r.currency, { min: r.minDate, max: r.maxDate }]),
    );
  },

  /** Upsert fetched rates, refreshing the rate and fetch timestamp on conflict. */
  async upsertMany(rows: NewFxRate[]): Promise<void> {
    if (rows.length === 0) return;
    await db
      .insert(fxRates)
      .values(rows)
      .onConflictDoUpdate({
        target: [fxRates.rateDate, fxRates.currency],
        set: { rate: sql`excluded.rate`, fetchedAt: sql`now()` },
      });
  },
};
