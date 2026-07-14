import { useEffect, useRef, useState } from "react";

// Shared layout constants + measuring hooks for the two scrollable portfolio
// charts (TrendChart, CostBreakdownChart). Both charts render at one shared
// height (see useChartHeight) so they line up side by side, with a frozen
// y-axis column (AXIS_W wide) whose value labels stay visible while the plot
// scrolls horizontally. The plot grows by a fixed slot width per data element
// (SLOT) so a long history scrolls instead of being squeezed.

export const AXIS_W = 90; // frozen y-axis (value labels) column width (px)
// On a phone a 90px gutter is nearly a quarter of the screen; the abbreviated
// money labels ("€1.2k") fit comfortably in 60 (DDR-006).
export const AXIS_W_PHONE = 60;
export const SLOT = 94; // px per data element (coin column / trend point)
export const PAD = { top: 16, bottom: 30 } as const; // top/bottom bands (px)

// The breakpoint scale (DDR-006). These mirror the media queries in globals.css,
// which is where the root zoom is set — the two must change together.
const TABLET_BP = 1024;
const PHONE_BP = 640;
const DESKTOP_ZOOM = 0.75;

// The app renders at 75% density via `zoom: 0.75` on <html> — on desktop only; at
// and below the tablet stop it renders at 100% (DDR-002, amended by DDR-006).
// window.innerHeight is measured in on-screen (visual) px, but the SVG height we
// emit is a nominal, pre-zoom length — so we divide the available visual height
// by the zoom to get the nominal height the plot must be to fill that space.
// Because the zoom now depends on the viewport, resolve it at measure time rather
// than baking it in as a constant.
function currentZoom(): number {
  if (typeof window === "undefined") return DESKTOP_ZOOM;
  return window.innerWidth <= TABLET_BP ? 1 : DESKTOP_ZOOM;
}

// Height bounds for the viewport-filling charts. The plot fills the space below
// the page header + summary card + chart chrome, clamped so it never collapses
// on short viewports nor grows unwieldy on tall ones.
export const CHART_MIN_H = 320;
export const CHART_MAX_H = 1040;
// Nominal px the portfolio page reserves around the inline plot (nav bar, page
// title, summary card, this card's header/legend/padding, and a small bottom
// margin). Tuned so the charts fill the leftover viewport height and the page
// still fits without scrolling on a typical screen. Held in nominal (not visual)
// px so the figure is the chrome's own layout size — independent of whichever
// density is in force.
const CHART_CHROME = 460;
// The expand modal fills CHART_MODAL_VH of the viewport height; the plot takes
// that minus the dialog + card chrome (close row, header/legend, padding).
// Keeping the dialog under the viewport means it never needs a vertical scrollbar.
const CHART_MODAL_VH = 0.98;
const CHART_MODAL_CHROME = 253;
const CHART_MODAL_MAX_H = 1700;

// Coins across the cost-breakdown chart's visible width. Five 104px thumbnails
// cannot read on a phone, so it shows three there (DDR-006); the rest scroll.
export const VISIBLE_COINS_DESKTOP = 5;
export const VISIBLE_COINS_PHONE = 3;

// Shared chart height. Inline charts fill the leftover page height; the expanded
// (modal) chart fills most of the viewport without overflowing it. Recomputes on
// resize — which is also when the density can change, so the zoom is re-read.
export function useChartHeight(modal = false): number {
  const [height, setHeight] = useState(CHART_MIN_H);
  useEffect(() => {
    const compute = () => {
      const zoom = currentZoom();
      // Available height in nominal px: the viewport taken out of visual px, less
      // the chrome (already nominal).
      const avail = modal
        ? (window.innerHeight * CHART_MODAL_VH) / zoom - CHART_MODAL_CHROME
        : window.innerHeight / zoom - CHART_CHROME;
      const max = modal ? CHART_MODAL_MAX_H : CHART_MAX_H;
      setHeight(clamp(Math.round(avail), CHART_MIN_H, max));
    };
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, [modal]);
  return height;
}

/**
 * Whether the charts are rendering at the phone stop. Both charts derive their
 * phone geometry (axis gutter, coins across) from this. Starts false so the server
 * render and the first client render agree, then corrects on mount — the same
 * pattern as useChartHeight.
 */
export function useIsPhone(): boolean {
  const [phone, setPhone] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${PHONE_BP}px)`);
    const apply = () => setPhone(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  return phone;
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
