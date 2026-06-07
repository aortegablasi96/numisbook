import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { coins } from "./coins";

// One or more images per coin, ordered by createdAt. Only metadata lives here;
// the bytes are kept in object storage (see src/lib/storage) and referenced by
// `storageKey`, so coin listings stay lean and the DB stays small. Deleting the
// row cascades with the coin; the stored object is removed by the repository.
export const coinImages = pgTable("coin_images", {
  id: uuid("id").primaryKey().defaultRandom(),
  coinId: uuid("coin_id")
    .notNull()
    .references(() => coins.id, { onDelete: "cascade" }),
  mimeType: text("mime_type").notNull(),
  // Object-storage key (e.g. coins/<coinId>/<uuid>); not a public URL.
  storageKey: text("storage_key").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
