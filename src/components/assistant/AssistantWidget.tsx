"use client";

import { useRef, useState } from "react";

const SUGGESTIONS = [
  "What's my most valuable coin?",
  "Show my collection summary",
  "Add a coin to my collection",
];

type Message = { role: "user" | "assistant"; content: string };

type Turn = {
  role: "user" | "assistant";
  text: string;
  imageUrl?: string; // display only — not sent in the messages array
  actions?: string[];
};

async function readError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error ?? "Something went wrong";
  } catch {
    return "Something went wrong";
  }
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

export function AssistantWidget() {
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

  async function send(text: string) {
    const trimmed = text.trim();
    if ((!trimmed && !pendingImage) || busy) return;
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
      if (!response.ok) {
        setError(await readError(response));
        return;
      }
      const { reply, actions } = (await response.json()) as {
        reply: string;
        actions: string[];
      };
      // Once the assistant confirms the photo was saved, stop re-sending it.
      if (actions.includes("Saved coin photo")) setHeldImage(null);
      setTurns((prev) => [...prev, { role: "assistant", text: reply, actions }]);
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
      setError("Could not load image. Please try a different file.");
    }
  }

  return (
    <div className="chat-widget">
      {open && (
        <div className="chat-panel">
          <div className="chat-panel-header">
            <div className="chat-avatar">◈</div>
            <div className="chat-panel-meta">
              <span className="chat-panel-name">NumisBook Assistant</span>
              <span className="chat-panel-online">
                <span className="chat-online-dot" />
                Online
              </span>
            </div>
            {turns.length > 0 && (
              <button
                type="button"
                className="chat-close-btn"
                onClick={() => { setTurns([]); setPendingImage(null); setHeldImage(null); }}
                aria-label="Clear conversation"
                title="Clear conversation"
              >
                <IconTrash />
              </button>
            )}
            <button
              type="button"
              className="chat-close-btn"
              onClick={() => setOpen(false)}
              aria-label="Close"
            >
              <IconClose />
            </button>
          </div>

          <div className="chat-panel-body">
            {turns.length === 0 ? (
              <div className="chat-welcome">
                <p>
                  Hi! I can help you manage your coin collection. What would
                  you like to do?
                </p>
                <div className="chat-suggestions">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className="chat-suggestion"
                      onClick={() => send(s)}
                      disabled={busy}
                    >
                      {s}
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
                        alt="Attached coin"
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
              <img src={pendingImage} alt="Pending attachment" className="chat-image-thumb" />
              <button
                type="button"
                className="chat-image-remove"
                onClick={() => setPendingImage(null)}
                aria-label="Remove image"
              >
                <IconClose />
              </button>
            </div>
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
              disabled={busy}
              aria-label="Attach image"
              title="Attach a coin photo"
            >
              <IconAttach />
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything about your collection…"
              aria-label="Message"
              disabled={busy}
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autoFocus
            />
            <button
              type="submit"
              className="chat-send-btn"
              disabled={busy || (input.trim() === "" && !pendingImage)}
              aria-label="Send"
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
        aria-label={open ? "Close assistant" : "Open assistant"}
        aria-expanded={open}
      >
        {open ? <IconClose /> : <IconChat />}
      </button>
    </div>
  );
}
