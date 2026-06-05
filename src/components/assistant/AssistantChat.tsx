"use client";

import { useRef, useState } from "react";

type Message = { role: "user" | "assistant"; content: string };
type Turn = Message & { actions?: string[] };

async function readError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error ?? "Something went wrong";
  } catch {
    return "Something went wrong";
  }
}

export function AssistantChat() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const text = input.trim();
    if (text === "" || busy) return;
    setError(null);
    setBusy(true);

    const history: Message[] = [
      ...turns.map((t) => ({ role: t.role, content: t.content })),
      { role: "user", content: text },
    ];
    setTurns((prev) => [...prev, { role: "user", content: text }]);
    setInput("");

    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });
      if (!response.ok) {
        setError(await readError(response));
        return;
      }
      const { reply, actions } = (await response.json()) as {
        reply: string;
        actions: string[];
      };
      setTurns((prev) => [
        ...prev,
        { role: "assistant", content: reply, actions },
      ]);
      endRef.current?.scrollIntoView({ behavior: "smooth" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card stack">
      {turns.length === 0 && (
        <p className="muted">
          Ask me to organize your collection — e.g. &ldquo;Create a collection
          called Ancient Rome and add a silver Denarius&rdquo;, or &ldquo;What is
          my most valuable coin?&rdquo;
        </p>
      )}

      {turns.length > 0 && (
        <ul className="chat">
          {turns.map((turn, i) => (
            <li
              key={i}
              className={`msg ${turn.role === "user" ? "msg-user" : "msg-assistant"}`}
            >
              <span className="who">
                {turn.role === "user" ? "You" : "Assistant"}
              </span>
              {turn.content}
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
            <li className="msg msg-assistant muted">Assistant is thinking…</li>
          )}
        </ul>
      )}
      <div ref={endRef} />

      {error && <p className="alert">{error}</p>}

      <form onSubmit={handleSubmit} className="row">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask the assistant…"
          aria-label="Message"
          style={{ flex: 1 }}
          disabled={busy}
        />
        <button
          type="submit"
          className="btn-primary"
          disabled={busy || input.trim() === ""}
        >
          Send
        </button>
      </form>
    </section>
  );
}
