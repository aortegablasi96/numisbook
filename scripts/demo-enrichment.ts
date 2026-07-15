// Demo-only enrichment for the seeded coins (ADR-016).
//
// The source demo account (see export-demo-fixtures.ts) carries no valuations or
// invoices, but the shop-window demo should still exercise the valuation trend
// chart and the invoice viewer. Rather than invent that data in the *fixtures*
// (which are a faithful export), we derive it deterministically at seed time from
// each coin's own attributes:
//
//   * a valuation history trending up from the total price paid, and
//   * an auction invoice PDF built from the coin's acquisition metadata.
//
// Deterministic (a per-coin hash, not RNG) so re-seeding is reproducible, and
// every valuation date is clamped to "now" so nothing lands in the future.

import { formatCoinTitle } from "@/lib/coin-format";
import { buildInvoicePdf } from "./demo-invoice-pdf";
import type { DemoValuation } from "./demo-fixtures";

// The structural subset of a coin the helpers read (a real repository `Coin`
// satisfies it). Numeric/date columns arrive as strings.
export type EnrichCoin = {
  finalPrice: string | null;
  priceCurrency: string | null;
  auctionHouse: string | null;
  auctionLot: string | null;
  auctionDate: string | null; // "YYYY-MM-DD"
  category: string | null;
  issuingAuthority: string | null;
  yearFrom: number | null;
  yearTo: number | null;
  mint: string | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const parseDay = (s: string): Date => new Date(`${s}T00:00:00Z`);
const toDay = (d: Date): string => d.toISOString().slice(0, 10);
const monthsBetween = (a: Date, b: Date): number =>
  (b.getTime() - a.getTime()) / (DAY_MS * 30.44);

// A stable pseudo-random value in [0, 1) from a string (FNV-1a). Gives each coin
// its own — but fixed — growth curve, so the demo looks varied yet reproduces.
function seed01(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
}

// Round to a "catalogue-looking" figure: nearest 10 above €1k, else nearest whole.
const roundNice = (n: number): number => (n >= 1000 ? Math.round(n / 10) * 10 : Math.round(n));

const money = (currency: string, amount: number): string =>
  `${currency} ${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function slug(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

const VALUATION_SOURCES = [
  "Dealer appraisal",
  "Auction comparable",
  "Catalogue estimate",
  "Private treaty estimate",
];

/**
 * A valuation history for a coin, trending up from the total price paid to a
 * current market estimate. Empty when the coin has no recorded total. Points run
 * from shortly after acquisition to `now` (never the future); longer holdings get
 * more points so the trend chart is a curve rather than a line.
 */
export function syntheticValuations(
  coin: EnrichCoin,
  now: Date = new Date(),
): DemoValuation[] {
  if (coin.finalPrice == null) return [];
  const basis = Number.parseFloat(coin.finalPrice);
  if (!Number.isFinite(basis) || basis <= 0) return [];

  const currency = coin.priceCurrency ?? "EUR";
  const j = seed01(`${formatCoinTitle(coin)}|${coin.finalPrice}`);
  const start = coin.auctionDate ? parseDay(coin.auctionDate) : new Date(now.getTime() - 730 * DAY_MS);

  // A very recent purchase gets a single current estimate just above cost.
  const months = monthsBetween(start, now);
  if (months < 3) {
    return [
      {
        amount: roundNice(basis * (1.05 + j * 0.05)),
        currency,
        valuedAt: toDay(now),
        source: VALUATION_SOURCES[0],
      },
    ];
  }

  const n = Math.min(4, Math.max(2, Math.floor(months / 9) + 1));
  const startMult = 1.03 + j * 0.07; // just above cost
  const topMult = 1.3 + j * 0.35; // +30% … +65% by today

  const out: DemoValuation[] = [];
  let prev = 0;
  for (let i = 1; i <= n; i++) {
    const frac = i / n;
    const date = new Date(start.getTime() + (now.getTime() - start.getTime()) * frac);
    const mult = startMult + (topMult - startMult) * frac;
    let amount = roundNice(basis * mult);
    if (amount <= prev) amount = prev + roundNice(basis * 0.02); // keep it strictly rising
    prev = amount;
    out.push({
      amount,
      currency,
      valuedAt: toDay(date),
      source: VALUATION_SOURCES[(i - 1) % VALUATION_SOURCES.length],
    });
  }
  return out;
}

/**
 * A generated auction invoice PDF for a coin, from its acquisition metadata.
 * Returns null when there is nothing to bill (no auction house or no total).
 */
export function syntheticInvoice(
  coin: EnrichCoin,
  opts: { buyer: string; now?: Date },
): { pdf: Buffer; filename: string } | null {
  if (!coin.auctionHouse || coin.finalPrice == null) return null;
  const total = Number.parseFloat(coin.finalPrice);
  if (!Number.isFinite(total) || total <= 0) return null;

  const now = opts.now ?? new Date();
  const date = coin.auctionDate ?? toDay(now);
  const lot = coin.auctionLot?.trim() || "—";
  const currency = coin.priceCurrency ?? "EUR";

  const pdf = buildInvoicePdf({
    house: coin.auctionHouse,
    lot,
    date,
    total: money(currency, total),
    buyer: opts.buyer,
    description: formatCoinTitle(coin),
  });

  const lotPart = lot === "—" ? "" : `-lot-${slug(lot)}`;
  const filename = `${slug(coin.auctionHouse)}-${date}${lotPart}.pdf`;
  return { pdf, filename };
}
