"use client";

import { useEffect, useRef, useState } from "react";
import { useT } from "@/components/i18n/LocaleProvider";
import { IconUpload, IconX } from "@/components/ui/icons";
import { readError, NETWORK_ERROR } from "@/lib/http";
import { IMPORT_ACCEPT } from "@/lib/csv-import";

/** Mirrors `ImportReport` in coin.service — the shape the route returns. */
type ImportReport = {
  rowsRead: number;
  toAdd: number;
  added: number;
  invalidRows: number;
  errors: { row: number; column: string | null; message: string }[];
};

/**
 * CSV import: choose a file → read the preview → confirm.
 *
 * **The preview is the feature.** Import is a batch mutation with no practical
 * undo, and — because the CSV contract carries no coin id (ADR-017 addendum §14)
 * — it is *additive*: importing your own export a second time gives you two of
 * every coin. Nothing here can prevent that. What it can do is make it visible
 * before the write, which is why the commit button is labelled with its own count
 * ("Add 37 coins") and why the receiving collection is named. A collector who
 * already has those coins should notice at that button.
 *
 * An inline panel rather than a modal: the error list can be long, a modal would
 * trap it in a viewport-sized box on a phone, and this is the slot (and the
 * construction) the add/edit coin form already uses.
 *
 * The same file is uploaded twice — once to preview, once to commit — and the
 * server re-validates on commit. See the route: a preview token would be a claim
 * about the past that the commit would have to trust.
 */
export function ImportCsvPanel({
  collectionId,
  collectionName,
  onClose,
  onImported,
}: {
  collectionId: string;
  collectionName: string;
  onClose: () => void;
  /** Committed successfully — the manager reloads the list and facets. */
  onImported: () => void | Promise<void>;
}) {
  const t = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [committed, setCommitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The panel is an inline region, not a <dialog>, so focus is moved explicitly
  // rather than inherited. Returning it to the trigger is the manager's job.
  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  async function send(chosen: File, commit: boolean) {
    setError(null);
    setBusy(true);
    try {
      const body = new FormData();
      body.append("file", chosen);
      body.append("commit", String(commit));
      const response = await fetch(
        `/api/collections/${collectionId}/coins/import`,
        { method: "POST", body },
      );
      if (!response.ok) {
        setError(await readError(response, t("import.failed")));
        return;
      }
      const next = (await response.json()) as ImportReport;
      setReport(next);
      if (commit) {
        setCommitted(true);
        await onImported();
      }
    } catch {
      setError(NETWORK_ERROR);
    } finally {
      setBusy(false);
    }
  }

  async function handleChoose(event: React.ChangeEvent<HTMLInputElement>) {
    const chosen = event.target.files?.[0];
    // Reset the input so re-picking the same file after a cancel still fires.
    if (inputRef.current) inputRef.current.value = "";
    if (!chosen) return;
    setFile(chosen);
    setReport(null);
    setCommitted(false);
    await send(chosen, false);
  }

  const showPreview = report !== null && !committed;

  return (
    <section
      ref={panelRef}
      tabIndex={-1}
      aria-labelledby="import-csv-title"
      className="card stack"
    >
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <h2 id="import-csv-title" style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}>
          {t("import.title")}
        </h2>
        <button
          type="button"
          className="btn-sm btn-icon"
          onClick={onClose}
          disabled={busy}
          aria-label={t("action.close")}
        >
          <IconX />
        </button>
      </div>

      {/* Choose a file. The input is hidden and the button owns the interaction,
          exactly as CoinInvoices / CoinImage do. */}
      {report === null && (
        <div className="stack" style={{ gap: "0.5rem" }}>
          <p className="muted" style={{ margin: 0 }}>
            {t("import.intro", { collection: collectionName })}
          </p>
          <input
            ref={inputRef}
            type="file"
            accept={IMPORT_ACCEPT}
            onChange={handleChoose}
            disabled={busy}
            aria-label={t("import.fileAria")}
            style={{ display: "none" }}
          />
          <div className="row">
            <button
              type="button"
              className="btn-upload-image"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
            >
              <IconUpload />
              {busy ? t("import.reading") : t("import.chooseFile")}
            </button>
          </div>
        </div>
      )}

      {busy && report === null && (
        <span className="skeleton" style={{ height: "2.5rem" }} aria-hidden />
      )}

      {/* The summary is announced: parsing is async, and a screen-reader user
          must hear the counts without hunting for them. */}
      <div aria-live="polite" className="stack" style={{ gap: "0.4rem" }}>
        {report !== null && (
          <>
            <p className="mono-label" style={{ margin: 0 }}>
              {file?.name} · {t("import.rowsRead", { n: report.rowsRead })}
            </p>
            <p style={{ margin: 0 }}>
              {committed
                ? t("import.added", { n: report.added, collection: collectionName })
                : t("import.willAdd", { n: report.toAdd, collection: collectionName })}
            </p>
            {/* Stated even at zero: its absence is otherwise indistinguishable
                from a UI that forgot to check. */}
            <p className="muted" style={{ margin: 0 }}>
              {t("import.skipped", { n: report.invalidRows })}
            </p>
          </>
        )}
      </div>

      {report !== null && report.errors.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">{t("import.colRow")}</th>
                <th scope="col">{t("import.colColumn")}</th>
                <th scope="col">{t("import.colReason")}</th>
              </tr>
            </thead>
            <tbody>
              {report.errors.map((e, i) => (
                <tr key={`${e.row}-${e.column}-${i}`}>
                  <td>{e.row}</td>
                  {/* The English contract header, not a localized label: it is
                      what the collector's file literally contains (ADR-017 §4). */}
                  <td className="mono-label">{e.column ?? "—"}</td>
                  <td>{e.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {report.invalidRows > report.errors.length && (
            <p className="muted" style={{ margin: "0.4rem 0 0" }}>
              {t("import.andMore", { n: report.invalidRows - report.errors.length })}
            </p>
          )}
        </div>
      )}

      {showPreview && (
        <div className="row" style={{ gap: "0.5rem" }}>
          {/* Labelled with the count: the irreversible action states its own
              scope at the moment of clicking. */}
          <button
            type="button"
            className="btn-primary btn-sm"
            disabled={busy || report.toAdd === 0}
            onClick={() => file && send(file, true)}
          >
            {busy ? t("import.adding") : t("import.commit", { n: report.toAdd })}
          </button>
          <button type="button" className="btn-sm" onClick={onClose} disabled={busy}>
            {t("action.cancel")}
          </button>
        </div>
      )}

      {committed && (
        <div className="row">
          <button type="button" className="btn-sm" onClick={onClose}>
            {t("action.close")}
          </button>
        </div>
      )}

      {error && <p className="alert">{error}</p>}
    </section>
  );
}
