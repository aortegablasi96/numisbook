import { z } from "zod";

// Base-currency preference: a 3-letter ISO 4217 code, or null to clear it
// (fall back to the dominant valuation currency). Empty string is treated as
// null so an "Auto" option in the UI can submit "".
export const baseCurrencySchema = z
  .union([z.literal(""), z.string().regex(/^[A-Z]{3}$/, "Invalid currency code")])
  .nullable()
  .transform((value) => (value ? value : null));
