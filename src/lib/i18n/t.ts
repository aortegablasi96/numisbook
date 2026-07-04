import type { Locale } from "./locales";
import { getMessages } from "./messages";
import type { MessageKey, Messages } from "./messages/en";

/** Named substitution values for `{param}` placeholders in a message. */
export type TParams = Record<string, string | number>;

/** Replace `{name}` placeholders in `template` with `params.name`. */
export function interpolate(template: string, params?: TParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in params ? String(params[key]) : match,
  );
}

/** Look up `key` in an already-resolved catalog and interpolate. */
export function translate(
  messages: Messages,
  key: MessageKey,
  params?: TParams,
): string {
  return interpolate(messages[key], params);
}

/**
 * Server-side translate: resolve the catalog for `locale` and format `key`.
 * Client components use `useT()` from the LocaleProvider instead.
 */
export function t(locale: Locale, key: MessageKey, params?: TParams): string {
  return translate(getMessages(locale), key, params);
}
