// Supported interface locales (ADR-014). English is the canonical source and
// the ultimate fallback; every other catalog falls back to it per-key. Adding a
// language later is a data-only change: extend this list and add its catalog.

export const LOCALES = ["en", "es", "de", "fr", "it", "zh", "ru"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

// Endonyms — each language's name in its own script/language, so the option is
// recognizable to its own speakers regardless of the current UI language.
export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  es: "Español",
  de: "Deutsch",
  fr: "Français",
  it: "Italiano",
  zh: "中文",
  ru: "Русский",
};

/** Cookie that carries the resolved locale for SSR / signed-out visits. */
export const LOCALE_COOKIE = "NEXT_LOCALE";

/** Narrow an arbitrary string to a supported `Locale`. */
export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}
