import { cookies, headers } from "next/headers";
import { LOCALE_COOKIE, type Locale } from "./locales";
import { resolveLocale } from "./resolve";

// Server-only locale resolution for the current request. Imports `next/headers`,
// so this file must never be pulled into a client bundle — keep it out of the
// package barrel (`index.ts`).

/**
 * Resolve the active locale for the current request. `userLocale` (the session
 * user's saved preference, when signed in) takes precedence; otherwise the
 * `NEXT_LOCALE` cookie and then the browser's `Accept-Language` decide.
 */
export async function getRequestLocale(
  userLocale?: string | null,
): Promise<Locale> {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
  return resolveLocale({
    userLocale,
    cookieLocale: cookieStore.get(LOCALE_COOKIE)?.value ?? null,
    acceptLanguage: headerStore.get("accept-language"),
  });
}
