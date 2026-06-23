import { sql } from "drizzle-orm";
import { db } from "@/db";

// Liveness data access for the health check — the only place the check touches
// the database. A trivial round-trip confirms the connection pool is serving.
export const healthRepository = {
  /** Run the cheapest possible query to confirm DB connectivity. */
  async ping(): Promise<void> {
    await db.execute(sql`select 1`);
  },
};
