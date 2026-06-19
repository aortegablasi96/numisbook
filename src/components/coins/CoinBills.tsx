"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { ALLOWED_BILL_TYPES } from "@/lib/bills";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { IconTrash } from "@/components/ui/icons";
import { readError, NETWORK_ERROR } from "@/lib/http";

type Bill = { id: string; filename: string | null; sizeBytes: number; createdAt: string };

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

// Auction/seller bills (PDF receipts) for a coin: list, upload, view, download,
// and delete. Mirrors CoinImage's client-side flow against /api/coins/[id]/bills.
export function CoinBills({ coinId }: { coinId: string }) {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchBills = useCallback(async () => {
    const res = await fetch(`/api/coins/${coinId}/bills`);
    if (!res.ok) return;
    const { bills } = (await res.json()) as { bills: Bill[] };
    setBills(bills);
    setLoaded(true);
  }, [coinId]);

  useEffect(() => {
    void fetchBills();
  }, [fetchBills]);

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch(`/api/coins/${coinId}/bills`, { method: "POST", body });
      if (!response.ok) {
        setError(await readError(response, "Upload failed."));
        return;
      }
      await fetchBills();
    } catch {
      setError(NETWORK_ERROR);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleRemove(billId: string) {
    setError(null);
    setBusy(true);
    try {
      const response = await fetch(`/api/coins/${coinId}/bills/${billId}`, { method: "DELETE" });
      if (!response.ok) {
        setError(await readError(response, "Couldn’t remove the bill."));
        return;
      }
      setBills((prev) => prev.filter((b) => b.id !== billId));
    } catch {
      setError(NETWORK_ERROR);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card stack coin-bills-card">
      <p className="mono-label" style={{ margin: 0 }}>Bills</p>

      {!loaded ? (
        <span className="skeleton" style={{ height: "2.5rem" }} aria-hidden />
      ) : bills.length === 0 ? (
        <p className="muted" style={{ margin: 0 }}>No bill yet. Upload the auction or seller receipt (PDF).</p>
      ) : (
        <ul className="bill-list">
          {bills.map((bill, i) => {
            const href = `/api/coins/${coinId}/bills/${bill.id}`;
            const name = bill.filename || `Bill ${i + 1}.pdf`;
            return (
              <li key={bill.id} className="bill-row">
                <span className="bill-icon" aria-hidden><IconPdf /></span>
                <span className="bill-info">
                  <a href={href} target="_blank" rel="noopener noreferrer" className="bill-name" title={name}>
                    {name}
                  </a>
                  <span className="bill-meta mono-label">
                    {formatBytes(bill.sizeBytes)} · {bill.createdAt.slice(0, 10)}
                  </span>
                </span>
                <span className="row bill-actions" style={{ gap: "0.4rem" }}>
                  <a href={`${href}?download=1`} download={name} className="btn-sm btn-icon">
                    Download
                  </a>
                  <ConfirmButton
                    className="btn-sm btn-danger btn-icon"
                    disabled={busy}
                    message={`Remove "${name}"?`}
                    confirmLabel="Remove"
                    onConfirm={() => handleRemove(bill.id)}
                  >
                    <IconTrash />
                  </ConfirmButton>
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <div className="row">
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_BILL_TYPES.join(",")}
          onChange={handleUpload}
          disabled={busy}
          aria-label="Coin bill (PDF)"
          style={{ display: "none" }}
        />
        <button
          type="button"
          className="btn-upload-image"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
        >
          <IconUpload />
          {busy ? "Uploading…" : "Add bill (PDF)"}
        </button>
      </div>

      {error && <p className="alert">{error}</p>}
    </section>
  );
}
