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
    <section>
      {turns.length === 0 && (
        <p>
          Ask me to organize your collection — e.g. &ldquo;Create a collection
          called Ancient Rome and add a silver Denarius&rdquo;, or &ldquo;What is
          my most valuable coin?&rdquo;
        </p>
      )}

      <ul style={{ listStyle: "none", padding: 0 }}>
        {turns.map((turn, i) => (
          <li key={i} style={{ margin: "0.75rem 0" }}>
            <strong>{turn.role === "user" ? "You" : "Assistant"}:</strong>{" "}
            <span style={{ whiteSpace: "pre-wrap" }}>{turn.content}</span>
            {turn.actions && turn.actions.length > 0 && (
              <ul>
                {turn.actions.map((action, j) => (
                  <li key={j}>
                    <em>✓ {action}</em>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
        {busy && (
          <li>
            <em>Assistant is thinking…</em>
          </li>
        )}
      </ul>
      <div ref={endRef} />

      {error && <p role="alert">{error}</p>}

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask the assistant…"
          aria-label="Message"
          style={{ width: "70%" }}
          disabled={busy}
        />{" "}
        <button type="submit" disabled={busy || input.trim() === ""}>
          Send
        </button>
      </form>
    </section>
  );
}
