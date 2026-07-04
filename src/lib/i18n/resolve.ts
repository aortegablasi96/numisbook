import { DEFAULT_LOCALE, isLocale, type Locale } from "./locales";

/**
 * Parse an `Accept-Language` header into an ordered list of base language codes,
 * highest q-value first. `"en-US,en;q=0.9,es;q=0.8"` -> `["en", "en", "es"]`.
 * Region subtags are dropped (`en-US` -> `en`) since catalogs are language-only.
 */
export function parseAcceptLanguage(header: string | null | undefined): string[] {
  if (!header) return [];
  return header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const qParam = params.find((p) => p.trim().startsWith("q="));
      const quality = qParam ? Number.parseFloat(qParam.split("=")[1]) : 1;
      return {
        tag: tag.trim().toLowerCase(),
        quality: Number.isNaN(quality) ? 0 : quality,
      };
    })
    .filter((entry) => entry.tag)
    .sort((a, b) => b.quality - a.quality)
    .map((entry) => entry.tag.split("-")[0]);
}

/**
 * Resolve the active locale (ADR-014). Precedence: explicit user preference ->
 * `NEXT_LOCALE` cookie -> `Accept-Language` -> default (English). Each candidate
 * is validated against the supported set; the first supported one wins.
 */
export function resolveLocale(input: {
  userLocale?: string | null;
  cookieLocale?: string | null;
  acceptLanguage?: string | null;
}): Locale {
  if (isLocale(input.userLocale)) return input.userLocale;
  if (isLocale(input.cookieLocale)) return input.cookieLocale;
  for (const lang of parseAcceptLanguage(input.acceptLanguage)) {
    if (isLocale(lang)) return lang;
  }
  return DEFAULT_LOCALE;
}
