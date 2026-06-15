import { describe, it, expect } from "vitest";
import type { AcquisitionEvent } from "@/services/analytics.service";
import { niceTicks, filterEventsByRange } from "./chart-utils";

// niceTicks is the pure y-axis logic behind both charts' gridlines: it must start
// at 0, climb in human-friendly steps (1/2/2.5/5 × 10ⁿ), and produce a top tick
// that covers the largest value so nothing overflows the plot.
describe("niceTicks", () => {
  it("starts at 0 and ends at or above the max", () => {
    const ticks = niceTicks(237);
    expect(ticks[0]).toBe(0);
    expect(ticks[ticks.length - 1]).toBeGreaterThanOrEqual(237);
  });

  it("steps in rounded increments and covers the max with the top tick", () => {
    expect(niceTicks(100)).toEqual([0, 25, 50, 75, 100]);
    expect(niceTicks(237)).toEqual([0, 100, 200, 300]);
    expect(niceTicks(8)).toEqual([0, 2, 4, 6, 8]);
    expect(niceTicks(940)).toEqual([0, 250, 500, 750, 1000]);
  });

  it("uses an evenly spaced step throughout", () => {
    const ticks = niceTicks(940);
    const step = ticks[1] - ticks[0];
    for (let i = 1; i < ticks.length; i++) {
      expect(ticks[i] - ticks[i - 1]).toBeCloseTo(step);
    }
  });

  it("degrades gracefully for non-positive maxima", () => {
    expect(niceTicks(0)).toEqual([0]);
    expect(niceTicks(-5)).toEqual([0]);
  });
});

// filterEventsByRange narrows the coins a chart shows to those acquired within
// `days` of the most recent acquisition, and must never blank a non-empty chart.
describe("filterEventsByRange", () => {
  const ev = (id: string, date: string): AcquisitionEvent =>
    ({ id, date }) as AcquisitionEvent;
  const events = [
    ev("old", "2024-01-01"),
    ev("mid", "2025-01-01"),
    ev("new", "2025-06-01"), // most recent
  ];

  it("keeps only acquisitions within the window of the latest one", () => {
    // 1Y back from 2025-06-01 drops the 2024-01-01 coin.
    expect(filterEventsByRange(events, 365).map((e) => e.id)).toEqual(["mid", "new"]);
    // 3M back keeps only the most recent.
    expect(filterEventsByRange(events, 90).map((e) => e.id)).toEqual(["new"]);
  });

  it("returns everything for an infinite range", () => {
    expect(filterEventsByRange(events, Infinity)).toHaveLength(3);
  });

  it("keeps at least the most recent coin, and handles empty input", () => {
    expect(filterEventsByRange(events, 1).map((e) => e.id)).toEqual(["new"]);
    expect(filterEventsByRange([], 90)).toEqual([]);
  });
});
