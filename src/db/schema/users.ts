import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Auth.js identity fields (populated by the Drizzle adapter on OAuth login).
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified", { withTimezone: true }),
  image: text("image"),
  // Preferred ISO 4217 currency for portfolio figures. Null = derive from the
  // collector's dominant valuation currency (see analytics.service). Conversion
  // uses ECB reference rates — see ADR-007.
  baseCurrency: text("base_currency"),
  // Preferred interface language (a supported `Locale` code). Null = not chosen;
  // resolve from the `NEXT_LOCALE` cookie / Accept-Language, defaulting to
  // English. See ADR-014.
  locale: text("locale"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
