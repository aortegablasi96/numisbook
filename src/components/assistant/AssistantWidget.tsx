"use client";

import { useRef, useState } from "react";
import { useT } from "@/components/i18n/LocaleProvider";
import type { MessageKey } from "@/lib/i18n";
import { canSendAnotherMessage } from "@/lib/assistant-conversation";

// Example prompts shown on the empty state. Translated so the model receives the
// question in the user's language (and answers in kind — ADR-014).
const SUGGESTION_KEYS: MessageKey[] = [
  "assistant.suggestion.mostValuable",
  "assistant.suggestion.summary",
  "assistant.suggestion.addCoin",
];

type Message = { role: "user" | "assistant"; content: string };

type Turn = {
  role: "user" | "assistant";
  text: string;
  imageUrl?: string; // display only — not sent in the messages array
  actions?: string[];
};

async function readError(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error ?? fallback;
  } catch {
    return fallback;
  }
}

/** One event from the assistant stream (mirrors the service's `ChatEvent`). */
export type StreamEvent =
  | { type: "text"; delta: string }
  | { type: "action"; action: string }
  | { type: "error"; message: string }
  | { type: "done" };

/**
 * Split an SSE buffer into complete events, returning the unconsumed remainder.
 *
 * A network chunk can split an event anywhere — mid-JSON, mid-delimiter — so
 * only whole `data: …\n\n` records are parsed and the tail is carried forward.
 * Pure and exported because the widget itself is never rendered under
 * `environment: "node"`.
 */
export function parseSseBuffer(buffer: string): {
  events: StreamEvent[];
  rest: string;
} {
  const events: StreamEvent[] = [];
  const parts = buffer.split("\n\n");
  // The final part is whatever came after the last delimiter: possibly a
  // partial event, so it stays in the buffer.
  const rest = parts.pop() ?? "";

  for (const part of parts) {
    const line = part.trim();
    if (!line.startsWith("data:")) continue;
    try {
      events.push(JSON.parse(line.slice(5).trim()) as StreamEvent);
    } catch {
      // A malformed record is skipped rather than killing the stream.
    }
  }
  return { events, rest };
}

/**
 * Whole minutes until `iso`, at least 1.
 *
 * Rounded **up**: telling someone to retry in "0 minutes" when the window has
 * not actually elapsed invites an immediate second refusal.
 */
export function minutesUntil(iso: string, now = Date.now()): number {
  const ms = new Date(iso).getTime() - now;
  return Math.max(1, Math.ceil(ms / 60_000));
}

// Resize an image file to at most maxDim px on the longest side, JPEG 85%.
function resizeImage(file: File, maxDim = 800): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width >= height) {
            height = Math.round((height / width) * maxDim);
            width = maxDim;
          } else {
            width = Math.round((width / height) * maxDim);
            height = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function IconChat() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
    </svg>
  );
}

function IconClose() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
    </svg>
  );
}

function IconSend() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
    </svg>
  );
}

function IconTrash() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M9 3v1H4v2h1v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6h1V4h-5V3H9zm0 5h2v9H9V8zm4 0h2v9h-2V8z" />
    </svg>
  );
}

function IconAttach() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5a2.5 2.5 0 0 1 5 0v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5a2.5 2.5 0 0 0 5 0V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z" />
    </svg>
  );
}

/**
 * Count the messages a conversation would send — the same filter `send` applies
 * when building `history`, so the widget and the route agree on what "length"
 * means. Pure and exported for testing (`environment: "node"`, so the component
 * itself is never rendered).
 */
export function sentMessageCount(turns: { text: string }[]): number {
  return turns.filter((turn) => turn.text.trim() !== "").length;
}

