import { z } from "zod";

// Display name: trimmed, 1–80 characters. Empty/whitespace-only is rejected so
// a user can't blank out their name. The Auth.js adapter seeds `users.name`
// from the OAuth profile; this is the app-owned edit path (see ADR-013).
export const displayNameSchema = z
  .string()
  .trim()
  .min(1, "Name is required")
  .max(80, "Name must be at most 80 characters");

// Request body for editing the profile (PATCH /api/user).
export const updateProfileSchema = z.object({ name: displayNameSchema });

// Base-currency preference: a 3-letter ISO 4217 code, or null to clear it
// (fall back to the dominant valuation currency). Empty string is treated as
// null so an "Auto" option in the UI can submit "".
export const baseCurrencySchema = z
  .union([z.literal(""), z.string().regex(/^[A-Z]{3}$/, "Invalid currency code")])
  .nullable()
  .transform((value) => (value ? value : null));
