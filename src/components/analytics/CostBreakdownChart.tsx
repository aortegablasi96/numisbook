"use client";

import { useMemo, useState } from "react";
import type { AcquisitionEvent } from "@/services/analytics.service";
import { RANGES, money, niceTicks, filterEventsByRange } from "./chart-utils";

// Per-coin cost breakdown: one vertical column per coin, ordered left→right by
// acquisition (hammer) date — oldest first. Each column is stacked into its
// price-paid components (hammer / premium / shipping), or a single "Final only"
// segment for coins entered with just a final price. Column height is the coin's
// total cost. Horizontal gridlines at rounded values make columns comparable;
// each segment is labelled with its share of that coin's cost (e.g. 80% hammer /
// 15% premium / 5% shipping), the coin's total price sits above the column, and —
// room permitting — a coin thumbnail crowns it. A date-range preset (shared with
// the trend chart) narrows the coins shown, and the segment legend sits top-right.
// Dependency-free SVG; presentational beyond the range filter — amounts arrive
// pre-converted to the base currency from the analytics service, and only dated,
// convertible coins are present (they are what the date axis can place).

const SEGMENTS = [
  { key: "hammer", label: "Hammer", cls: "bar-hammer", swatch: "seg-hammer" },
  { key: "premium", label: "Premium", cls: "bar-premium", swatch: "seg-premium" },
  { key: "shipping", label: "Shipping", cls: "bar-shipping", swatch: "seg-shipping" },
  { key: "unsplit", label: "Final only", cls: "bar-unsplit", swatch: "seg-unsplit" },
] as const;

// Same aspect ratio as the trend chart so the two render at equal height when
// laid out side by side at equal column widths.
const W = 480;
const H = 300;
const PAD = { right: 12, bottom: 26, left: 58 };
const INNER_W = W - PAD.left - PAD.right;
const AVATAR = 44; // thumbnail diameter, in viewBox units

const stackTotal = (e: AcquisitionEvent): number =>
  e.hammer + e.premium + e.shipping + e.unsplit;

