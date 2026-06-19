import { z } from "zod";

// Validation for coin input at the API boundary and in the service.
// `name` is required; the rest are optional descriptive attributes that may be
// null (cleared). `.nullish()` allows the field to be omitted or explicitly null.
const optionalText = (max: number) => z.string().trim().max(max).nullish();

// A year on the historical scale: whole number, negative = BC, no further future
// than next year. Shared by the year range bounds.
const yearValue = z
  .number()
  .int("Year must be a whole number")
  .gte(-3000, "Year is out of range")
  .lte(new Date().getFullYear() + 1, "Year is out of range");

// Coin grades, worst → best. Kept in sync with the `coin_grade` Postgres enum.
export const COIN_GRADES = ["G", "VG", "F", "VF", "EF", "AU", "MS"] as const;

// A non-negative physical measurement (grams / millimetres). Stored in a
// numeric column, so the service fixes it to scale before writing.
const optionalMeasurement = (max: number) =>
  z.number().positive("Must be greater than zero").max(max, "Value is too large").nullish();

// A money amount mapped to a numeric(12,2) column. Non-negative so the price
// partition (premium / shipping can be zero) is accepted.
const optionalMoney = z
  .number()
  .nonnegative("Must not be negative")
  .max(9_999_999_999.99, "Amount is too large")
  .nullish();

export const coinAttributesSchema = z
  .object({
    issuingAuthority: optionalText(200),
    category: optionalText(200),
    yearFrom: yearValue.nullish(),
    yearTo: yearValue.nullish(),
    denomination: optionalText(120),
    mint: optionalText(120),
    metal: optionalText(60),
    grade: z.enum(COIN_GRADES, { message: "Invalid grade" }).nullish(),
    weight: optionalMeasurement(99_999.99),
    diameter: optionalMeasurement(9_999.99),
    obverseDescription: optionalText(2000),
    reverseDescription: optionalText(2000),
    observations: optionalText(4000),
    catalogueReferences: optionalText(500),
    pedigree: optionalText(4000),
    auctionHouse: optionalText(200),
    auctionName: optionalText(200),
    auctionLot: optionalText(60),
    auctionDate: z.coerce
      .date()
      .refine((d) => d.getTime() <= Date.now(), "Auction date cannot be in the future")
      .nullish(),
    // Price paid. hammer/premium/shipping/tax form the partition; finalPrice is
    // the total — computed from the partition in the service, or set directly.
    hammerPrice: optionalMoney,
    auctionPremium: optionalMoney,
    shippingCost: optionalMoney,
    taxCost: optionalMoney,
    finalPrice: optionalMoney,
    priceCurrency: z
      .string()
      .trim()
      .regex(/^[A-Za-z]{3}$/, "Currency must be a 3-letter ISO code")
      .transform((code) => code.toUpperCase())
      .nullish(),
  })
  .refine(
    (c) =>
      c.yearFrom == null || c.yearTo == null || c.yearFrom <= c.yearTo,
    { message: "Start year must not be after end year", path: ["yearTo"] },
  );

export const createCoinSchema = coinAttributesSchema;
// `.partial()` lives on the object; re-apply the year-range refine afterwards.
export const updateCoinSchema = coinAttributesSchema.innerType().partial().refine(
  (c) => c.yearFrom == null || c.yearTo == null || c.yearFrom <= c.yearTo,
  { message: "Start year must not be after end year", path: ["yearTo"] },
);

export type CreateCoinInput = z.infer<typeof createCoinSchema>;
export type UpdateCoinInput = z.infer<typeof updateCoinSchema>;
