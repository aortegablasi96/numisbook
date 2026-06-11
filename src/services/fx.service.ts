import {
  fxRateRepository,
  type NewFxRate,
} from "@/repositories/fxRate.repository";
import { fxRateProvider } from "@/lib/fx";

// Currency conversion (ADR-007). Converts amounts between currencies using ECB
// reference rates, with cache-or-fetch orchestration here (business logic) and
// the cache itself behind fxRateRepository.
//
// Rates are stored as units-per-EUR; any pair is derived through the EUR pivot:
//   eur    = amount / ratePerEur(from)
//   result = eur * ratePerEur(to)
// EUR is the implicit pivot with rate 1.

const ISO_4217 = /^[A-Z]{3}$/;
const LOOKBACK_DAYS = 7; // so "nearest rate on or before" works at the range start
const STALE_DAYS = 4; // refetch if newest cached rate is older than this (covers weekends)

export type Converter = {
  base: string;
  /** Convert `amount` from `from` into the base currency using the rate on or
   *  before `on`. Null when no rate covers the currency/date (unconvertible). */
  convert(amount: number, from: string, on: Date): number | null;
  /** Convert using the most recent available rate (the "current" snapshot). */
  convertLatest(amount: number, from: string): number | null;
};

const isoDate = (d: Date): string => d.toISOString().slice(0, 10);

function shiftDays(d: Date, days: number): Date {
  const out = new Date(d);
  out.setUTCDate(out.getUTCDate() + days);
  return out;
}

// A currency's cached rates, kept sorted ascending by date for lookups.
type Series = { date: string; rate: number }[];

function rateOnOrBefore(series: Series | undefined, date: string): number | null {
  if (!series || series.length === 0) return null;
  let result: number | null = null;
  for (const point of series) {
    if (point.date <= date) result = point.rate;
    else break; // sorted ascending: no later point can qualify
  }
  return result;
}

function latestRate(series: Series | undefined): number | null {
  if (!series || series.length === 0) return null;
  return series[series.length - 1].rate;
}

/**
 * Build a converter into `base` covering `currencies` over the valuation date
 * span [minDate, maxDate]. Pulls cached rates, fetching any stale/missing
 * currencies from the provider first (tolerating an unreachable provider by
 * using whatever is cached).
 */
export async function buildConverter(
  base: string,
  currencies: string[],
  minDate: Date,
  maxDate: Date,
): Promise<Converter> {
  // Everything is expressed against EUR; EUR itself needs no rate row.
  const symbols = [...new Set([...currencies, base])].filter(
    (c) => ISO_4217.test(c) && c !== "EUR",
  );

  const today = new Date();
  const start = isoDate(shiftDays(minDate, -LOOKBACK_DAYS));
  // Fetch through today so the "current" snapshot uses the latest rate, even
  // when the newest valuation is older.
  const end = isoDate(maxDate > today ? maxDate : today);

  if (symbols.length > 0) {
    const bounds = await fxRateRepository.rateDateBounds(symbols);
    const staleCutoff = isoDate(shiftDays(today, -STALE_DAYS));
    // The oldest date any conversion will look up. The cache must reach at least
    // this far back, or historical conversions (e.g. a 2024 purchase) would find
    // no rate on or before their date even though the recent end is fresh.
    const earliestNeeded = isoDate(minDate);
    const needsFetch = symbols.filter((s) => {
      const b = bounds[s];
      if (!b) return true; // never cached
      if (b.max < staleCutoff) return true; // recent end is stale
      if (b.min > earliestNeeded) return true; // cache doesn't cover history
      return false;
    });
    if (needsFetch.length > 0) {
      const fetched = await fxRateProvider.timeSeries(needsFetch, start, end);
      const rows: NewFxRate[] = [];
      for (const [rateDate, byCurrency] of Object.entries(fetched)) {
        for (const [currency, rate] of Object.entries(byCurrency)) {
          rows.push({ rateDate, currency, rate: String(rate) });
        }
      }
      await fxRateRepository.upsertMany(rows);
    }
  }

  const cached = await fxRateRepository.ratesInRange(symbols, start, end);
  const byCurrency = new Map<string, Series>();
  for (const row of cached) {
    const series = byCurrency.get(row.currency) ?? [];
    series.push({ date: row.rateDate, rate: Number.parseFloat(row.rate) });
    byCurrency.set(row.currency, series);
  }
  for (const series of byCurrency.values()) {
    series.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  }

  const ratePerEur = (
    currency: string,
    pick: (s: Series | undefined) => number | null,
  ): number | null => (currency === "EUR" ? 1 : pick(byCurrency.get(currency)));

  return {
    base,
    convert(amount, from, on) {
      // An amount already in the base currency needs no rate (and so is never
      // unconvertible, even if that currency is missing from the cache).
      if (from === base) return amount;
      const date = isoDate(on);
      const rFrom = ratePerEur(from, (s) => rateOnOrBefore(s, date));
      const rTo = ratePerEur(base, (s) => rateOnOrBefore(s, date));
      if (rFrom == null || rTo == null) return null;
      return (amount / rFrom) * rTo;
    },
    convertLatest(amount, from) {
      if (from === base) return amount;
      const rFrom = ratePerEur(from, latestRate);
      const rTo = ratePerEur(base, latestRate);
      if (rFrom == null || rTo == null) return null;
      return (amount / rFrom) * rTo;
    },
  };
}
