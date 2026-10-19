import { describe, expect, it, vi } from "vitest";
import { sql } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { COIN_SORT_BY } from "@/lib/validation/coin";

// The repository imports the live client, which throws without a connection
// string. Only the pure ORDER BY builder is under test, so no client is needed.
vi.mock("@/db", () => ({ db: {} }));

const { buildCoinOrderBy } = await import("./coin.repository");

const dialect = new PgDialect();
const render = (...args: Parameters<typeof buildCoinOrderBy>) =>
  dialect.sqlToQuery(sql.join(buildCoinOrderBy(...args), sql`, `)).sql;

describe("buildCoinOrderBy", () => {
  // #182: a sort key alone is a partial order, so LIMIT/OFFSET paging over tied
  // rows can repeat or skip a coin. Iterating the whole sort contract means a new
  // sort key cannot ship without the tiebreaker.
  it.each(COIN_SORT_BY.flatMap((sortBy) => [
    [sortBy, "asc"] as const,
    [sortBy, "desc"] as const,
  ]))("ends %s %s with the unique coins.id tiebreaker", (sortBy, sortDir) => {
    expect(render({ sortBy, sortDir })).toMatch(new RegExp(`, "coins"."id" ${sortDir}$`));
  });

  it("defaults to newest first, tiebroken by id", () => {
    expect(render({})).toBe('"coins"."created_at" desc, "coins"."id" desc');
  });

  it("honours an ascending created-at sort (\"Oldest first\")", () => {
    expect(render({ sortBy: "createdAt", sortDir: "asc" })).toBe(
      '"coins"."created_at" asc, "coins"."id" asc',
    );
  });

  it("orders by the requested column first", () => {
    expect(render({ sortBy: "year", sortDir: "asc" })).toBe(
      '"coins"."year_from" asc, "coins"."id" asc',
    );
    expect(render({ sortBy: "category" })).toBe('"coins"."category" desc, "coins"."id" desc');
  });
});
