// A deliberately small Markdown subset for assistant replies (#198).
//
// **Parses to data, never to an HTML string.** The caller renders the returned
// nodes as React elements, so text is escaped by React itself and there is no
// `dangerouslySetInnerHTML` anywhere in the path. That removes the injection
// question rather than answering it — which matters here more than elsewhere,
// because this is the one place in NumisBook where model-generated text (which
// may quote whatever the user typed) becomes markup.
//
// Written in-house rather than imported: the design system is dependency-free by
// decision (DDR-001), a Markdown library would drag a sanitizer in with it, and
// `csv.ts` and `zip.ts` are the precedent for implementing the small subset
// actually needed. Anything outside that subset stays literal text — the failure
// mode is "shows the raw characters", never broken markup.

export type Inline =
  | { type: "text"; value: string }
  | { type: "bold"; children: Inline[] }
  | { type: "italic"; children: Inline[] }
  | { type: "code"; value: string }
  | { type: "link"; href: string; children: Inline[] };

export type Block =
  | { type: "paragraph"; children: Inline[] }
  | { type: "list"; ordered: boolean; items: Inline[][] };

/** Schemes a link may use. Everything else renders as plain text. */
const SAFE_SCHEME = /^(?:https?:|mailto:)/i;

/**
 * The href to render, or null if it is not safe to link.
 *
 * Whitespace and control characters are stripped **before** the scheme test:
 * browsers ignore them inside a scheme, so `java\nscript:` and `java\0script:`
 * both execute as `javascript:` — a naive test on the raw string would pass
 * something the browser would then run. A rejected link keeps its text; it
 * simply is not clickable.
 */
export function safeHref(href: string): string | null {
  // Filtered by code point rather than by a regex character class: a class
  // containing raw control characters is easy to get subtly wrong. A raw space
  // in a real URL would be percent-encoded, so removing them cannot damage a
  // legitimate link.
  const cleaned = [...href]
    .filter((ch) => {
      const code = ch.codePointAt(0) ?? 0;
      return code > 0x20 && code !== 0x7f;
    })
    .join("");

  return SAFE_SCHEME.test(cleaned) ? cleaned : null;
}

type Match = { index: number; length: number; node: Inline };

/**
 * Inline patterns, in resolution order.
 *
 * Order is load-bearing where matches can start at the same position: code
 * spans win so their contents stay literal, and `**` is tried before `*` so
 * bold is never mis-read as italic wrapping a stray asterisk.
 */
const INLINE_PATTERNS: {
  regex: RegExp;
  build: (m: RegExpExecArray) => Inline | null;
}[] = [
  {
    regex: /`([^`\n]+)`/,
    build: (m) => ({ type: "code", value: m[1] }),
  },
  {
    regex: /\[([^\]\n]*)\]\(([^)\s]+)\)/,
    build: (m) => {
      const href = safeHref(m[2]);
      // An unsafe link degrades to its own text rather than vanishing.
      if (!href) return { type: "text", value: m[1] || m[2] };
      return { type: "link", href, children: parseInline(m[1]) };
    },
  },
  {
    regex: /\*\*([^*\n]+)\*\*/,
    build: (m) => ({ type: "bold", children: parseInline(m[1]) }),
  },
  {
    regex: /__([^_\n]+)__/,
    build: (m) => ({ type: "bold", children: parseInline(m[1]) }),
  },
  {
    regex: /\*([^*\n]+)\*/,
    build: (m) => ({ type: "italic", children: parseInline(m[1]) }),
  },
  {
    regex: /_([^_\n]+)_/,
    build: (m) => ({ type: "italic", children: parseInline(m[1]) }),
  },
];

/** The earliest inline construct in `text`, or null if there is none. */
function firstMatch(text: string): Match | null {
  let best: Match | null = null;

  for (const { regex, build } of INLINE_PATTERNS) {
    const m = regex.exec(text);
    if (!m) continue;
    // Strictly earlier only, so an earlier pattern in the list wins a tie.
    if (best && m.index >= best.index) continue;
    const node = build(m);
    if (!node) continue;
    best = { index: m.index, length: m[0].length, node };
  }

  return best;
}

/** Parse emphasis, code, and links within a single run of text. */
export function parseInline(text: string): Inline[] {
  const out: Inline[] = [];
  let rest = text;

  while (rest.length > 0) {
    const match = firstMatch(rest);
    if (!match) {
      out.push({ type: "text", value: rest });
      break;
    }
    if (match.index > 0) {
      out.push({ type: "text", value: rest.slice(0, match.index) });
    }
    out.push(match.node);
    rest = rest.slice(match.index + match.length);
  }

  return out;
}

const UNORDERED = /^\s{0,3}[-*+]\s+(.*)$/;
const ORDERED = /^\s{0,3}\d+[.)]\s+(.*)$/;

/**
 * Parse a reply into blocks.
 *
 * Call this on the **accumulated** text, never on a streamed delta: a chunk
 * boundary can split `**` or a list marker, and parsing the halves separately
 * would render the fragments literally.
 */
export function parseMarkdown(text: string): Block[] {
  const blocks: Block[] = [];
  const lines = text.replace(/\r\n/g, "\n").split("\n");

  let paragraph: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    // Joined with newlines rather than spaces: the assistant uses line breaks
    // meaningfully, and the CSS preserves them.
    blocks.push({
      type: "paragraph",
      children: parseInline(paragraph.join("\n")),
    });
    paragraph = [];
  };

  const flushList = () => {
    if (!list) return;
    blocks.push({
      type: "list",
      ordered: list.ordered,
      items: list.items.map((item) => parseInline(item)),
    });
    list = null;
  };

  for (const line of lines) {
    const unordered = UNORDERED.exec(line);
    const ordered = unordered ? null : ORDERED.exec(line);

    if (unordered || ordered) {
      flushParagraph();
      const isOrdered = Boolean(ordered);
      // A change of list kind starts a new list rather than mixing markers.
      if (list && list.ordered !== isOrdered) flushList();
      list ??= { ordered: isOrdered, items: [] };
      list.items.push((unordered ?? ordered)![1]);
      continue;
    }

    if (line.trim() === "") {
      flushParagraph();
      flushList();
      continue;
    }

    flushList();
    paragraph.push(line);
  }

  flushParagraph();
  flushList();

  return blocks;
}
