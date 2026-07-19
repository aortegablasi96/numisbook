import { describe, it, expect } from "vitest";
import { minutesUntil, sentMessageCount } from "./AssistantWidget";

// The widget itself is never rendered (`environment: "node"`, no DOM), so its
// logic is tested through the pure helpers it is built from.

describe("minutesUntil", () => {
  const now = new Date("2026-07-19T12:00:00.000Z").getTime();

  it("rounds up to whole minutes", () => {
    expect(minutesUntil("2026-07-19T12:04:01.000Z", now)).toBe(5);
  });

  // Never say "0 minutes": the window has not elapsed, so an immediate retry
  // would just be refused again.
  it("never returns less than one minute", () => {
    expect(minutesUntil("2026-07-19T12:00:01.000Z", now)).toBe(1);
    expect(minutesUntil("2026-07-19T11:59:00.000Z", now)).toBe(1);
  });

  it("handles a window a few minutes out", () => {
    expect(minutesUntil("2026-07-19T12:15:00.000Z", now)).toBe(15);
  });
});

describe("sentMessageCount", () => {
  // Must match the filter `send` applies when building `history`, or the widget
  // and the route disagree about how long a conversation is.
  it("ignores blank turns", () => {
    expect(
      sentMessageCount([{ text: "hi" }, { text: "   " }, { text: "" }, { text: "ok" }]),
    ).toBe(2);
  });

  it("counts an empty conversation as zero", () => {
    expect(sentMessageCount([])).toBe(0);
  });
});
