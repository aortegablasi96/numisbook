"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { Locale } from "@/lib/i18n/locales";
import type { MessageKey, Messages } from "@/lib/i18n/messages/en";
import { interpolate, type TParams } from "@/lib/i18n/t";

// Client-side i18n context. Seeded once in the root layout from the
// server-resolved locale + complete catalog, so the client renders the same
// language the server did (no hydration mismatch — ADR-014).

type LocaleContextValue = { locale: Locale; messages: Messages };

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({
  locale,
  messages,
  children,
}: {
  locale: Locale;
  messages: Messages;
  children: ReactNode;
}) {
  const value = useMemo(() => ({ locale, messages }), [locale, messages]);
  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

/** Translate function bound to the active locale's catalog. */
export function useT() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useT must be used within a LocaleProvider");
  const { messages } = ctx;
  return (key: MessageKey, params?: TParams) =>
    interpolate(messages[key], params);
}

/** The active locale (e.g. for `Intl` formatting or `lang` attributes). */
export function useLocale(): Locale {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within a LocaleProvider");
  return ctx.locale;
}
