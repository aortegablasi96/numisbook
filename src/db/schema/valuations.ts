import {
  pgTable,
  uuid,
  text,
  numeric,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { coins } from "./coins";

export const valuations = pgTable(
  "valuations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    coinId: uuid("coin_id")
      .notNull()
      .references(() => coins.id, { onDelete: "cascade" }),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    // ISO 4217 currency code, e.g. "USD".
    currency: text("currency").notNull(),
    // Where the value came from: manual, auction, estimate, ...
    source: text("source"),
    valuedAt: timestamp("valued_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("valuations_coin_id_idx").on(table.coinId),
    index("valuations_coin_id_valued_at_idx").on(table.coinId, table.valuedAt),
  ],
);
