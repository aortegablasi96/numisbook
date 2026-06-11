// Common ISO 4217 currencies offered in the base-currency selector. Not
// exhaustive — the API accepts any well-formed 3-letter code — but covers the
// currencies a coin collector is most likely to use. EUR leads as it is the ECB
// pivot used for conversion (ADR-007).
export const COMMON_CURRENCIES = [
  "EUR",
  "USD",
  "GBP",
  "CHF",
  "JPY",
  "CAD",
  "AUD",
  "SEK",
  "NOK",
  "DKK",
  "PLN",
] as const;

/** True for a well-formed ISO 4217 alphabetic code (format only, not membership). */
export function isCurrencyCode(value: string): boolean {
  return /^[A-Z]{3}$/.test(value);
}
