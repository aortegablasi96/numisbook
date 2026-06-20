"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { AcquisitionEvent } from "@/services/analytics.service";
import { RANGES, money, niceTicks, filterEventsByRange } from "./chart-utils";
import { ExpandChartButton } from "./ExpandChartButton";
import {
  AXIS_W,
  PAD,
  clamp,
  useChartHeight,
  useMeasuredWidth,
} from "./chart-layout";

// Per-coin cost breakdown: one vertical column per coin, ordered left→right by
// acquisition (hammer) date — oldest first. Each column is stacked into its
// price-paid components (hammer / premium / shipping), or a single "Final only"
// segment for coins entered with just a final price. Column height is the coin's
// total cost. A coin thumbnail crowns each column, the coin's total price sits
// above it, and each segment is labelled with its share of that coin's cost.
//
// The plot scrolls horizontally (a fixed column width per coin) so a long
// acquisition history reads as an evolution over time rather than a squeezed
// thumbnail strip; the y-axis (cost) labels are frozen to the left so they stay
// visible while scrolling. Hovering a column raises a floating tooltip with the
// per-coin breakdown (Figma). Dependency-free SVG; presentational beyond the
// range filter — amounts arrive pre-converted to the base currency from the
// analytics service.

// Stack order (bottom → top) and tooltip/legend order. Tax sits before shipping
// throughout the app (price-paid partition order, ADR-009).
const SEGMENTS = [
  { key: "hammer", label: "Hammer", cls: "bar-hammer", swatch: "seg-hammer" },
  { key: "premium", label: "Premium", cls: "bar-premium", swatch: "seg-premium" },
  { key: "tax", label: "Tax", cls: "bar-tax", swatch: "seg-tax" },
  { key: "shipping", label: "Shipping", cls: "bar-shipping", swatch: "seg-shipping" },
  { key: "unsplit", label: "Final only", cls: "bar-unsplit", swatch: "seg-unsplit" },
] as const;

// The four price-paid partition components (everything except the final-only
// fallback). The tooltip always lists all four — even those that are 0 — for a
// partitioned coin, so the breakdown reads consistently.
const COST_KEYS = ["hammer", "premium", "tax", "shipping"] as const;

const AVATAR = 104; // thumbnail diameter, in px
// Coins to fit across the (inline) chart's visible width. Each coin gets a fixed
// pixel slot (viewport / VISIBLE_COINS); the rest scroll horizontally. The
// expanded chart reuses that same per-coin width, so its wider viewport fits
// proportionally more coins (≈ VISIBLE_COINS × modalWidth / inlineWidth).
const VISIBLE_COINS = 5;

const stackTotal = (e: AcquisitionEvent): number =>
  e.hammer + e.premium + e.shipping + e.tax + e.unsplit;

type Tip = { left: number; top: number; e: AcquisitionEvent; total: number };

