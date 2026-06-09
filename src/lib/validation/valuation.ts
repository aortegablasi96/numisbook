import { z } from "zod";

// Validation for recording a valuation. `amount` maps to numeric(12,2) and must
// be positive; `currency` is an ISO 4217 code; `valuedAt` is when the value held
// and cannot be in the future.
export const createValuationSchema = z.object({
  amount: z
    .number({ required_error: "Amount is required" })
    .positive("Amount must be positive")
    .max(9_999_999_999.99, "Amount is too large"),
  currency: z
    .string({ required_error: "Currency is required" })
    .trim()
    .regex(/^[A-Za-z]{3}$/, "Currency must be a 3-letter ISO code")
    .transform((code) => code.toUpperCase()),
  source: z.string().trim().max(100).nullish(),
  sourceUrl: z
    .string()
    .trim()
    .url("Link must be a valid URL")
    .max(2000, "Link is too long")
    .nullish(),
  valuedAt: z.coerce
    .date()
    .refine((d) => d.getTime() <= Date.now(), "Valuation date cannot be in the future"),
});

export type CreateValuationInput = z.infer<typeof createValuationSchema>;
