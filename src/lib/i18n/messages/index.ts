import type { Locale } from "../locales";
import { en, type Messages } from "./en";

// Per-locale catalogs. English is complete by construction; the others are
// Partials filled in progressively (story #125) and merged over English so a
// missing key always falls back to the English string rather than a blank/raw
// key (ADR-014).
const catalogs: Record<Locale, Partial<Messages>> = {
  en,
  es: {},
  de: {},
  fr: {},
  it: {},
  zh: {},
  ru: {},
};

/** Return a complete catalog for `locale` (locale overrides merged over English). */
export function getMessages(locale: Locale): Messages {
  return { ...en, ...catalogs[locale] };
}
