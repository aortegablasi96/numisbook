import {
  analyticsRepository,
  type PortfolioCoinRow,
} from "@/repositories/analytics.repository";
import { buildConverter } from "@/services/fx.service";
import { formatCoinTitle } from "@/lib/coin-format";

// Portfolio analytics. All aggregation is business logic and lives here; the
// repository only supplies the user-scoped coin rows.
//
// Figures are based on the **price paid** for each coin (hammer + premium +
// shipping, or a directly-entered final price), not on market valuations —
// valuation-based value and gain/loss are a later stage (see ADR-007).
// Everything is expressed in a single base currency (the user's preference, or
// the dominant price currency when unset) using ECB FX conversion: each price is
// converted at the rate on or before its acquisition date, so historical
// purchases keep their real base-currency cost. When no rate covers that date
// (or the coin has no acquisition date) the current rate is used instead. Only
// prices in a currency ECB does not quote at all are counted as unconvertible —
// never dropped or summed across currencies.

// One acquisition, in the base currency, with the dimension labels the timeline
// filters by and the price-paid split the cost-breakdown chart stacks. The
// cumulative cost trend is built (and filtered) from these in the client, and the
// per-coin cost-breakdown columns are drawn from `hammer`/`premium`/`shipping`/
// `unsplit` (which sum to `amount`). Only coins with an acquisition date appear —
// they need a point in time to be placed on either chart's date axis.
export type AcquisitionEvent = {
  id: string; // coin id
  label: string; // derived coin title (coins have no name)
  date: string; // YYYY-MM-DD acquisition date
  amount: number; // final price paid, base currency
  hammer: number; // base-currency cost components; sum to `amount`. Partitioned
  premium: number; // coins split across hammer/premium/shipping; final-only coins
  shipping: number; // carry their whole cost in `unsplit` (the other three are 0).
  unsplit: number;
  metal: string;
  category: string;
  collection: string;
  year: string; // acquisition year
  currency: string; // native price currency
};

// Total cost split into its components, base currency. Coins entered with the
// hammer/premium/shipping partition contribute to those three; coins with only a
// final price contribute to `unsplit` (their cost is counted but not split).
// hammer + premium + shipping + unsplit == totalFinal.
export type CostBreakdown = {
  hammer: number;
  premium: number;
  shipping: number;
  unsplit: number;
};

export type PortfolioSummary = {
  totalCoins: number;
  pricedCoins: number; // coins with a recorded price paid
  baseCurrency: string | null;
  totalFinal: number; // total paid, base currency
  unconvertible: number; // priced coins no rate could convert
  costBreakdown: CostBreakdown;
  events: AcquisitionEvent[]; // dated, convertible coins for the filterable trend
};

const toNumber = (amount: string): number => Number.parseFloat(amount);
const round2 = (n: number): number => Math.round(n * 100) / 100;
const parseDay = (day: string): Date => new Date(`${day}T00:00:00Z`);

