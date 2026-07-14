import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const users = pgTable(
  "users",
  {
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
    // Preferred interface theme ("light" | "dark"). Null = not chosen; resolve from
    // the `THEME` cookie, defaulting to "system" (follow the OS via CSS). See DDR-003.
    //
    // The shared demo tenant deliberately leaves `locale` and `theme` NULL: a demo
    // visitor's preferences resolve from their own cookies, so one visitor cannot
    // change what the next one sees (ADR-016).
    theme: text("theme"),
    // The public demo tenant (ADR-016). An ordinary tenant in every other respect —
    // its id still comes from the session and every query is still scoped by it —
    // but the API boundary refuses mutations from it (`assertWritable`).
    isDemo: boolean("is_demo").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // At most one demo tenant can ever exist: a partial unique index over the
    // flag's true rows. Makes "the demo user" a well-defined singleton in the DB
    // rather than a convention the seed script has to uphold.
    uniqueIndex("users_is_demo_unique")
      .on(table.isDemo)
      .where(sql`${table.isDemo}`),
  ],
);
