import type { AcquisitionEvent } from "@/services/analytics.service";

// Shared, dependency-free helpers for the two portfolio SVG charts (TrendChart,
// CostBreakdownChart): currency formatting, rounded y-axis ticks for gridlines,
// and the date-range presets both charts filter by. Pure — unit-tested.

export const RANGES = [
  { label: "3M", days: 90 },
  { label: "6M", days: 182 },
  { label: "1Y", days: 365 },
  { label: "All", days: Infinity },
] as const;

export function money(amount: number, currency: string, compact = false): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      ...(compact ? { maximumFractionDigits: 0 } : {}),
    }).format(amount);
  } catch {
    return `${compact ? Math.round(amount) : amount.toFixed(2)} ${currency}`;
  }
}

// Round, human-friendly y-axis ticks from 0 up to at least `max`, so gridlines
// land on values collectors can read off (10/20/50/100…). The last tick is the
// axis maximum the chart scales against.
export function niceTicks(max: number, count = 4): number[] {
  if (!(max > 0)) return [0];
  const rawStep = max / count;
  const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const norm = rawStep / mag;
  const niceNorm =
    norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10;
  const step = niceNorm * mag;
  const ticks: number[] = [];
  for (let i = 0; i * step < max - step * 1e-9; i++) ticks.push(i * step);
  ticks.push(Math.ceil(max / step) * step); // top tick covers the tallest value
  return ticks;
}

// Keep only acquisitions within `days` of the most recent one (Infinity = all).
// Never returns empty as long as `events` is non-empty, so a chart never blanks.
export function filterEventsByRange(
  events: AcquisitionEvent[],
  days: number,
): AcquisitionEvent[] {
  if (!Number.isFinite(days) || events.length === 0) return events;
  const latest = events.reduce((m, e) => Math.max(m, Date.parse(e.date)), -Infinity);
  const cutoff = latest - days * 86_400_000;
  const within = events.filter((e) => Date.parse(e.date) >= cutoff);
  return within.length > 0 ? within : events;
}
