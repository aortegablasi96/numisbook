"use client";

import { useEffect, useState, useTransition } from "react";
import type { ResolvedTheme, Theme } from "@/lib/theme";
import { useT } from "@/components/i18n/LocaleProvider";

// A binary sun/moon switch for the interface theme (light | dark). Replaces the
// three-way System/Light/Dark dropdown — "System" is no longer user-selectable
// (DDR-004 amends DDR-003). Clicking flips to the other scheme, applies it to
// `<html data-theme>` immediately for instant feedback, then persists via the
// `action` server action (which also syncs the THEME cookie + revalidates).
//
// For a user with no stored preference the server resolves "system"; on mount we
// read the OS scheme so the switch shows the currently-rendered theme rather than
// a guess. Any click then writes an explicit preference.
export function ThemeToggle({
  initialTheme,
  action,
}: {
  initialTheme: ResolvedTheme;
  action: (theme: Theme) => Promise<void>;
}) {
  const t = useT();
  const [pending, startTransition] = useTransition();
  const [theme, setTheme] = useState<Theme>(
    initialTheme === "system" ? "light" : initialTheme,
  );

  useEffect(() => {
    if (initialTheme === "system") {
      const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setTheme(dark ? "dark" : "light");
    }
  }, [initialTheme]);

  const isDark = theme === "dark";

  function toggle() {
    const next: Theme = isDark ? "light" : "dark";
    setTheme(next);
    // Instant feedback before the server round-trip; the subsequent revalidate
    // re-renders <html data-theme> to the same value, so there's no flash.
    document.documentElement.dataset.theme = next;
    startTransition(() => action(next));
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={t(isDark ? "settings.theme.dark" : "settings.theme.light")}
      className="theme-toggle"
      data-checked={isDark}
      onClick={toggle}
      disabled={pending}
    >
      <span className="theme-toggle-track" aria-hidden="true">
        <span className="theme-toggle-icon theme-toggle-sun">{SUN}</span>
        <span className="theme-toggle-icon theme-toggle-moon">{MOON}</span>
        <span className="theme-toggle-thumb" />
      </span>
    </button>
  );
}

const SUN = (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
  </svg>
);

const MOON = (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);
