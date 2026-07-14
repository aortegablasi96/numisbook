import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  primaryKey,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users";

// Tables required by the Auth.js Drizzle adapter. The adapter owns all writes
// here during the OAuth flow; application code should not write to them
// directly. See https://authjs.dev/getting-started/adapters/drizzle.

export const accounts = pgTable(
  "accounts",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    sessionToken: text("session_token").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expires: timestamp("expires", { withTimezone: true }).notNull(),
  },
  (table) => [
    // Sessions are read by token (the primary key), but the demo tenant is the
    // first user to accumulate many rows here — every demo visitor mints one —
    // and its expired-session sweep looks them up by user (ADR-016).
    index("sessions_user_id_idx").on(table.userId),
  ],
);

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { withTimezone: true }).notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })],
);
