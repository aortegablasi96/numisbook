import { cookies } from "next/headers";
import { THEME_COOKIE, resolveTheme, type ResolvedTheme } from ".";

// Server-only theme resolution for the current request. Imports `next/headers`,
// so this file must never be pulled into a client bundle — keep it separate from
// the client-safe `./index`.

/**
 * Resolve the active theme for the current request. `userTheme` (the session
 * user's saved preference, when signed in) takes precedence; otherwise the
 * `THEME` cookie decides, falling back to "system" (CSS follows the OS).
 */
export async function getRequestTheme(
  userTheme?: string | null,
): Promise<ResolvedTheme> {
  const store = await cookies();
  return resolveTheme({
    userTheme,
    cookieTheme: store.get(THEME_COOKIE)?.value ?? null,
  });
}
