"use client";

import { Fragment } from "react";
import { parseMarkdown, type Block, type Inline } from "@/lib/markdown";

// Renders the assistant's Markdown subset (#198).
//
// Every leaf is a React text node, so React escapes it — no
// `dangerouslySetInnerHTML`, and therefore no HTML-injection surface for
// model-generated text. `href` is the one attribute that carries model output,
// and `parseMarkdown` has already rejected any scheme but http/https/mailto.

function renderInline(nodes: Inline[]) {
  return nodes.map((node, i) => {
    switch (node.type) {
      case "text":
        return <Fragment key={i}>{node.value}</Fragment>;
      case "bold":
        return <strong key={i}>{renderInline(node.children)}</strong>;
      case "italic":
        return <em key={i}>{renderInline(node.children)}</em>;
      case "code":
        return <code key={i}>{node.value}</code>;
      case "link":
        return (
          <a
            key={i}
            href={node.href}
            target="_blank"
            // noopener/noreferrer because the destination is model-chosen.
            rel="noopener noreferrer"
          >
            {renderInline(node.children)}
          </a>
        );
    }
  });
}

function renderBlock(block: Block, key: number) {
  if (block.type === "list") {
    const items = block.items.map((item, i) => (
      <li key={i}>{renderInline(item)}</li>
    ));
    return block.ordered ? <ol key={key}>{items}</ol> : <ul key={key}>{items}</ul>;
  }
  return <p key={key}>{renderInline(block.children)}</p>;
}

/**
 * Render assistant text as formatted output.
 *
 * Parses the **whole** accumulated reply on each render rather than per
 * streamed delta — a chunk boundary can split `**` or a list marker, and
 * parsing halves separately would leave the fragments visible.
 */
export function MarkdownText({ text }: { text: string }) {
  return (
    <div className="chat-markdown">
      {parseMarkdown(text).map((block, i) => renderBlock(block, i))}
    </div>
  );
}