export function CostBreakdownChart({
  events,
  currency,
}: {
  events: AcquisitionEvent[];
  currency: string;
}) {
  const [rangeIdx, setRangeIdx] = useState(RANGES.length - 1); // default: All

  const ordered = useMemo(
    () =>
      [...events].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)),
    [events],
  );
  const shown = useMemo(
    () => filterEventsByRange(ordered, RANGES[rangeIdx].days),
    [ordered, rangeIdx],
  );

  if (events.length === 0) return null;

  // Each column's height is its components' sum (so the stack and the axis agree).
  const maxTotal = shown.reduce((m, e) => Math.max(m, stackTotal(e)), 0);

  // Component totals across the shown coins, for the legend.
  const totals = SEGMENTS.map((s) => ({
    ...s,
    value: shown.reduce((sum, e) => sum + e[s.key], 0),
  })).filter((t) => t.value > 0);
  const grandTotal = totals.reduce((sum, t) => sum + t.value, 0);

  const slot = shown.length > 0 ? INNER_W / shown.length : INNER_W;
  const barW = Math.max(Math.min(slot * 0.6, 44), 1);

  // Adaptive density: only draw thumbnails / labels when columns are wide enough
  // that they won't collide. The top padding follows suit so the plot reclaims
  // the space when thumbnails are hidden.
  const showAvatars = slot >= AVATAR + 8;
  const showLabels = barW >= 22; // room for a price / "80%" label
  const avatarCy = AVATAR / 2 + 4;
  const padTop = showAvatars ? AVATAR + 18 : showLabels ? 16 : 8;
  const innerH = H - padTop - PAD.bottom;
  const baseline = padTop + innerH;

  const ticks = niceTicks(maxTotal);
  const axisMax = ticks[ticks.length - 1];
  const y = (value: number): number => baseline - (value / axisMax) * innerH;

  const label =
    `Cost paid per coin in ${currency}, oldest acquisition first, ` +
    `each column split into its share of hammer, premium and shipping. ` +
    `${shown.length} coins, ${money(grandTotal, currency)} total.`;

  // Tooltip: total plus the per-coin allocation the labels summarise.
  const tooltip = (e: AcquisitionEvent, total: number): string => {
    const parts = SEGMENTS.filter((s) => e[s.key] > 0).map(
      (s) =>
        `${s.label} ${Math.round((e[s.key] / total) * 100)}% (${money(e[s.key], currency)})`,
    );
    return `${e.label} — ${e.collection} — ${e.date}\n${money(total, currency)} · ${parts.join(" · ")}`;
  };

  return (
    <section className="card stack">
      <div className="spread">
        <h3 style={{ margin: 0 }}>Cost breakdown</h3>
        <div className="row" role="group" aria-label="Date range">
          {RANGES.map((r, i) => (
            <button
              key={r.label}
              type="button"
              className="btn-sm range-btn"
              aria-pressed={i === rangeIdx}
              onClick={() => setRangeIdx(i)}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="spread legend-top">
        <span className="muted">
          {shown.length} coin{shown.length === 1 ? "" : "s"} · oldest first
        </span>
        <ul className="legend-inline">
          {totals.map((t) => (
            <li key={t.key}>
              <span className={`swatch ${t.swatch}`} aria-hidden />
              <span>{t.label}</span>
              <span className="muted">{Math.round((t.value / grandTotal) * 100)}%</span>
            </li>
          ))}
        </ul>
      </div>

      {maxTotal <= 0 ? (
        <p className="empty">No acquisitions in this range.</p>
      ) : (
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          role="img"
          aria-label={label}
          style={{ height: "auto", display: "block" }}
        >
          {showAvatars && (
            <defs>
              {shown.map((e, i) =>
                e.imageId ? (
                  <clipPath key={e.id} id={`cbc-clip-${e.id}`}>
                    <circle cx={PAD.left + slot * (i + 0.5)} cy={avatarCy} r={AVATAR / 2} />
                  </clipPath>
                ) : null,
              )}
            </defs>
          )}

          {/* Gridlines + y-axis value labels */}
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={PAD.left}
                x2={W - PAD.right}
                y1={y(t)}
                y2={y(t)}
                className="chart-grid"
              />
              <text x={PAD.left - 8} y={y(t) + 3} textAnchor="end" className="chart-axis">
                {money(t, currency, true)}
              </text>
            </g>
          ))}

          {/* Date axis (first / last acquisition) */}
          <text x={PAD.left} y={H - 8} textAnchor="start" className="chart-axis">
            {shown[0].date}
          </text>
          {shown.length > 1 && (
            <text x={W - PAD.right} y={H - 8} textAnchor="end" className="chart-axis">
              {shown[shown.length - 1].date}
            </text>
          )}

          {shown.map((e, i) => {
            const cx = PAD.left + slot * (i + 0.5);
            const total = stackTotal(e);
            const barTop = y(total);
            let top = baseline; // stack upward from the baseline
            return (
              <g key={e.id}>
                <title>{tooltip(e, total)}</title>
                {SEGMENTS.map((s) => {
                  const value = e[s.key];
                  if (value <= 0) return null;
                  const segH = (value / axisMax) * innerH;
                  top -= segH;
                  const segMid = top + segH / 2;
                  // Label a segment with its share of the coin's cost when it is
                  // tall enough to hold the text. "Final only" is trivially 100%,
                  // so it is left unlabelled (the tooltip still spells it out).
                  const labelSeg = showLabels && s.key !== "unsplit" && segH >= 14;
                  return (
                    <g key={s.key}>
                      <rect
                        x={cx - barW / 2}
                        y={top}
                        width={barW}
                        height={segH}
                        className={`bar-seg ${s.cls}`}
                      />
                      {labelSeg && (
                        <text
                          x={cx}
                          y={segMid}
                          textAnchor="middle"
                          dominantBaseline="central"
                          className="bar-seg-label"
                        >
                          {Math.round((value / total) * 100)}%
                        </text>
                      )}
                    </g>
                  );
                })}

                {showLabels && (
                  <text x={cx} y={barTop - 5} textAnchor="middle" className="bar-total">
                    {money(total, currency, true)}
                  </text>
                )}

                {showAvatars && e.imageId && (
                  <>
                    <image
                      href={`/api/coins/${e.id}/images/${e.imageId}?w=160`}
                      x={cx - AVATAR / 2}
                      y={avatarCy - AVATAR / 2}
                      width={AVATAR}
                      height={AVATAR}
                      preserveAspectRatio="xMidYMid slice"
                      clipPath={`url(#cbc-clip-${e.id})`}
                    />
                    <circle cx={cx} cy={avatarCy} r={AVATAR / 2} className="bar-avatar-ring" />
                  </>
                )}
              </g>
            );
          })}
        </svg>
      )}
    </section>
  );
}
