"use client";

import { useState } from "react";
import { readError, NETWORK_ERROR } from "@/lib/http";
import { useT } from "@/components/i18n/LocaleProvider";

// Profile section of the Settings page: edit the display name. Email is shown
// read-only (it's owned by the OAuth provider). Talks to PATCH /api/user via the
// shared fetch helpers, consistent with the other domain managers.
export function ProfileForm({
  initialName,
  email,
}: {
  initialName: string;
  email: string;
}) {
  const t = useT();
  const [name, setName] = useState(initialName);
  const [saved, setSaved] = useState(initialName);
  const [status, setStatus] = useState<
    { kind: "error" | "ok"; text: string } | null
  >(null);
  const [busy, setBusy] = useState(false);

  const dirty = name.trim().length > 0 && name.trim() !== saved.trim();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus(null);
    setBusy(true);
    try {
      const response = await fetch("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!response.ok) {
        setStatus({ kind: "error", text: await readError(response) });
        return;
      }
      const { name: updated } = (await response.json()) as { name: string };
      setName(updated);
      setSaved(updated);
      setStatus({ kind: "ok", text: t("settings.profile.saved") });
    } catch {
      setStatus({ kind: "error", text: NETWORK_ERROR });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card stack">
      <h2 style={{ margin: 0 }}>{t("settings.profile.heading")}</h2>
      <form onSubmit={handleSubmit} className="stack">
        <div className="field">
          <label htmlFor="displayName" className="mono-label">
            {t("settings.profile.name")}
          </label>
          <input
            id="displayName"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={80}
            required
            autoComplete="name"
          />
        </div>
        <div className="field">
          <span className="mono-label">{t("settings.profile.email")}</span>
          <span className="muted">{email}</span>
        </div>
        {status && (
          <p
            className={status.kind === "error" ? "alert" : "alert alert-ok"}
            role={status.kind === "error" ? "alert" : "status"}
            style={{ margin: 0 }}
          >
            {status.text}
          </p>
        )}
        <div className="row">
          <button
            type="submit"
            className="btn-primary btn-sm"
            disabled={busy || !dirty}
          >
            {busy ? t("action.saving") : t("action.save")}
          </button>
        </div>
      </form>
    </section>
  );
}
