// Foreign-exchange rate provider abstraction. Mirrors the ObjectStorage pattern
// (src/lib/storage): feature code depends on this interface, never on a concrete
// FX source, so the provider is a one-file swap (see ADR-007).
//
// Rates are quoted in the European Central Bank's native form: the number of
// units of a currency per 1 EUR. EUR is the implicit pivot (rate 1) and is never
// returned. Any currency pair is derived in the FX service via the EUR pivot.

// YYYY-MM-DD → { CURRENCY: unitsPerEur }. ECB does not publish on weekends or
// holidays, so dates are sparse.
export type RatesByDate = Record<string, Record<string, number>>;

export interface FxRateProvider {
  /**
   * ECB reference rates (units of each requested currency per 1 EUR) for every
   * ECB publication day in [start, end] inclusive, keyed by YYYY-MM-DD.
   *
   * `currencies` are ISO 4217 codes; "EUR" is ignored if present (it is the
   * implicit base). Currencies ECB does not quote are simply absent from the
   * result. Implementations must resolve to `{}` (never throw) when the source
   * is unreachable, so callers can fall back to cached rates.
   */
  timeSeries(
    currencies: string[],
    start: string,
    end: string,
  ): Promise<RatesByDate>;
}
