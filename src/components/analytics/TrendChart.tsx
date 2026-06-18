"use client";

import { useMemo, useState } from "react";
import type { AcquisitionEvent } from "@/services/analytics.service";
import { RANGES, money, niceTicks } from "./chart-utils";
import {
  AXIS_W,
  PAD,
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
  title = "Acquisition cost over time",
}: {
  events: AcquisitionEvent[];
  currency: string;
  title?: string;
}) {
  const [rangeIdx, setRangeIdx] = useState(RANGES.length - 1); // default: All

  const data = useMemo(
    () => filterByRange(buildTrend(events), RANGES[rangeIdx].days),
    [events, rangeIdx],
  );

  if (events.length === 0) return null;

  return (
    <section className="card stack">
      <div className="spread">
        <h3 className="chart-title">{title}</h3>
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

      {/* Caption row mirroring the cost-breakdown legend row so the two chart
          cards share identical vertical rhythm and line up at equal height. */}
      <div className="spread legend-top">
        <span className="muted">
          {events.length} acquisition{events.length === 1 ? "" : "s"} · cumulative
        </span>
      </div>

      {data.length === 0 ? (
        <p className="empty">No acquisitions in this range.</p>
      ) : (
        <ChartSvg data={data} currency={currency} title={title} />
      )}
    </section>
  );
}

function ChartSvg({
  data,
  currency,
  title,
}: {
  data: TrendPoint[];
  currency: string;
  title: string;
}) {
  const [scrollRef, viewport] = useMeasuredWidth<HTMLDivElement>();
  const chartH = useChartHeight();
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
  const label = `${title}. Latest ${money(last.total, currency, true)} on ${last.date}.`;

  // Horizontal gridlines at rounded values, mirroring the cost-breakdown chart so
  // the cumulative total is as easy to read off. yMin is 0 for real data; clamp
  // ticks to the visible band so a degenerate (single-point) range stays sane.
  const gridTicks = niceTicks(yMax).filter((t) => t >= yMin && t <= yMax);

  return (
    <div className="chart-plot">
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
          <circle cx={x(last.date)} cy={y(last.total)} r={3.5} className="chart-dot" />
        </svg>
      </div>
    </div>
  );
}
