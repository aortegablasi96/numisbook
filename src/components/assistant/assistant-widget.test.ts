import { describe, it, expect } from "vitest";
import { minutesUntil, parseSseBuffer, sentMessageCount } from "./AssistantWidget";

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

describe("parseSseBuffer", () => {
  it("parses complete events", () => {
    const { events, rest } = parseSseBuffer(
      'data: {"type":"text","delta":"hi"}\n\ndata: {"type":"done"}\n\n',
    );
    expect(events).toEqual([
      { type: "text", delta: "hi" },
      { type: "done" },
    ]);
    expect(rest).toBe("");
  });

  // A network chunk can split an event anywhere. Parsing the tail eagerly would
  // drop or corrupt whatever straddles the boundary.
  it("keeps a partial trailing event in the buffer", () => {
    const { events, rest } = parseSseBuffer(
      'data: {"type":"text","delta":"a"}\n\ndata: {"type":"te',
    );
    expect(events).toEqual([{ type: "text", delta: "a" }]);
    expect(rest).toBe('data: {"type":"te');
  });

  it("reassembles across two reads", () => {
    const first = parseSseBuffer('data: {"type":"text","del');
    expect(first.events).toEqual([]);

    const second = parseSseBuffer(first.rest + 'ta":"ok"}\n\n');
    expect(second.events).toEqual([{ type: "text", delta: "ok" }]);
  });

  it("preserves delta text containing blank lines", () => {
    const { events } = parseSseBuffer(
      `data: ${JSON.stringify({ type: "text", delta: "a\n\nb" })}\n\n`,
    );
    expect(events).toEqual([{ type: "text", delta: "a\n\nb" }]);
  });

  it("skips a malformed record without killing the stream", () => {
    const { events } = parseSseBuffer(
      'data: {oops\n\ndata: {"type":"done"}\n\n',
    );
    expect(events).toEqual([{ type: "done" }]);
  });
});
