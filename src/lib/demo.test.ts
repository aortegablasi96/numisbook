import { describe, it, expect } from "vitest";
import { ForbiddenError } from "@/lib/errors";
import { assertWritable } from "./demo";

describe("assertWritable", () => {
  it("refuses the demo tenant with a 403, not a 401", () => {
    // 401 would be wrong and would send the UI to sign-in: the demo visitor *is*
    // signed in. They are simply not allowed to write.
    try {
      assertWritable({ isDemo: true });
      expect.unreachable("expected assertWritable to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(ForbiddenError);
      expect((error as ForbiddenError).status).toBe(403);
      expect((error as ForbiddenError).message).toMatch(/read-only demo/i);
    }
  });

  it("lets an ordinary user through", () => {
    expect(() => assertWritable({ isDemo: false })).not.toThrow();
  });
});
