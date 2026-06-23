import { describe, it, expect, vi, beforeEach } from "vitest";
import { captureException } from "./index";
import { logger } from "@/lib/logger";

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

const log = vi.mocked(logger);

beforeEach(() => vi.clearAllMocks());

describe("captureException", () => {
  it("logs the error with context and returns a correlation id", () => {
    const id = captureException(new Error("kaboom"), { kind: "test" });

    expect(id).toMatch(/^[0-9a-f-]{36}$/);
    expect(log.error).toHaveBeenCalledOnce();
    const [, context] = log.error.mock.calls[0];
    expect(context).toMatchObject({ errorId: id, kind: "test" });
    expect((context as { error: unknown }).error).toMatchObject({
      name: "Error",
      message: "kaboom",
    });
  });

  it("serializes non-Error throwables", () => {
    const id = captureException("just a string");

    expect(id).toBeTypeOf("string");
    const [, context] = log.error.mock.calls.at(-1)!;
    expect((context as { error: unknown }).error).toMatchObject({
      message: "just a string",
    });
  });
});
