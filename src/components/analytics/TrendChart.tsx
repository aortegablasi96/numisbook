"use client";

import { useMemo, useState } from "react";
import type { AcquisitionEvent } from "@/services/analytics.service";
import { RANGES, money, niceTicks } from "./chart-utils";

// Dependency-free SVG area chart for the cumulative acquisition-cost trend, with
// date-range presets and per-dimension multi-select filters (metal, category,
// collection, year, currency). Conversion to the base currency happens in the
// analytics service; this component only filters the already-converted events
// and accumulates them into a running total — presentational view logic.

const DIMENSIONS = [
  { key: "metal", label: "Metal" },
  { key: "category", label: "Category" },
  { key: "collection", label: "Collection" },
  { key: "year", label: "Year" },
  { key: "currency", label: "Currency" },
] as const;
type DimKey = (typeof DIMENSIONS)[number]["key"];
type Selection = Record<DimKey, string[]>;

const emptySelection = (): Selection => ({
  metal: [],
  category: [],
  collection: [],
  year: [],
  currency: [],
});

// Same aspect ratio as the cost-breakdown chart so the two render at equal height
// when laid out side by side at equal column widths.
const W = 480;
const H = 300;
const PAD = { top: 16, right: 16, bottom: 28, left: 64 };
const INNER_W = W - PAD.left - PAD.right;
const INNER_H = H - PAD.top - PAD.bottom;

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

function FilterGroup({
  label,
  values,
  selected,
  onToggle,
}: {
  label: string;
  values: string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  if (values.length < 2) return null; // nothing to filter on
  return (
    <div className="filter-group">
      <span className="filter-label">{label}</span>
      <div className="row" role="group" aria-label={label}>
        {values.map((value) => (
          <button
            key={value}
            type="button"
            className="btn-sm range-btn"
            aria-pressed={selected.includes(value)}
            onClick={() => onToggle(value)}
          >
            {value}
          </button>
        ))}
      </div>
    </div>
  );
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
  const [selected, setSelected] = useState<Selection>(emptySelection);

  const options = useMemo(() => {
    const sets: Record<DimKey, Set<string>> = {
      metal: new Set(),
      category: new Set(),
      collection: new Set(),
      year: new Set(),
      currency: new Set(),
    };
    for (const e of events)
      for (const { key } of DIMENSIONS) sets[key].add(e[key]);
    return Object.fromEntries(
      DIMENSIONS.map(({ key }) => [key, [...sets[key]].sort()]),
    ) as Record<DimKey, string[]>;
  }, [events]);

  const filtered = useMemo(
    () =>
      events.filter((e) =>
        DIMENSIONS.every(
          ({ key }) =>
            selected[key].length === 0 || selected[key].includes(e[key]),
        ),
      ),
    [events, selected],
  );

  const data = useMemo(
    () => filterByRange(buildTrend(filtered), RANGES[rangeIdx].days),
    [filtered, rangeIdx],
  );

  const active = DIMENSIONS.some(({ key }) => selected[key].length > 0);
  const toggle = (key: DimKey, value: string) =>
    setSelected((prev) => {
      const cur = prev[key];
      return {
        ...prev,
        [key]: cur.includes(value)
          ? cur.filter((v) => v !== value)
          : [...cur, value],
      };
    });

  if (events.length === 0) return null;

  return (
    <section className="card stack">
      <div className="spread">
        <h3 style={{ margin: 0 }}>{title}</h3>
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

      <div className="filters">
        {DIMENSIONS.map(({ key, label }) => (
          <FilterGroup
            key={key}
            label={label}
            values={options[key]}
            selected={selected[key]}
            onToggle={(value) => toggle(key, value)}
          />
        ))}
        <div className="spread">
          <span className="muted">
            {filtered.length} of {events.length} acquisition
            {events.length === 1 ? "" : "s"}
          </span>
          {active && (
            <button
              type="button"
              className="btn-sm"
              onClick={() => setSelected(emptySelection())}
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {data.length === 0 ? (
        <p className="empty">No acquisitions match the selected filters.</p>
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
      ? PAD.left + INNER_W / 2
      : PAD.left + ((ms(date) - xMin) / (xMax - xMin)) * INNER_W;
  const y = (value: number): number =>
    PAD.top + ((yMax - value) / (yMax - yMin)) * INNER_H;

  const baseline = PAD.top + INNER_H;
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
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      role="img"
      aria-label={label}
      style={{ height: "auto", display: "block" }}
    >
      {gridTicks.map((t) => (
        <g key={t}>
          <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} className="chart-grid" />
          <text x={PAD.left - 8} y={y(t) + 3} textAnchor="end" className="chart-axis">
            {money(t, currency, true)}
          </text>
        </g>
      ))}
      <text x={PAD.left} y={H - 8} textAnchor="start" className="chart-axis">
        {data[0].date}
      </text>
      {data.length > 1 && (
        <text x={W - PAD.right} y={H - 8} textAnchor="end" className="chart-axis">
          {last.date}
        </text>
      )}
      {area && <path d={area} className="chart-area" />}
      <path d={line} className="chart-line" fill="none" />
      <circle cx={x(last.date)} cy={y(last.total)} r={3.5} className="chart-dot" />
    </svg>
  );
}