export function CostBreakdownChart({
  events,
  currency,
  inModal = false,
  slotUnit,
}: {
  events: AcquisitionEvent[];
  currency: string;
  inModal?: boolean;
  // Per-coin pixel width to reuse in the expanded copy so coins stay the same
  // size as the inline chart (and the wider dialog therefore shows more of them).
  slotUnit?: number;
}) {
  const [rangeIdx, setRangeIdx] = useState(RANGES.length - 1); // default: All
  const [tip, setTip] = useState<Tip | null>(null);
  const plotRef = useRef<HTMLDivElement>(null);
  // Unique per chart instance so the inline and expanded copies don't share
  // clipPath ids (duplicate ids would cross-resolve and break the round avatars).
  const clipUid = useId().replace(/:/g, "");
  const [scrollRef, viewport] = useMeasuredWidth<HTMLDivElement>();
  const chartH = useChartHeight(inModal);

  const ordered = useMemo(
    () =>
      [...events].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)),
    [events],
  );
  // All dated, convertible coins in range (ascending, oldest→newest). The plot
  // scrolls horizontally; only ~VISIBLE_COINS fit the view at once and it is
  // scrolled to the newest (right) end by default.
  const shown = useMemo(
    () => filterEventsByRange(ordered, RANGES[rangeIdx].days),
    [ordered, rangeIdx],
  );

  // Each column's height is its components' sum (so the stack and the axis agree).
  const maxTotal = shown.reduce((m, e) => Math.max(m, stackTotal(e)), 0);

  // Component totals across the shown coins, for the legend.
  const totals = SEGMENTS.map((s) => ({
    ...s,
    value: shown.reduce((sum, e) => sum + e[s.key], 0),
  })).filter((t) => t.value > 0);
  const grandTotal = totals.reduce((sum, t) => sum + t.value, 0);

  // Per-coin width: in the inline chart, size it so VISIBLE_COINS fit the
  // measured width (but never narrower than that when there are fewer coins, so
  // a short history fills the plot). The expanded copy is handed this same unit
  // (slotUnit) so coins keep their size and the wider dialog shows more of them.
  const count = shown.length;
  const baseUnit = viewport / VISIBLE_COINS;
  const unit = slotUnit ?? baseUnit;
  const slot = count > 0 ? Math.max(unit, viewport / count) : viewport;
  const plotW = count > 0 ? count * slot : viewport;
  const scrolls = plotW > viewport + 1; // more coins than fit the visible width
  const barW = Math.max(Math.min(slot * 0.82, 96), 1);

  // Default the horizontal scroll to the newest (right) end so the most recent
  // acquisitions are in view first; resets when the data or layout width changes.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [scrollRef, plotW, count]);

  if (events.length === 0) return null;

  // Fixed top band for the thumbnail crown + total label; the y-axis and plot
  // share these so their gridlines line up across the frozen-axis boundary.
  const padTop = AVATAR + 22;
  const avatarCy = AVATAR / 2 + 4;
  const innerH = chartH - padTop - PAD.bottom;
  const baseline = padTop + innerH;

  const ticks = niceTicks(maxTotal);
  const axisMax = ticks[ticks.length - 1];
  const y = (value: number): number => baseline - (value / axisMax) * innerH;

  const label =
    `Cost paid per coin in ${currency}, newest first; scroll horizontally for ` +
    `earlier acquisitions. Each column split into its share of hammer, premium, ` +
    `shipping and tax. ${count} coins, ${money(grandTotal, currency)} total.`;

  function showTip(
    ev: React.MouseEvent,
    e: AcquisitionEvent,
    total: number,
  ): void {
    const rect = plotRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTip({
      left: clamp(ev.clientX - rect.left, 120, rect.width - 120),
      top: Math.max(ev.clientY - rect.top, 120),
      e,
      total,
    });
  }

  return (
    <section className="card stack">
      <div className="spread">
        <h3 className="chart-title">Cost breakdown</h3>
        <div className="row" style={{ gap: "var(--space-2)" }}>
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
          {!inModal && (
            <ExpandChartButton label="Cost breakdown">
              <CostBreakdownChart
                events={events}
                currency={currency}
                inModal
                slotUnit={unit}
              />
            </ExpandChartButton>
          )}
        </div>
      </div>

      <div className="spread legend-top">
        <span className="muted">
          {count} coin{count === 1 ? "" : "s"}
          {scrolls ? " · newest first, scroll for more" : ""}
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
        <div className="chart-plot" ref={plotRef}>
          {/* Frozen y-axis: cost labels stay visible while the plot scrolls. */}
          <svg
            className="chart-yaxis"
            width={AXIS_W}
            height={chartH}
            aria-hidden="true"
          >
            {ticks.map((t) => (
              <text
                key={t}
                x={AXIS_W - 6}
                y={y(t) + 3}
                textAnchor="end"
                className="chart-axis"
              >
                {money(t, currency, true)}
              </text>
            ))}
          </svg>

          <div className="chart-scroll" ref={scrollRef}>
            <svg
              width={plotW}
              height={chartH}
              role="img"
              aria-label={label}
              style={{ display: "block" }}
            >
              <defs>
                {shown.map((e, i) =>
                  e.imageId ? (
                    <clipPath key={e.id} id={`cbc-clip-${clipUid}-${e.id}`}>
                      <circle cx={slot * (i + 0.5)} cy={avatarCy} r={AVATAR / 2} />
                    </clipPath>
                  ) : null,
                )}
              </defs>

              {/* Gridlines spanning the full plot width (always visible). */}
              {ticks.map((t) => (
                <line
                  key={t}
                  x1={0}
                  x2={plotW}
                  y1={y(t)}
                  y2={y(t)}
                  className="chart-grid"
                />
              ))}

              {/* Date axis (first / last acquisition). */}
              <text x={4} y={chartH - 8} textAnchor="start" className="chart-axis">
                {shown[0].date}
              </text>
              {shown.length > 1 && (
                <text
                  x={plotW - 4}
                  y={chartH - 8}
                  textAnchor="end"
                  className="chart-axis"
                >
                  {shown[shown.length - 1].date}
                </text>
              )}

              {shown.map((e, i) => {
                const cx = slot * (i + 0.5);
                const total = stackTotal(e);
                const barTop = y(total);
                let top = baseline; // stack upward from the baseline
                return (
                  <g
                    key={e.id}
                    className="bar-col"
                    onMouseEnter={(ev) => showTip(ev, e, total)}
                    onMouseMove={(ev) => showTip(ev, e, total)}
                    onMouseLeave={() => setTip(null)}
                  >
                    {/* Full-slot hit area so hovering anywhere over the column
                        (not just the bar) raises the tooltip. */}
                    <rect
                      x={cx - slot / 2}
                      y={padTop}
                      width={slot}
                      height={innerH}
                      fill="transparent"
                    />
                    {/* Stacked segments. Per-segment shares now live in the
                        hover tooltip, so the bars stay clean (ADR-009). */}
                    {SEGMENTS.map((s) => {
                      const value = e[s.key];
                      if (value <= 0) return null;
                      const segH = (value / axisMax) * innerH;
                      top -= segH;
                      return (
                        <rect
                          key={s.key}
                          x={cx - barW / 2}
                          y={top}
                          width={barW}
                          height={segH}
                          className={`bar-seg ${s.cls}`}
                        />
                      );
                    })}

                    <text x={cx} y={barTop - 5} textAnchor="middle" className="bar-total">
                      {money(total, currency, true)}
                    </text>

                    {e.imageId && (
                      <>
                        <image
                          href={`/api/coins/${e.id}/images/${e.imageId}?w=256`}
                          x={cx - AVATAR / 2}
                          y={avatarCy - AVATAR / 2}
                          width={AVATAR}
                          height={AVATAR}
                          preserveAspectRatio="xMidYMid slice"
                          clipPath={`url(#cbc-clip-${clipUid}-${e.id})`}
                        />
                        <circle cx={cx} cy={avatarCy} r={AVATAR / 2} className="bar-avatar-ring" />
                      </>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>

          {tip && (
            <div
              className="chart-tooltip"
              style={{ left: tip.left, top: tip.top }}
              role="presentation"
            >
              <p className="chart-tooltip-title">{tip.e.label}</p>
              <p className="chart-tooltip-sub mono-label">
                {tip.e.collection} · {tip.e.date}
              </p>
              <ul className="chart-tooltip-rows">
                {(tip.e.unsplit > 0
                  ? SEGMENTS.filter((s) => s.key === "unsplit")
                  : SEGMENTS.filter((s) => (COST_KEYS as readonly string[]).includes(s.key))
                ).map((s) => (
                  <li key={s.key}>
                    <span className={`swatch ${s.swatch}`} aria-hidden />
                    <span>{s.label}</span>
                    <span className="chart-tooltip-val">
                      {money(tip.e[s.key], currency)}
                    </span>
                    <span className="muted">
                      {tip.total > 0
                        ? Math.round((tip.e[s.key] / tip.total) * 100)
                        : 0}
                      %
                    </span>
                  </li>
                ))}
              </ul>
              <div className="chart-tooltip-total">
                <span>Total</span>
                <span>{money(tip.total, currency)}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
