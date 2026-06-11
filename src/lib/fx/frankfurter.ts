import type { FxRateProvider, RatesByDate } from "./types";

// FX provider backed by frankfurter.app, which serves European Central Bank
// reference rates (free, open, no API key). Base defaults to EUR, matching our
// EUR-pivot storage. See ADR-007.
//
// Time-series endpoint:
//   GET {baseUrl}/{start}..{end}?symbols=USD,GBP
//   → { amount, base: "EUR", start_date, end_date, rates: { "2026-01-02": { USD: 1.08 }, ... } }
export class FrankfurterProvider implements FxRateProvider {
  constructor(private readonly baseUrl = "https://api.frankfurter.app") {}

  async timeSeries(
    currencies: string[],
    start: string,
    end: string,
  ): Promise<RatesByDate> {
    // EUR is the implicit base; never request it as a symbol.
    const symbols = [...new Set(currencies)].filter((c) => c && c !== "EUR");
    if (symbols.length === 0) return {};

    const url = `${this.baseUrl}/${start}..${end}?symbols=${symbols.join(",")}`;
    try {
      const res = await fetch(url, {
        // Rates change at most daily; let Next cache the upstream response.
        next: { revalidate: 60 * 60 },
      });
      if (!res.ok) return {};
      const body = (await res.json()) as { rates?: RatesByDate };
      return body.rates ?? {};
    } catch {
      // Unreachable source → empty; the FX service falls back to cached rates.
      return {};
    }
  }
}
