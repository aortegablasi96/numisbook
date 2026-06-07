import { customType, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { coins } from "./coins";

// Postgres bytea <-> Node Buffer. node-postgres returns bytea as a Buffer and
// accepts a Buffer for parameters, so the default identity transforms are fine.
const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return "bytea";
  },
});

// One or more images per coin, ordered by createdAt. Bytes live here (not on
// `coins`) so coin listings stay lean. Cascade-deletes with the coin.
export const coinImages = pgTable("coin_images", {
  id: uuid("id").primaryKey().defaultRandom(),
  coinId: uuid("coin_id")
    .notNull()
    .references(() => coins.id, { onDelete: "cascade" }),
  mimeType: text("mime_type").notNull(),
  data: bytea("data").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
