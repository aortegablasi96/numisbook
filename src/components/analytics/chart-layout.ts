import { useEffect, useRef, useState } from "react";

// Shared layout constants + measuring hooks for the two scrollable portfolio
// charts (TrendChart, CostBreakdownChart). Both charts render at one shared
// height (see useChartHeight) so they line up side by side, with a frozen
// y-axis column (AXIS_W wide) whose value labels stay visible while the plot
// scrolls horizontally. The plot grows by a fixed slot width per data element
// (SLOT) so a long history scrolls instead of being squeezed.

export const AXIS_W = 90; // frozen y-axis (value labels) column width (px)
export const SLOT = 94; // px per data element (coin column / trend point)
export const PAD = { top: 16, bottom: 30 } as const; // top/bottom bands (px)

// Height bounds for the viewport-filling charts. The plot fills the space below
// the page header + summary card + chart chrome, clamped so it never collapses
// on short viewports nor grows unwieldy on tall ones.
export const CHART_MIN_H = 320;
export const CHART_MAX_H = 760;
// px the portfolio page occupies around the plot (nav bar, page title, summary
// card, chart header/legend, page padding). Tuned so the chart fills the leftover
// viewport height and the whole page fits without scrolling on a typical screen.
const CHART_CHROME = 472;
// In the expand modal the dialog is sized to ~CHART_MODAL_VH of the viewport
// height; the plot takes that minus CHART_MODAL_INNER_CHROME (dialog padding +
// close row + chart header/legend + card padding). Keeping the whole dialog
// under the viewport means it never needs a vertical scrollbar.
const CHART_MODAL_VH = 0.9;
const CHART_MODAL_INNER_CHROME = 220;
const CHART_MODAL_MAX_H = 1400;

// Shared chart height. Inline charts fill the leftover page height; the expanded
// (modal) chart fills most of the viewport without overflowing it. Recomputes on
// resize.
export function useChartHeight(modal = false): number {
  const [height, setHeight] = useState(CHART_MIN_H);
  useEffect(() => {
    const compute = () => {
      const h = modal
        ? Math.round(window.innerHeight * CHART_MODAL_VH) - CHART_MODAL_INNER_CHROME
        : window.innerHeight - CHART_CHROME;
      const max = modal ? CHART_MODAL_MAX_H : CHART_MAX_H;
      setHeight(clamp(h, CHART_MIN_H, max));
    };
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, [modal]);
  return height;
}

// The plot is as wide as its viewport, but never narrower than one SLOT per
// element — so few items fill the column and a long history scrolls.
export function plotWidth(count: number, viewport: number): number {
  return Math.max(viewport, count * SLOT);
}

export const clamp = (n: number, lo: number, hi: number): number =>
  Math.min(Math.max(n, lo), hi);

// Track an element's content width (the scroll viewport) so the plot can size
// itself in real pixels — avoiding viewBox scaling, which would distort the SVG
// text when the x- and y-axes scale unequally.
export function useMeasuredWidth<T extends HTMLElement>(
  fallback = 480,
): readonly [React.RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        if (w > 0) setWidth(w);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}
