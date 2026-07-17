"use client";

import { useRef, useState } from "react";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { IconUpload } from "@/components/ui/icons";
import { readError, NETWORK_ERROR } from "@/lib/http";
import { useT } from "@/components/i18n/LocaleProvider";

/** Mirrors `RestoreSummary` in @/lib/archive — what the restore route returns. */
type RestoreSummary = {
  collections: number;
  coins: number;
  valuations: number;
  images: number;
  invoices: number;
};

/**
 * Data portability (ADR-017 addendum, slice 3): download a full-account archive,
 * and — for a real tenant — restore one.
 *
 * Download is a read, so it is offered to everyone including the read-only demo
 * (ADR-017 §10). Restore writes, so `canRestore` is false for the demo tenant and
 * the whole restore control is withheld (the server would refuse it anyway; this
 * removes the affordance, DDR-007).
 *
 * Restore is **additive** and non-destructive, so unlike CSV import there is no
 * preview phase — a `<ConfirmButton>` stating that it *adds* is the whole
 * safeguard, and the result summary reports what was created.
 */
export function AccountDataSection({ canRestore }: { canRestore: boolean }) {
  const t = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<RestoreSummary | null>(null);

  // A GET to an attachment endpoint downloads without navigating away, so the
  // button can stay a real <button> (fully themed) rather than a bare link.
  function download() {
    window.location.href = "/api/account/archive";
  }

  function handleChoose(event: React.ChangeEvent<HTMLInputElement>) {
    const chosen = event.target.files?.[0];
    // Reset so re-picking the same file after a cancel still fires onChange.
    if (inputRef.current) inputRef.current.value = "";
    if (!chosen) return;
    setFile(chosen);
    setSummary(null);
    setError(null);
  }

  async function restore() {
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/account/restore", { method: "POST", body });
      if (!response.ok) {
        setError(await readError(response));
        return;
      }
      setSummary((await response.json()) as RestoreSummary);
      setFile(null);
    } catch {
      setError(NETWORK_ERROR);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card stack">
      <h2 style={{ margin: 0 }}>{t("settings.data.heading")}</h2>
      <p className="muted" style={{ margin: 0 }}>
        {t("settings.data.body")}
      </p>

      <div className="row">
        <button type="button" className="btn-sm" onClick={download}>
          {t("settings.data.download")}
        </button>
      </div>

      {canRestore && (
        <div className="stack" style={{ gap: "0.5rem" }}>
          <label className="mono-label" style={{ margin: 0 }}>
            {t("settings.data.restore.label")}
          </label>
          <p className="muted" style={{ margin: 0 }}>
            {t("settings.data.restore.help")}
          </p>

          <input
            ref={inputRef}
            type="file"
            accept=".zip,application/zip"
            onChange={handleChoose}
            disabled={busy}
            aria-label={t("settings.data.restore.label")}
            style={{ display: "none" }}
          />

          {file ? (
            <div className="row" style={{ gap: "0.5rem", alignItems: "center" }}>
              <span className="mono-label">{file.name}</span>
              <ConfirmButton
                className="btn-primary btn-sm"
                message={t("settings.data.restore.confirm")}
                confirmLabel={t("settings.data.restore.button")}
                disabled={busy}
                onConfirm={restore}
              >
                {busy ? t("settings.data.restoring") : t("settings.data.restore.button")}
              </ConfirmButton>
              <button
                type="button"
                className="btn-sm"
                onClick={() => setFile(null)}
                disabled={busy}
              >
                {t("action.cancel")}
              </button>
            </div>
          ) : (
            <div className="row">
              <button
                type="button"
                className="btn-upload-image"
                onClick={() => inputRef.current?.click()}
                disabled={busy}
              >
                <IconUpload />
                {t("settings.data.restore.button")}
              </button>
            </div>
          )}

          {/* Announced: the restore is async and a screen-reader user must hear
              the outcome without hunting for it. */}
          <div aria-live="polite">
            {summary && (
              <p className="alert" role="status" style={{ margin: 0 }}>
                {t("settings.data.restore.success", {
                  collections: summary.collections,
                  coins: summary.coins,
                  valuations: summary.valuations,
                  images: summary.images,
                  invoices: summary.invoices,
                })}
              </p>
            )}
          </div>
          {error && (
            <p className="alert" role="alert" style={{ margin: 0 }}>
              {error}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
