import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createLogger } from "./index";

describe("logger", () => {
  const original = { ...process.env };

  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    process.env = { ...original };
  });

  it("emits JSON with level, time, msg and context when LOG_FORMAT=json", () => {
    process.env.LOG_FORMAT = "json";
    process.env.LOG_LEVEL = "debug";
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});

    createLogger().info("hello", { userId: "u1" });

    expect(spy).toHaveBeenCalledOnce();
    const parsed = JSON.parse(spy.mock.calls[0][0] as string);
    expect(parsed).toMatchObject({ level: "info", msg: "hello", userId: "u1" });
    expect(parsed.time).toBeTypeOf("string");
  });

  it("suppresses messages below the configured level", () => {
    process.env.LOG_FORMAT = "json";
    process.env.LOG_LEVEL = "warn";
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const log = createLogger();
    log.info("skipped");
    log.warn("kept");

    expect(info).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledOnce();
  });

  it("emits a compact human line when LOG_FORMAT=pretty", () => {
    process.env.LOG_FORMAT = "pretty";
    process.env.LOG_LEVEL = "debug";
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    createLogger().error("boom", { errorId: "abc" });

    const line = spy.mock.calls[0][0] as string;
    expect(line).toContain("ERROR");
    expect(line).toContain("boom");
    expect(line).toContain("abc");
  });
});
