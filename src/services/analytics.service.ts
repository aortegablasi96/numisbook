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
// per-coin cost-breakdown columns are drawn from `hammer`/`premium`/`tax`/
// `shipping`/`unsplit` (which sum to `amount`). Only coins with an acquisition date appear —
// they need a point in time to be placed on either chart's date axis.
export type AcquisitionEvent = {
  id: string; // coin id
  label: string; // derived coin title (coins have no name)
  date: string; // YYYY-MM-DD acquisition date
  amount: number; // final price paid, base currency
  hammer: number; // base-currency cost components; sum to `amount`. Partitioned
  premium: number; // coins split across hammer/premium/tax/shipping; final-only
  tax: number; // coins carry their whole cost in `unsplit` (the others 0).
  shipping: number;
  unsplit: number;
  metal: string;
  category: string;
  collection: string;
  year: string; // acquisition year
  currency: string; // native price currency
  imageId: string | null; // oldest coin image id, for the cost-breakdown avatar
};

// Total cost split into its components, base currency. Coins entered with the
// hammer/premium/tax/shipping partition contribute to those four; coins with only
// a final price contribute to `unsplit` (their cost is counted but not split).
// hammer + premium + tax + shipping + unsplit == totalFinal.
export type CostBreakdown = {
  hammer: number;
  premium: number;
  tax: number;
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
    costBreakdown: { hammer: 0, premium: 0, tax: 0, shipping: 0, unsplit: 0 },
    events: [],
  };
}

// Converts a price in its native currency to the base currency at the
// acquisition-day rate (falling back to the current rate), or null when ECB does
// not quote the currency at all. Built once over a set of priced rows so the FX
// cache spans every currency/date they use. Shared by the portfolio summary and
// the per-collection cost rollup.
type PriceConverter = (
  amount: string,
  currency: string | null,
  auctionDate: string | null,
) => number | null;

async function buildPriceConverter(
  priced: PortfolioCoinRow[],
  baseCurrency: string,
): Promise<PriceConverter> {
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
  return (amount, currency, auctionDate) => {
    if (!currency) return null;
    const amt = toNumber(amount);
    if (auctionDate) {
      const atAuction = converter.convert(amt, currency, parseDay(auctionDate));
      if (atAuction != null) return atAuction;
    }
    return converter.convertLatest(amt, currency);
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

  const convertPrice = await buildPriceConverter(priced, baseCurrency);

  let totalFinal = 0;
  let unconvertible = 0;
  const breakdown: CostBreakdown = {
    hammer: 0,
    premium: 0,
    tax: 0,
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

    // Coins entered with any price component were partitioned; split the cost
    // into its components. Coins with only a final price stay whole (`unsplit`).
    let hammer = 0;
    let premium = 0;
    let tax = 0;
    let shipping = 0;
    let unsplit = 0;
    const partitioned =
      row.hammerPrice != null ||
      row.auctionPremium != null ||
      row.shippingCost != null ||
      row.taxCost != null;
    if (partitioned) {
      if (row.hammerPrice != null)
        hammer = convertPrice(row.hammerPrice, currency, auctionDate) ?? 0;
      if (row.auctionPremium != null)
        premium = convertPrice(row.auctionPremium, currency, auctionDate) ?? 0;
      if (row.taxCost != null)
        tax = convertPrice(row.taxCost, currency, auctionDate) ?? 0;
      if (row.shippingCost != null)
        shipping = convertPrice(row.shippingCost, currency, auctionDate) ?? 0;
    } else {
      unsplit = final;
    }
    breakdown.hammer += hammer;
    breakdown.premium += premium;
    breakdown.tax += tax;
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
        tax: round2(tax),
        shipping: round2(shipping),
        unsplit: round2(unsplit),
        metal: row.metal ?? "Unknown",
        category: row.category ?? "Uncategorized",
        collection: row.collectionName,
        year: auctionDate.slice(0, 4),
        currency: currency!,
        imageId: row.firstImageId,
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
      tax: round2(breakdown.tax),
      shipping: round2(breakdown.shipping),
      unsplit: round2(breakdown.unsplit),
    },
    events,
  };
}

// Total price paid per collection, in the base currency, for the collections
// overview (ADR-008). Coin *counts* are a pure SQL aggregate in the repository,
// but a converted money total is business logic — it is rolled up here from the
// same acquisition-day FX conversion the portfolio uses. Collections with no
// priced coins are simply absent from the map (the UI shows "—"); unconvertible
// prices are left out of the total.
export type CollectionCosts = {
  baseCurrency: string | null;
  totalPaid: Record<string, number>; // collectionId -> base-currency cost
};

export async function getCollectionCosts(
  userId: string,
  baseCurrencyPref: string | null,
): Promise<CollectionCosts> {
  const rows = await analyticsRepository.coinsForUser(userId);
  const priced = rows.filter((r) => r.finalPrice != null);
  const baseCurrency = baseCurrencyPref ?? dominantCurrency(priced);
  if (priced.length === 0 || !baseCurrency) return { baseCurrency, totalPaid: {} };

  const convertPrice = await buildPriceConverter(priced, baseCurrency);
  const totalPaid: Record<string, number> = {};
  for (const row of priced) {
    const value = convertPrice(row.finalPrice!, row.priceCurrency, row.auctionDate);
    if (value == null) continue; // unconvertible — leave it out of the rollup
    totalPaid[row.collectionId] = (totalPaid[row.collectionId] ?? 0) + value;
  }
  for (const id of Object.keys(totalPaid)) totalPaid[id] = round2(totalPaid[id]);
  return { baseCurrency, totalPaid };
}
