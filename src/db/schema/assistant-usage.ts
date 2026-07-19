import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  index,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// One row per collection-assistant request: who spent, how much, and how the
// request ended (ADR-018). Rate limiting counts rows in a window; cost control
// sums tokens over one. The table is also the queryable record of what the
// assistant actually costs — `logger` accompanies it but is not the record.
//
// **No foreign key, deliberately.** `subject_key` is polymorphic: `user:<uuid>`
// for a signed-in collector, `demo:<sha256>` for a demo visitor's hashed session
// token, which references no row we could point at. That makes this the second
// table outside the tenant-ownership model after `fx_rates` — but unlike
// `fx_rates` it *does* reference a user, just not referentially, which is why
// account deletion must purge these rows explicitly (`account.service`); the
// database cascade has no key to follow (ADR-018 §5).
export const assistantUsage = pgTable(
  "assistant_usage",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // "user:<uuid>" | "demo:<sha256 hex>". The prefix is load-bearing: without
    // it uuids and token hashes share one namespace, so a collision would merge
    // two subjects' budgets and the deletion purge could not target rows exactly.
    subjectKey: text("subject_key").notNull(),
    // Kept apart, never summed into one column: gpt-4o-mini prices input and
    // output differently, so a single total would make the row's *cost*
    // unrecoverable — which is the question this table exists to answer.
    promptTokens: integer("prompt_tokens").notNull().default(0),
    completionTokens: integer("completion_tokens").notNull().default(0),
    // completed | aborted | limit_exceeded | error
    outcome: text("outcome").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // The only hot query shape: equality on the subject, then a range scan back
    // over time. Both guards run this on every assistant request, so without it
    // each one sequentially scans a table that only grows.
    index("assistant_usage_subject_created_idx").on(
      table.subjectKey,
      table.createdAt.desc(),
    ),
    // A negative token count means an accounting bug; let the database say so
    // rather than let it silently under-count a window sum.
    check(
      "assistant_usage_tokens_non_negative",
      sql`${table.promptTokens} >= 0 AND ${table.completionTokens} >= 0`,
    ),
    check(
      "assistant_usage_outcome_valid",
      sql`${table.outcome} IN ('completed', 'aborted', 'limit_exceeded', 'error')`,
    ),
  ],
);
