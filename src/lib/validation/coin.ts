import { z } from "zod";

// Validation for coin input at the API boundary and in the service.
// `name` is required; the rest are optional descriptive attributes that may be
// null (cleared). `.nullish()` allows the field to be omitted or explicitly null.
const optionalText = (max: number) => z.string().trim().max(max).nullish();

export const coinAttributesSchema = z.object({
  name: z
    .string({ required_error: "Name is required" })
    .trim()
    .min(1, "Name is required")
    .max(200, "Name must be 200 characters or fewer"),
  issuingAuthority: optionalText(200),
  category: optionalText(200),
  year: z
    .number()
    .int("Year must be a whole number")
    .gte(-3000, "Year is out of range")
    .lte(new Date().getFullYear() + 1, "Year is out of range")
    .nullish(),
  denomination: optionalText(120),
  mint: optionalText(120),
  metal: optionalText(60),
  grade: optionalText(60),
});

export const createCoinSchema = coinAttributesSchema;
export const updateCoinSchema = coinAttributesSchema.partial();

export type CreateCoinInput = z.infer<typeof createCoinSchema>;
export type UpdateCoinInput = z.infer<typeof updateCoinSchema>;
