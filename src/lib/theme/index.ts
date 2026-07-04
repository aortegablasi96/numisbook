// Interface theme (DDR-003). A minimal, dependency-free layer mirroring the i18n
// locale model: a per-user preference + a `THEME` cookie, resolved on the server
// and applied as a `data-theme` attribute on <html>. "system" is never stored —
// it is the fallback, resolved to light/dark at paint time by a CSS media query,
// so there is no theme script and no flash. Client-safe (no `next/headers`);
// request resolution lives in `./server`.

/** Explicit, storable theme preferences. */
export const THEMES = ["light", "dark"] as const;

export type Theme = (typeof THEMES)[number];

/** What the layout renders: an explicit theme, or "system" (omit the attribute). */
export type ResolvedTheme = Theme | "system";

/** Cookie carrying the resolved theme for SSR / signed-out visits. */
export const THEME_COOKIE = "THEME";

/** Narrow an arbitrary value to a storable `Theme`. */
export function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark";
}

/**
 * Resolve the active theme (DDR-003). Precedence: explicit user preference ->
 * `THEME` cookie -> "system" (let CSS follow `prefers-color-scheme`). Only
 * `light`/`dark` are valid explicit values; anything else falls through.
 */
export function resolveTheme(input: {
  userTheme?: string | null;
  cookieTheme?: string | null;
}): ResolvedTheme {
  if (isTheme(input.userTheme)) return input.userTheme;
  if (isTheme(input.cookieTheme)) return input.cookieTheme;
  return "system";
}
