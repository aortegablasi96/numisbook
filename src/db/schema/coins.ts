import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { collections } from "./collections";

export const coins = pgTable(
  "coins",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    collectionId: uuid("collection_id")
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    // Specific issuer, e.g. "Alexander III", "Athens", "Roman Republic".
    issuingAuthority: text("issuing_authority"),
    // Broad grouping, e.g. "Seleucids", "Romans", "Indo-Greek".
    category: text("category"),
    // Negative values denote BC.
    year: integer("year"),
    denomination: text("denomination"),
    // Place struck (distinct from the issuing authority).
    mint: text("mint"),
    metal: text("metal"),
    grade: text("grade"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("coins_collection_id_idx").on(table.collectionId)],
);
