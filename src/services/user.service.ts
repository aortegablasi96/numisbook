import { userRepository } from "@/repositories/user.repository";
import {
  baseCurrencySchema,
  displayNameSchema,
  localeSchema,
  themeSchema,
} from "@/lib/validation/user";

// User-preferences business logic. Framework-agnostic; data access goes through
// the repository. The acting userId always comes from the session, never client
// input (tenant isolation).

/**
 * Update the user's display name. Trims and length-bounds the input; rejects an
 * empty/whitespace-only name. Returns the stored (trimmed) name.
 */
export async function updateDisplayName(
  userId: string,
  input: string,
): Promise<string> {
  const name = displayNameSchema.parse(input);
  await userRepository.updateName(userId, name);
  return name;
}

/**
 * Set the user's preferred portfolio base currency. Accepts a 3-letter ISO 4217
 * code, or null/"" to clear it (revert to the dominant valuation currency).
 */
export async function setBaseCurrency(
  userId: string,
  input: string | null,
): Promise<void> {
  const baseCurrency = baseCurrencySchema.parse(input);
  await userRepository.updateBaseCurrency(userId, baseCurrency);
}

/**
 * Set the user's preferred interface language. Accepts a supported locale code,
 * or null/"" to clear it (revert to cookie / Accept-Language). Returns the
 * stored value so the caller can sync the `NEXT_LOCALE` cookie. See ADR-014.
 */
export async function setLocale(
  userId: string,
  input: string | null,
): Promise<string | null> {
  const locale = localeSchema.parse(input);
  await userRepository.updateLocale(userId, locale);
  return locale;
}

/**
 * Set the user's preferred interface theme. Accepts "light"/"dark", or null/""
 * to clear it (revert to "system"). Returns the stored value so the caller can
 * sync the `THEME` cookie. See DDR-003.
 */
export async function setTheme(
  userId: string,
  input: string | null,
): Promise<string | null> {
  const theme = themeSchema.parse(input);
  await userRepository.updateTheme(userId, theme);
  return theme;
}

// Validate a preference *without* storing it. The demo tenant is shared by every
// visitor at once, so persisting one visitor's language or theme would change
// what the others see. Both preferences are cookie-backed and the demo user's
// columns stay NULL, so the caller can set the cookie alone and each visitor
// keeps a private preference (ADR-016).

/** Validate a locale preference for a caller that must not persist it. */
export function parseLocalePreference(input: string | null): string | null {
  return localeSchema.parse(input);
}

/** Validate a theme preference for a caller that must not persist it. */
export function parseThemePreference(input: string | null): string | null {
  return themeSchema.parse(input);
}
