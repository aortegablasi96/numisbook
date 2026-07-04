"use client";

import { useMemo, useRef, useState } from "react";
import type { AcquisitionEvent } from "@/services/analytics.service";
import { RANGES, money, niceTicks } from "./chart-utils";
import { ExpandChartButton } from "./ExpandChartButton";
import { useT } from "@/components/i18n/LocaleProvider";
import type { MessageKey } from "@/lib/i18n";

// Range presets are index-aligned with RANGES (3M / 6M / 1Y / All).
const RANGE_KEYS: MessageKey[] = [
  "chart.range.3m",
  "chart.range.6m",
  "chart.range.1y",
  "chart.range.all",
];
import {
  AXIS_W,
  PAD,
  clamp,
  plotWidth,
  useChartHeight,
  useMeasuredWidth,
} from "./chart-layout";

// Dependency-free SVG area chart for the cumulative acquisition-cost trend, with
// date-range presets (3M / 6M / 1Y / All). Conversion to the base currency
// happens in the analytics service; this component only accumulates the
// already-converted events into a running total — presentational view logic.
//
// The plot scrolls horizontally (a fixed slot per point) so a long history reads
// as an evolution over time rather than a compressed line; the y-axis (cost)
// labels are frozen to the left so they stay visible while scrolling, and the
// chart shares one viewport-derived height with the cost-breakdown chart.

const PAD_LEFT = 6; // small left inset inside the (frozen-axis-free) plot
const PAD_RIGHT = 14;

const ms = (date: string): number => Date.parse(date);
const round2 = (n: number): number => Math.round(n * 100) / 100;

type TrendPoint = { date: string; total: number };

// Cumulative cost over time: one point per distinct acquisition day, carrying the
// running total of every event up to and including that day.
function buildTrend(events: AcquisitionEvent[]): TrendPoint[] {
  const sorted = [...events].sort((a, b) =>
    a.date < b.date ? -1 : a.date > b.date ? 1 : 0,
  );
  const byDay = new Map<string, number>();
  let running = 0;
  for (const e of sorted) {
    running += e.amount;
    byDay.set(e.date, round2(running));
  }
  return [...byDay.entries()].map(([date, total]) => ({ date, total }));
}

function filterByRange(points: TrendPoint[], days: number): TrendPoint[] {
  if (!Number.isFinite(days) || points.length === 0) return points;
  const cutoff = ms(points[points.length - 1].date) - days * 86_400_000;
  const within = points.filter((p) => ms(p.date) >= cutoff);
  // Always keep at least the last point so the chart never goes empty.
  return within.length > 0 ? within : points.slice(-1);
}

export function TrendChart({
  events,
  currency,
  title,
  inModal = false,
}: {
  events: AcquisitionEvent[];
  currency: string;
  title?: string;
  inModal?: boolean;
}) {
  const t = useT();
  const resolvedTitle = title ?? t("chart.trend.title");
  const [rangeIdx, setRangeIdx] = useState(RANGES.length - 1); // default: All

  const data = useMemo(
    () => filterByRange(buildTrend(events), RANGES[rangeIdx].days),
    [events, rangeIdx],
  );

  if (events.length === 0) return null;

  return (
    <section className="card stack">
      <div className="spread">
        <h3 className="chart-title">{resolvedTitle}</h3>
        <div className="row" style={{ gap: "var(--space-2)" }}>
          <div className="row" role="group" aria-label={t("chart.dateRangeAria")}>
            {RANGES.map((r, i) => (
              <button
                key={r.label}
                type="button"
                className="btn-sm range-btn"
                aria-pressed={i === rangeIdx}
                onClick={() => setRangeIdx(i)}
              >
                {t(RANGE_KEYS[i])}
              </button>
            ))}
          </div>
          {!inModal && (
            <ExpandChartButton label={resolvedTitle}>
              <TrendChart events={events} currency={currency} title={resolvedTitle} inModal />
            </ExpandChartButton>
          )}
        </div>
      </div>

      {/* Caption row mirroring the cost-breakdown legend row so the two chart
          cards share identical vertical rhythm and line up at equal height. */}
      <div className="spread legend-top">
        <span className="muted">
          {t(events.length === 1 ? "chart.trend.acqOne" : "chart.trend.acqOther", {
            count: events.length,
          })}
        </span>
      </div>

      {data.length === 0 ? (
        <p className="empty">{t("chart.noneInRange")}</p>
      ) : (
        <ChartSvg data={data} currency={currency} title={resolvedTitle} inModal={inModal} />
      )}
    </section>
  );
}