export function AssistantWidget({ isDemo = false }: { isDemo?: boolean }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  // Image held across turns: set when first sent, cleared only when the assistant
  // confirms it was saved ("Saved coin photo" in actions) or the chat is cleared.
  // This fixes the case where the model asks for more info before calling add_coin,
  // which would otherwise lose the image between turns.
  const [heldImage, setHeldImage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Same rule the route enforces (`@/lib/assistant-conversation`), applied here
  // so the limit is explained before a send fails rather than after.
  const limitReached = !canSendAnotherMessage(sentMessageCount(turns), isDemo);

  async function send(text: string) {
    const trimmed = text.trim();
    if ((!trimmed && !pendingImage) || busy || limitReached) return;
    setError(null);
    setBusy(true);

    // Use the freshly attached image, or fall back to one held from a prior turn.
    const imageToSend = pendingImage ?? heldImage;
    const newTurn: Turn = { role: "user", text: trimmed, imageUrl: pendingImage ?? undefined };
    const history: Message[] = [
      ...turns
        .map((t) => ({ role: t.role, content: t.text }))
        .filter((m) => m.content.trim() !== ""),
      { role: "user", content: trimmed || "[photo attached]" },
    ];
    setTurns((prev) => [...prev, newTurn]);
    setInput("");
    // Move pending → held (clears the preview; the data travels silently).
    if (pendingImage) setHeldImage(pendingImage);
    setPendingImage(null);

    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, attachedImage: imageToSend }),
      });
      // The server's rate-limit message is English (like every API error here),
      // so the widget renders its own localized one from the exact retry time.
      if (response.status === 429) {
        const body = (await response.json().catch(() => ({}))) as {
          retryAfter?: string;
        };
        setError(
          body.retryAfter
            ? t("assistant.rateLimited", {
                minutes: minutesUntil(body.retryAfter),
              })
            : t("assistant.rateLimitedSoon"),
        );
        return;
      }
      if (!response.ok || !response.body) {
        setError(await readError(response, t("assistant.errorGeneric")));
        return;
      }

      // The assistant turn is appended empty and then grown in place as deltas
      // arrive, so the reply appears as it is written.
      let index = -1;
      setTurns((prev) => {
        index = prev.length;
        return [...prev, { role: "assistant", text: "", actions: [] }];
      });

      const update = (fn: (turn: Turn) => Turn) =>
        setTurns((prev) =>
          prev.map((turn, i) => (i === index ? fn(turn) : turn)),
        );

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finished = false;
      let failed = false;

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const { events, rest } = parseSseBuffer(buffer);
        buffer = rest;

        for (const event of events) {
          if (event.type === "text") {
            update((turn) => ({ ...turn, text: turn.text + event.delta }));
          } else if (event.type === "action") {
            // Once the assistant confirms the photo was saved, stop re-sending it.
            if (event.action === "Saved coin photo") setHeldImage(null);
            update((turn) => ({
              ...turn,
              actions: [...(turn.actions ?? []), event.action],
            }));
          } else if (event.type === "error") {
            failed = true;
            setError(t("assistant.errorGeneric"));
          } else if (event.type === "done") {
            finished = true;
          }
        }
      }

      // No terminator means the connection died mid-reply. Say so, rather than
      // leaving a truncated answer looking like a complete one.
      if (!finished && !failed) setError(t("assistant.errorTruncated"));

      setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    } finally {
      setBusy(false);
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    try {
      const dataUrl = await resizeImage(file);
      setPendingImage(dataUrl);
    } catch {
      setError(t("assistant.errorImage"));
    }
  }

  return (
    <div className="chat-widget">
      {open && (
        <div className="chat-panel">
          <div className="chat-panel-header">
            <div className="chat-avatar">◈</div>
            <div className="chat-panel-meta">
              <span className="chat-panel-name">{t("assistant.name")}</span>
              <span className="chat-panel-online">
                <span className="chat-online-dot" />
                {t("assistant.online")}
              </span>
            </div>
            {turns.length > 0 && (
              <button
                type="button"
                className="chat-close-btn"
                onClick={() => { setTurns([]); setPendingImage(null); setHeldImage(null); }}
                aria-label={t("assistant.clearAria")}
                title={t("assistant.clearAria")}
              >
                <IconTrash />
              </button>
            )}
            <button
              type="button"
              className="chat-close-btn"
              onClick={() => setOpen(false)}
              aria-label={t("action.close")}
            >
              <IconClose />
            </button>
          </div>

          <div className="chat-panel-body">
            {turns.length === 0 ? (
              <div className="chat-welcome">
                <p>{t("assistant.welcome")}</p>
                <div className="chat-suggestions">
                  {SUGGESTION_KEYS.map((key) => (
                    <button
                      key={key}
                      type="button"
                      className="chat-suggestion"
                      onClick={() => send(t(key))}
                      disabled={busy}
                    >
                      {t(key)}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <ul className="chat">
                {turns.map((turn, i) => (
                  <li
                    key={i}
                    className={`msg ${turn.role === "user" ? "msg-user" : "msg-assistant"}`}
                  >
                    {turn.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={turn.imageUrl}
                        alt={t("assistant.attachedAlt")}
                        className="chat-msg-image"
                      />
                    )}
                    {turn.text}
                    {turn.actions && turn.actions.length > 0 && (
                      <ul className="actions">
                        {turn.actions.map((action, j) => (
                          <li key={j}>✓ {action}</li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
                {busy && (
                  <li className="msg msg-assistant">
                    <span className="chat-typing">
                      <span />
                      <span />
                      <span />
                    </span>
                  </li>
                )}
              </ul>
            )}
            <div ref={endRef} />
          </div>

          {error && <p className="alert chat-error">{error}</p>}

          {pendingImage && (
            <div className="chat-image-preview">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={pendingImage} alt={t("assistant.pendingAlt")} className="chat-image-thumb" />
              <button
                type="button"
                className="chat-image-remove"
                onClick={() => setPendingImage(null)}
                aria-label={t("assistant.removeImageAria")}
              >
                <IconClose />
              </button>
            </div>
          )}

          {limitReached && (
            <p className="chat-limit-notice" role="status">
              {t(isDemo ? "assistant.limitReachedDemo" : "assistant.limitReached")}
            </p>
          )}
          <form
            onSubmit={(e) => { e.preventDefault(); void send(input); }}
            className="chat-input-bar"
          >
            <input
              type="file"
              ref={fileRef}
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleFileChange}
            />
            <button
              type="button"
              className="chat-attach-btn"
              onClick={() => fileRef.current?.click()}
              disabled={busy || limitReached}
              aria-label={t("assistant.attachAria")}
              title={t("assistant.attachTitle")}
            >
              <IconAttach />
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t("assistant.inputPlaceholder")}
              aria-label={t("assistant.messageAria")}
              disabled={busy || limitReached}
              autoFocus
            />
            <button
              type="submit"
              className="chat-send-btn"
              disabled={busy || limitReached || (input.trim() === "" && !pendingImage)}
              aria-label={t("assistant.sendAria")}
            >
              <IconSend />
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        className="chat-fab"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? t("assistant.closeAria") : t("assistant.openAria")}
        aria-expanded={open}
      >
        {open ? <IconClose /> : <IconChat />}
      </button>
    </div>
  );
}
