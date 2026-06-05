import {
  analyticsRepository,
  type PortfolioValuationRow,
} from "@/repositories/analytics.repository";

// Portfolio analytics. All aggregation is business logic and lives here; the
// repository only supplies the user-scoped valuation rows.
//
// Currencies are never summed together: totals are reported per currency, while
// allocation and trend are computed for the *primary* currency (the one with the
// largest total value) so the figures stay meaningful.

export type CurrencyTotal = {
  currency: string;
  total: number;
  coinCount: number;
};

export type AllocationSlice = {
  label: string;
  total: number;
};

export type TrendPoint = {
  date: string; // YYYY-MM-DD
  total: number;
};

export type PortfolioSummary = {
  totalCoins: number;
  valuedCoins: number;
  totalsByCurrency: CurrencyTotal[];
  primaryCurrency: string | null;
  allocationByMetal: AllocationSlice[];
  allocationByCollection: AllocationSlice[];
  trend: TrendPoint[];
};

const toNumber = (amount: string): number => Number.parseFloat(amount);
const round2 = (n: number): number => Math.round(n * 100) / 100;

function allocate(
  rows: PortfolioValuationRow[],
  keyOf: (row: PortfolioValuationRow) => string,
): AllocationSlice[] {
  const totals = new Map<string, number>();
  for (const row of rows) {
    const key = keyOf(row);
    totals.set(key, (totals.get(key) ?? 0) + toNumber(row.amount));
  }
  return [...totals.entries()]
    .map(([label, total]) => ({ label, total: round2(total) }))
    .sort((a, b) => b.total - a.total);
}

// Portfolio value at each date a valuation was recorded: walk the (ascending)
// history, keeping each coin's most recent amount, and snapshot the running
// total at the end of every distinct day.
function buildTrend(rowsAscending: PortfolioValuationRow[]): TrendPoint[] {
  const latestPerCoin = new Map<string, number>();
  const totalByDay = new Map<string, number>();
  for (const row of rowsAscending) {
    latestPerCoin.set(row.coinId, toNumber(row.amount));
    const day = row.valuedAt.toISOString().slice(0, 10);
    let sum = 0;
    for (const amount of latestPerCoin.values()) sum += amount;
    totalByDay.set(day, round2(sum));
  }
  return [...totalByDay.entries()].map(([date, total]) => ({ date, total }));
}

export async function getPortfolioSummary(
  userId: string,
): Promise<PortfolioSummary> {
  const [rows, totalCoins] = await Promise.all([
    analyticsRepository.valuationsWithCoinForUser(userId),
    analyticsRepository.coinCountForUser(userId),
  ]);

  // Latest valuation per coin: rows are ascending, so the last one wins.
  const latestByCoin = new Map<string, PortfolioValuationRow>();
  for (const row of rows) latestByCoin.set(row.coinId, row);
  const latest = [...latestByCoin.values()];

  // Totals per currency, largest first.
  const byCurrency = new Map<string, { total: number; coinCount: number }>();
  for (const row of latest) {
    const acc = byCurrency.get(row.currency) ?? { total: 0, coinCount: 0 };
    acc.total += toNumber(row.amount);
    acc.coinCount += 1;
    byCurrency.set(row.currency, acc);
  }
  const totalsByCurrency: CurrencyTotal[] = [...byCurrency.entries()]
    .map(([currency, acc]) => ({
      currency,
      total: round2(acc.total),
      coinCount: acc.coinCount,
    }))
    .sort((a, b) => b.total - a.total);

  const primaryCurrency = totalsByCurrency[0]?.currency ?? null;

  const latestInPrimary = primaryCurrency
    ? latest.filter((row) => row.currency === primaryCurrency)
    : [];
  const historyInPrimary = primaryCurrency
    ? rows.filter((row) => row.currency === primaryCurrency)
    : [];

  return {
    totalCoins,
    valuedCoins: latest.length,
    totalsByCurrency,
    primaryCurrency,
    allocationByMetal: allocate(latestInPrimary, (r) => r.metal ?? "Unknown"),
    allocationByCollection: allocate(latestInPrimary, (r) => r.collectionName),
    trend: buildTrend(historyInPrimary),
  };
}
