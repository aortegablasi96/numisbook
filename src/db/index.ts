import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

// In production the app reads PROD_DATABASE_URL (the managed/Neon connection set
// in Vercel), falling back to DATABASE_URL; locally it always uses DATABASE_URL.
// This keeps a PROD_DATABASE_URL stashed in a local .env from repointing dev at
// production. Migrations are separate (drizzle.config.ts → DATABASE_URL). See ADR-012.
const connectionString =
  process.env.NODE_ENV === "production"
    ? (process.env.PROD_DATABASE_URL ?? process.env.DATABASE_URL)
    : process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "No database connection string set (PROD_DATABASE_URL in production, otherwise DATABASE_URL)",
  );
}

const pool = new Pool({ connectionString });

export const db = drizzle(pool, { schema });

export type Database = typeof db;
