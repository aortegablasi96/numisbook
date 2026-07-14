import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

// The demo tenant is read-only (ADR-016), and the only thing standing between a
// demo visitor and everyone else's demo is `assertWritable(user)` in each
// mutating route handler. Hiding the buttons is cosmetic; forgetting one guard
// is the whole failure mode.
//
// So rather than trusting review, assert it statically: every exported mutating
// handler under src/app/api must call the guard. A new route that writes and
// forgets to call it fails this test — and therefore CI.

const API_DIR = join(process.cwd(), "src", "app", "api");
const MUTATING_HANDLER = /export async function (POST|PUT|PATCH|DELETE)\b/g;

// Routes that legitimately handle non-GET requests without the guard, each for a
// stated reason. Anything not on this list must guard.
const EXEMPT: Record<string, string> = {
  "auth/[...nextauth]/route.ts":
    "Auth.js adapter handlers — sign-in/out, not a tenant-data mutation.",
  "assistant/route.ts":
    "Stays open to demo visitors: it enforces read-only by giving the model a " +
    "read-only tool set, so it never reaches a mutating service (see assistant.service).",
  "demo/route.ts":
    "Mints the demo session itself — by definition it runs before there is a demo user to refuse.",
};

function routeFiles(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...routeFiles(full));
    else if (entry.name === "route.ts") found.push(full);
  }
  return found;
}

describe("demo write guard", () => {
  const files = routeFiles(API_DIR);

  it("finds the API routes", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files)("%s guards its mutating handlers", (file) => {
    const relative = file
      .slice(API_DIR.length + 1)
      .split(/[\\/]/)
      .join("/");
    const source = readFileSync(file, "utf8");

    const handlers = [...source.matchAll(MUTATING_HANDLER)].map((m) => m[1]);
    if (handlers.length === 0) return; // read-only route: nothing to guard

    if (EXEMPT[relative]) {
      expect(EXEMPT[relative]).toBeTruthy();
      return;
    }

    // Every mutating handler in the file must be covered. Counting occurrences
    // catches the half-done case: a file with PATCH + DELETE that guards only one.
    const guards = source.match(/assertWritable\(user\)/g)?.length ?? 0;
    expect(
      guards,
      `${relative} exports ${handlers.join(", ")} but calls assertWritable(user) ${guards} time(s). ` +
        `Every mutating handler must refuse the read-only demo tenant, or be listed in EXEMPT with a reason.`,
    ).toBe(handlers.length);
  });
});