// Most common price currency by coin count (currency-agnostic, so it needs no
// FX), used as the default base when the user has set no preference.
function dominantCurrency(priced: PortfolioCoinRow[]): string | null {
  const counts = new Map<string, number>();
  for (const row of priced) {
    if (!row.priceCurrency) continue;
    counts.set(row.priceCurrency, (counts.get(row.priceCurrency) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestCount = -1;
  for (const [currency, count] of counts) {
    if (count > bestCount || (count === bestCount && best && currency < best)) {
      best = currency;
      bestCount = count;
    }
  }
  return best;
}

function emptySummary(
  totalCoins: number,
  baseCurrency: string | null,
): PortfolioSummary {
  return {
    totalCoins,
    pricedCoins: 0,
    baseCurrency,
    totalFinal: 0,
    unconvertible: 0,
    costBreakdown: { hammer: 0, premium: 0, shipping: 0, unsplit: 0 },
    events: [],
  };
}

export async function getPortfolioSummary(
  userId: string,
  baseCurrencyPref: string | null,
): Promise<PortfolioSummary> {
  const rows = await analyticsRepository.coinsForUser(userId);
  const totalCoins = rows.length;
  const priced = rows.filter((r) => r.finalPrice != null);

  const baseCurrency = baseCurrencyPref ?? dominantCurrency(priced);
  if (priced.length === 0 || !baseCurrency) {
    return emptySummary(totalCoins, baseCurrency);
  }

  // The converter must span every price currency and acquisition date.
  const currencies = new Set<string>();
  let minDate: Date | null = null;
  let maxDate: Date | null = null;
  for (const row of priced) {
    if (row.priceCurrency) currencies.add(row.priceCurrency);
    if (row.auctionDate) {
      const acquired = parseDay(row.auctionDate);
      if (!minDate || acquired < minDate) minDate = acquired;
      if (!maxDate || acquired > maxDate) maxDate = acquired;
    }
  }
  const today = new Date();
  const converter = await buildConverter(
    baseCurrency,
    [...currencies],
    minDate ?? today,
    maxDate ?? today,
  );

  // Convert at the acquisition-day rate; if no rate covers that date (or the
  // coin has no acquisition date) fall back to the current rate. A coin is only
  // counted unconvertible when even the current rate is unavailable — i.e. ECB
  // does not quote the currency at all.
  const convertPrice = (
    amount: string,
    currency: string | null,
    auctionDate: string | null,
  ): number | null => {
    if (!currency) return null;
    const amt = toNumber(amount);
    if (auctionDate) {
      const atAuction = converter.convert(amt, currency, parseDay(auctionDate));
      if (atAuction != null) return atAuction;
    }
    return converter.convertLatest(amt, currency);
  };

  let totalFinal = 0;
  let unconvertible = 0;
  const breakdown: CostBreakdown = {
    hammer: 0,
    premium: 0,
    shipping: 0,
    unsplit: 0,
  };
  const events: AcquisitionEvent[] = [];

  for (const row of priced) {
    const { priceCurrency: currency, auctionDate } = row;
    const final = convertPrice(row.finalPrice!, currency, auctionDate);
    if (final == null) {
      unconvertible += 1;
      continue;
    }
    totalFinal += final;

    // Coins with a hammer price were entered as a partition; split the cost into
    // its components. Coins with only a final price stay whole (`unsplit`).
    let hammer = 0;
    let premium = 0;
    let shipping = 0;
    let unsplit = 0;
    if (row.hammerPrice != null) {
      hammer = convertPrice(row.hammerPrice, currency, auctionDate) ?? 0;
      if (row.auctionPremium != null)
        premium = convertPrice(row.auctionPremium, currency, auctionDate) ?? 0;
      if (row.shippingCost != null)
        shipping = convertPrice(row.shippingCost, currency, auctionDate) ?? 0;
    } else {
      unsplit = final;
    }
    breakdown.hammer += hammer;
    breakdown.premium += premium;
    breakdown.shipping += shipping;
    breakdown.unsplit += unsplit;

    if (auctionDate) {
      events.push({
        id: row.coinId,
        label: formatCoinTitle(row),
        date: auctionDate,
        amount: round2(final),
        hammer: round2(hammer),
        premium: round2(premium),
        shipping: round2(shipping),
        unsplit: round2(unsplit),
        metal: row.metal ?? "Unknown",
        category: row.category ?? "Uncategorized",
        collection: row.collectionName,
        year: auctionDate.slice(0, 4),
        currency: currency!,
      });
    }
  }

  return {
    totalCoins,
    pricedCoins: priced.length,
    baseCurrency,
    totalFinal: round2(totalFinal),
    unconvertible,
    costBreakdown: {
      hammer: round2(breakdown.hammer),
      premium: round2(breakdown.premium),
      shipping: round2(breakdown.shipping),
      unsplit: round2(breakdown.unsplit),
    },
    events,
  };
}
