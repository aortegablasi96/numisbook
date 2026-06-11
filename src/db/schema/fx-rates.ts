import {
  pgTable,
  text,
  numeric,
  date,
  timestamp,
  primaryKey,
  index,
} from "drizzle-orm/pg-core";

// Cache of European Central Bank daily reference rates (via frankfurter.app),
// stored in ECB's native quotation: `rate` = units of `currency` per 1 EUR on
// `date`. EUR itself is implicit (rate 1) and never stored. Any currency pair is
// derived through the EUR pivot in the FX service — see ADR-007. The table is a
// cache: rows are (re)fetched on demand and conversions tolerate gaps by using
// the most recent rate on or before the requested date.
export const fxRates = pgTable(
  "fx_rates",
  {
    // ECB publication day this rate applies to.
    rateDate: date("rate_date").notNull(),
    // ISO 4217 code of the quoted currency.
    currency: text("currency").notNull(),
    // Units of `currency` per 1 EUR.
    rate: numeric("rate", { precision: 18, scale: 8 }).notNull(),
    fetchedAt: timestamp("fetched_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.rateDate, table.currency] }),
    // "Most recent rate on or before date D" for a currency: scan by currency
    // then date descending.
    index("fx_rates_currency_date_idx").on(table.currency, table.rateDate),
  ],
);
