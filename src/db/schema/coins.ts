import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  numeric,
  date,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { collections } from "./collections";

// Coin grade on the (informal) ancient/world circulated scale, worst → best.
// Declaration order is preserved by Postgres, so ORDER BY grade sorts sensibly.
export const coinGradeEnum = pgEnum("coin_grade", [
  "G", // Good
  "VG", // Very Good
  "F", // Fine
  "VF", // Very Fine
  "EF", // Extremely Fine
  "AU", // About Uncirculated
  "MS", // Mint State
]);

export const coins = pgTable(
  "coins",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    collectionId: uuid("collection_id")
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),
    // No display name: the coin's title is derived from its attributes
    // (category / issuing authority / year range / mint) — see src/lib/coin-format.
    // Specific issuer, e.g. "Alexander III", "Athens", "Roman Republic".
    issuingAuthority: text("issuing_authority"),
    // Broad grouping, e.g. "Seleucids", "Romans", "Indo-Greek".
    category: text("category"),
    // Minting date is often only known as a range. Negative values denote BC.
    // A single known year is stored as year_from == year_to.
    yearFrom: integer("year_from"),
    yearTo: integer("year_to"),
    denomination: text("denomination"),
    // Place struck (distinct from the issuing authority).
    mint: text("mint"),
    metal: text("metal"),
    grade: coinGradeEnum("grade"),
    // Physical specifications.
    weight: numeric("weight", { precision: 7, scale: 2 }), // grams
    diameter: numeric("diameter", { precision: 6, scale: 2 }), // millimetres
    // Type descriptions of each face and free-form notes.
    obverseDescription: text("obverse_description"),
    reverseDescription: text("reverse_description"),
    observations: text("observations"),
    // Catalogue references, free text (e.g. "RIC 123; Sear 456").
    catalogueReferences: text("catalogue_references"),
    // Provenance: free-text list of prior auctions where this coin was hammered.
    pedigree: text("pedigree"),
    // Acquisition: the auction the coin was obtained from.
    auctionHouse: text("auction_house"),
    auctionName: text("auction_name"),
    auctionLot: text("auction_lot"),
    auctionDate: date("auction_date"),
    // Price the collector paid (distinct from valuations, which track market
    // value). Either entered as the hammer/premium/shipping/tax partition — in
    // which case finalPrice is their computed sum — or finalPrice is set directly
    // when the partition is unknown. priceCurrency (ISO 4217) applies to all.
    hammerPrice: numeric("hammer_price", { precision: 12, scale: 2 }),
    auctionPremium: numeric("auction_premium", { precision: 12, scale: 2 }),
    shippingCost: numeric("shipping_cost", { precision: 12, scale: 2 }),
    taxCost: numeric("tax_cost", { precision: 12, scale: 2 }),
    finalPrice: numeric("final_price", { precision: 12, scale: 2 }),
    priceCurrency: text("price_currency"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("coins_collection_id_idx").on(table.collectionId),
    // Serves the default "newest first" listing on both coin surfaces (the
    // per-collection table and the cross-collection /coins view) in index order,
    // with no sort step. See ADR-015 / the Rework Filters Database Review.
    index("coins_collection_id_created_at_idx").on(
      table.collectionId,
      table.createdAt.desc(),
    ),
  ],
);
