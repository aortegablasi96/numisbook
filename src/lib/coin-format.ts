// Presentation helpers for coin attributes, shared by the list and detail views.

/** Render a single year on the historical scale (negative = BC). */
export function formatYear(year: number): string {
  return year < 0 ? `${Math.abs(year)} BC` : String(year);
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
