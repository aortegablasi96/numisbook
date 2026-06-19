// Presentation helpers for coin attributes, shared by the list and detail views.

/**
 * Render a single year on the historical scale: negative years carry a `BC`
 * suffix, positive years an `AD` one (so a range spanning the divide reads e.g.
 * "5 BC – 5 AD"). Year 0 (no historical year zero) is treated as AD.
 */
export function formatYear(year: number): string {
  return year < 0 ? `${Math.abs(year)} BC` : `${year} AD`;
}

/**
 * Render a minting-year range. Equal bounds collapse to a single year; a single
 * known bound renders alone; no bounds returns null.
 */
export function formatYearRange(
  from: number | null | undefined,
  to: number | null | undefined,
): string | null {
  if (from != null && to != null) {
    return from === to ? formatYear(from) : `${formatYear(from)} – ${formatYear(to)}`;
  }
  const single = from ?? to;
  return single != null ? formatYear(single) : null;
}

// Minimal coin shape the presentation helpers below read from. Numeric columns
// (weight/diameter) arrive as fixed-scale strings.
type CoinTitleFields = {
  category?: string | null;
  issuingAuthority?: string | null;
  yearFrom?: number | null;
  yearTo?: number | null;
  mint?: string | null;
};

type CoinCharacteristicsFields = {
  denomination?: string | null;
  metal?: string | null;
  diameter?: string | null;
  weight?: string | null;
};

/**
 * The coin's display title, derived from its attributes (coins have no name):
 * "{Category}. {Issuing Authority} ({year range}), {Mint}". Missing pieces and
 * their separators are dropped; an entirely empty coin falls back to a label.
 */
export function formatCoinTitle(coin: CoinTitleFields): string {
  const head = [coin.category, coin.issuingAuthority]
    .map((s) => s?.trim())
    .filter(Boolean)
    .join(". ");
  const years = formatYearRange(coin.yearFrom, coin.yearTo);
  const mint = coin.mint?.trim();

  let title = head;
  if (years) title += title ? ` (${years})` : years;
  if (mint) title += title ? `, ${mint}` : mint;
  return title || "Untitled coin";
}

/**
 * The "characteristics" line: "{Denomination} ({Metal}, {Diameter} mm,
 * {Weight} g)". Missing parts (and empty parentheses) are omitted; returns null
 * when nothing is known.
 */
export function formatCoinCharacteristics(
  coin: CoinCharacteristicsFields,
): string | null {
  const specs = [
    coin.metal?.trim(),
    coin.diameter ? `${coin.diameter} mm` : null,
    coin.weight ? `${coin.weight} g` : null,
  ].filter(Boolean);
  const denomination = coin.denomination?.trim();

  if (denomination && specs.length) return `${denomination} (${specs.join(", ")})`;
  if (denomination) return denomination;
  if (specs.length) return specs.join(", ");
  return null;
}
