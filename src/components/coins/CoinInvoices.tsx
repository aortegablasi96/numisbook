"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { ALLOWED_INVOICE_TYPES } from "@/lib/invoices";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { IconTrash } from "@/components/ui/icons";
import { readError, NETWORK_ERROR } from "@/lib/http";
import { useT } from "@/components/i18n/LocaleProvider";
import { useIsDemo } from "@/components/demo/DemoProvider";

type Invoice = { id: string; filename: string | null; sizeBytes: number; createdAt: string };

function IconUpload() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z" />
    </svg>
  );
}

function IconPdf() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
    </svg>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Auction/seller invoices (PDF receipts) for a coin: list, upload, view, download,
// and delete. Mirrors CoinImage's client-side flow against /api/coins/[id]/invoices.
export function CoinInvoices({ coinId }: { coinId: string }) {
  const t = useT();
  const isDemo = useIsDemo();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchInvoices = useCallback(async () => {
    const res = await fetch(`/api/coins/${coinId}/invoices`);
    if (!res.ok) return;
    const { invoices } = (await res.json()) as { invoices: Invoice[] };
    setInvoices(invoices);
    setLoaded(true);
  }, [coinId]);

  useEffect(() => {
    void fetchInvoices();
  }, [fetchInvoices]);

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch(`/api/coins/${coinId}/invoices`, { method: "POST", body });
      if (!response.ok) {
        setError(await readError(response, t("upload.failed")));
        return;
      }
      await fetchInvoices();
    } catch {
      setError(NETWORK_ERROR);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleRemove(invoiceId: string) {
    setError(null);
    setBusy(true);
    try {
      const response = await fetch(`/api/coins/${coinId}/invoices/${invoiceId}`, { method: "DELETE" });
      if (!response.ok) {
        setError(await readError(response, t("invoices.removeError")));
        return;
      }
      setInvoices((prev) => prev.filter((inv) => inv.id !== invoiceId));
    } catch {
      setError(NETWORK_ERROR);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card stack coin-invoices-card">
      <p className="mono-label" style={{ margin: 0 }}>{t("invoices.title")}</p>

      {!loaded ? (
        <span className="skeleton" style={{ height: "2.5rem" }} aria-hidden />
      ) : invoices.length === 0 ? (
        <p className="muted" style={{ margin: 0 }}>{t("invoices.empty")}</p>
      ) : (
        <ul className="invoice-list">
          {invoices.map((invoice, i) => {
            const href = `/api/coins/${coinId}/invoices/${invoice.id}`;
            const name = invoice.filename || t("invoices.fallbackName", { n: i + 1 });
            return (
              <li key={invoice.id} className="invoice-row">
                <span className="invoice-icon" aria-hidden><IconPdf /></span>
                <span className="invoice-info">
                  <a href={href} target="_blank" rel="noopener noreferrer" className="invoice-name" title={name}>
                    {name}
                  </a>
                  <span className="invoice-meta mono-label">
                    {formatBytes(invoice.sizeBytes)} · {invoice.createdAt.slice(0, 10)}
                  </span>
                </span>
                {/* A demo visitor can still open and download the receipt — only
                    removing it is withheld. */}
                <span className="row invoice-actions" style={{ gap: "0.4rem" }}>
                  <a href={`${href}?download=1`} download={name} className="btn-sm btn-icon">
                    {t("action.download")}
                  </a>
                  {!isDemo && (
                    <ConfirmButton
                      className="btn-sm btn-danger btn-icon"
                      disabled={busy}
                      message={t("invoices.removeConfirm", { name })}
                      confirmLabel={t("action.remove")}
                      onConfirm={() => handleRemove(invoice.id)}
                    >
                      <IconTrash />
                    </ConfirmButton>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {!isDemo && (
        <div className="row">
          <input
            ref={inputRef}
            type="file"
            accept={ALLOWED_INVOICE_TYPES.join(",")}
            onChange={handleUpload}
            disabled={busy}
            aria-label={t("invoices.fileAria")}
            style={{ display: "none" }}
          />
          <button
            type="button"
            className="btn-upload-image"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
          >
            <IconUpload />
            {busy ? t("invoices.uploading") : t("invoices.add")}
          </button>
        </div>
      )}

      {error && <p className="alert">{error}</p>}
    </section>
  );
}
