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

// The whole app renders at 75% density via `zoom: 0.75` on <html> (DDR-002).
// window.innerHeight is measured in on-screen (visual) px, but the SVG height we
// emit is a nominal, pre-zoom length — so we divide the available visual height
// by ZOOM to get the nominal height the plot must be to actually fill that space.
const ZOOM = 0.75;

// Height bounds for the viewport-filling charts. The plot fills the space below
// the page header + summary card + chart chrome, clamped so it never collapses
// on short viewports nor grows unwieldy on tall ones.
export const CHART_MIN_H = 320;
export const CHART_MAX_H = 1040;
// Visual px the portfolio page reserves around the inline plot (nav bar, page
// title, summary card, this card's header/legend/padding, and a small bottom
// margin). Tuned so the charts fill the leftover viewport height and the page
// still fits without scrolling on a typical screen.
const CHART_CHROME_VISUAL = 345;
// The expand modal fills CHART_MODAL_VH of the viewport height; the plot takes
// that minus the dialog + card chrome (close row, header/legend, padding) — all
// in visual px. Keeping the dialog under the viewport means it never needs a
// vertical scrollbar.
const CHART_MODAL_VH = 0.98;
const CHART_MODAL_CHROME_VISUAL = 190;
const CHART_MODAL_MAX_H = 1700;

// Shared chart height. Inline charts fill the leftover page height; the expanded
// (modal) chart fills most of the viewport without overflowing it. Recomputes on
// resize.
export function useChartHeight(modal = false): number {
  const [height, setHeight] = useState(CHART_MIN_H);
  useEffect(() => {
    const compute = () => {
      const availVisual = modal
        ? window.innerHeight * CHART_MODAL_VH - CHART_MODAL_CHROME_VISUAL
        : window.innerHeight - CHART_CHROME_VISUAL;
      const max = modal ? CHART_MODAL_MAX_H : CHART_MAX_H;
      setHeight(clamp(Math.round(availVisual / ZOOM), CHART_MIN_H, max));
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
