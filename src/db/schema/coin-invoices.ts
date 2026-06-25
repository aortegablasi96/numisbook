import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { coins } from "./coins";

// Auction/seller invoices (receipts) for a coin — always PDFs. One or more per
// coin, ordered by createdAt. Mirrors coin_images: only metadata lives here; the
// PDF bytes are kept in object storage (see src/lib/storage) and referenced by
// `storageKey`. The original filename is kept so downloads get a sensible name.
// Deleting the row cascades with the coin; the stored object is removed by the
// repository.
export const coinInvoices = pgTable("coin_invoices", {
  id: uuid("id").primaryKey().defaultRandom(),
  coinId: uuid("coin_id")
    .notNull()
    .references(() => coins.id, { onDelete: "cascade" }),
  mimeType: text("mime_type").notNull(),
  // Original upload filename, for the download "Save as" name (nullable).
  filename: text("filename"),
  // Object-storage key (e.g. invoices/<coinId>/<uuid>); not a public URL.
  storageKey: text("storage_key").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