function ChartSvg({
  data,
  currency,
  title,
  inModal,
}: {
  data: TrendPoint[];
  currency: string;
  title: string;
  inModal: boolean;
}) {
  const t = useT();
  const [scrollRef, viewport] = useMeasuredWidth<HTMLDivElement>();
  const chartH = useChartHeight(inModal);
  const plotRef = useRef<HTMLDivElement>(null);
  // Index of the point under the cursor (hover scrubbing) + the tooltip anchor.
  const [hover, setHover] = useState<{ idx: number; left: number; top: number } | null>(null);
  const plotW = plotWidth(data.length, viewport);
  const innerW = plotW - PAD_LEFT - PAD_RIGHT;
  const innerH = chartH - PAD.top - PAD.bottom;
  const baseline = PAD.top + innerH;

  const xMin = ms(data[0].date);
  const xMax = ms(data[data.length - 1].date);
  const totals = data.map((p) => p.total);
  let yMin = Math.min(...totals, 0);
  let yMax = Math.max(...totals);
  if (yMin === yMax) {
    yMin -= 1;
    yMax += 1;
  }

  const x = (date: string): number =>
    xMax === xMin
      ? PAD_LEFT + innerW / 2
      : PAD_LEFT + ((ms(date) - xMin) / (xMax - xMin)) * innerW;
  const y = (value: number): number =>
    PAD.top + ((yMax - value) / (yMax - yMin)) * innerH;

  const line = data
    .map((p, i) => `${i ? "L" : "M"}${x(p.date).toFixed(1)} ${y(p.total).toFixed(1)}`)
    .join(" ");
  const area =
    data.length > 1
      ? `M${x(data[0].date).toFixed(1)} ${baseline} ` +
        data.map((p) => `L${x(p.date).toFixed(1)} ${y(p.total).toFixed(1)}`).join(" ") +
        ` L${x(data[data.length - 1].date).toFixed(1)} ${baseline} Z`
      : "";

  const last = data[data.length - 1];
  const label = t("chart.trend.ariaLabel", {
    title,
    amount: money(last.total, currency, true),
    date: last.date,
  });

  // Horizontal gridlines at rounded values, mirroring the cost-breakdown chart so
  // the cumulative total is as easy to read off. yMin is 0 for real data; clamp
  // ticks to the visible band so a degenerate (single-point) range stays sane.
  const gridTicks = niceTicks(yMax).filter((t) => t >= yMin && t <= yMax);

  // Hover scrubbing: map the cursor's x within the SVG to the nearest data point
  // and float a tooltip with that day's cumulative total (positioned over the
  // surrounding .chart-plot, like the cost-breakdown chart).
  function onMove(ev: React.MouseEvent<SVGSVGElement>): void {
    const svgRect = ev.currentTarget.getBoundingClientRect();
    const localX = ev.clientX - svgRect.left;
    let idx = 0;
    let best = Infinity;
    for (let i = 0; i < data.length; i++) {
      const d = Math.abs(x(data[i].date) - localX);
      if (d < best) {
        best = d;
        idx = i;
      }
    }
    const plotRect = plotRef.current?.getBoundingClientRect();
    if (!plotRect) return;
    setHover({
      idx,
      left: clamp(ev.clientX - plotRect.left, 90, plotRect.width - 90),
      top: Math.max(ev.clientY - plotRect.top, 90),
    });
  }

  const hoverPoint = hover ? data[hover.idx] : null;

  return (
    <div className="chart-plot" ref={plotRef}>
      {/* Frozen y-axis: cost labels stay visible while the plot scrolls. */}
      <svg className="chart-yaxis" width={AXIS_W} height={chartH} aria-hidden="true">
        {gridTicks.map((t) => (
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
          onMouseMove={onMove}
          onMouseLeave={() => setHover(null)}
        >
          {gridTicks.map((t) => (
            <line
              key={t}
              x1={0}
              x2={plotW}
              y1={y(t)}
              y2={y(t)}
              className="chart-grid"
            />
          ))}
          <text x={4} y={chartH - 8} textAnchor="start" className="chart-axis">
            {data[0].date}
          </text>
          {data.length > 1 && (
            <text x={plotW - 4} y={chartH - 8} textAnchor="end" className="chart-axis">
              {last.date}
            </text>
          )}
          {area && <path d={area} className="chart-area" />}
          <path d={line} className="chart-line" fill="none" />
          {/* Hover guide + marker for the scrubbed point. */}
          {hoverPoint && (
            <>
              <line
                x1={x(hoverPoint.date)}
                x2={x(hoverPoint.date)}
                y1={PAD.top}
                y2={baseline}
                className="chart-guide"
              />
              <circle
                cx={x(hoverPoint.date)}
                cy={y(hoverPoint.total)}
                r={4}
                className="chart-dot"
              />
            </>
          )}
          <circle cx={x(last.date)} cy={y(last.total)} r={3.5} className="chart-dot" />
        </svg>
      </div>

      {hover && hoverPoint && (
        <div
          className="chart-tooltip"
          style={{ left: hover.left, top: hover.top }}
          role="presentation"
        >
          <p className="chart-tooltip-title">{money(hoverPoint.total, currency)}</p>
          <p className="chart-tooltip-sub mono-label">{t("chart.trend.tooltipSub", { date: hoverPoint.date })}</p>
        </div>
      )}
    </div>
  );
}
