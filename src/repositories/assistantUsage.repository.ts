import { and, eq, gte, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { assistantUsage } from "@/db/schema";

export type AssistantUsage = typeof assistantUsage.$inferSelect;
export type NewAssistantUsage = typeof assistantUsage.$inferInsert;

/** How an assistant request ended. Mirrors the table's CHECK constraint. */
export type AssistantUsageOutcome =
  | "completed"
  | "aborted"
  | "limit_exceeded"
  | "error";

// Data access for assistant usage accounting (ADR-018). Only this layer touches
// the table.
//
// Not tenant-scoped in the usual sense — `assistant_usage` sits outside the
// ownership model, like `fx_rates`. What replaces `userId` scoping here is the
// `subjectKey`: every read and write is scoped by it, and it is always derived
// server-side (`assistant-limits.service`), never taken from client input.
export const assistantUsageRepository = {
  /** Record what one assistant request consumed. */
  async record(usage: NewAssistantUsage): Promise<void> {
    await db.insert(assistantUsage).values(usage);
  },

  /** How many requests this subject has made since `since` (rate limiting). */
  async countSince(subjectKey: string, since: Date): Promise<number> {
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(assistantUsage)
      .where(
        and(
          eq(assistantUsage.subjectKey, subjectKey),
          gte(assistantUsage.createdAt, since),
        ),
      );
    return row?.count ?? 0;
  },

  /**
   * Total tokens this subject has consumed since `since` (cost control).
   *
   * Coalesced to 0 in SQL: Postgres `SUM()` over no rows is NULL, and an
   * unhandled NULL becomes NaN in the caller's comparison — a guard that
   * silently never trips.
   */
  async sumTokensSince(subjectKey: string, since: Date): Promise<number> {
    const [row] = await db
      .select({
        tokens: sql<number>`coalesce(sum(${assistantUsage.promptTokens} + ${assistantUsage.completionTokens}), 0)::int`,
      })
      .from(assistantUsage)
      .where(
        and(
          eq(assistantUsage.subjectKey, subjectKey),
          gte(assistantUsage.createdAt, since),
        ),
      );
    return row?.tokens ?? 0;
  },

  /**
   * Delete every row for a subject.
   *
   * Called when an account is deleted (ADR-013 + ADR-018 §5): this table has no
   * foreign key, so the database cascade cannot reach it, and rows left behind
   * would still carry the deleted user's id.
   */
  async deleteBySubject(subjectKey: string): Promise<void> {
    await db
      .delete(assistantUsage)
      .where(eq(assistantUsage.subjectKey, subjectKey));
  },

  /**
   * Delete rows older than `cutoff`, returning how many went.
   *
   * Retention is deliberately not scheduled (ADR-018 §8) — this exists so the
   * capability is present and tested when the table's real growth is known.
   */
  async deleteOlderThan(cutoff: Date): Promise<number> {
    const deleted = await db
      .delete(assistantUsage)
      .where(lt(assistantUsage.createdAt, cutoff))
      .returning({ id: assistantUsage.id });
    return deleted.length;
  },
};
