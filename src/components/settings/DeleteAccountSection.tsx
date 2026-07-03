"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { readError, NETWORK_ERROR } from "@/lib/http";

// Danger zone: permanently delete the account. DELETE /api/user removes all data
// (DB cascade + storage purge, see ADR-013); on success we sign out — the server
// has already destroyed the session, so this just clears the stale cookie and
// returns home.
export function DeleteAccountSection() {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    setError(null);
    setBusy(true);
    try {
      const response = await fetch("/api/user", { method: "DELETE" });
      if (!response.ok) {
        setError(await readError(response));
        setBusy(false);
        return;
      }
      await signOut({ redirectTo: "/" });
    } catch {
      setError(NETWORK_ERROR);
      setBusy(false);
    }
  }

  return (
    <section className="card stack danger-zone">
      <h2 style={{ margin: 0 }}>Danger zone</h2>
      <p className="muted" style={{ margin: 0 }}>
        Deleting your account permanently removes your collections, coins,
        images, invoices, and valuations. This cannot be undone.
      </p>
      {error && (
        <p className="alert" role="alert" style={{ margin: 0 }}>
          {error}
        </p>
      )}
      <div className="row">
        <ConfirmButton
          className="btn-danger btn-sm"
          message="Delete your account and all associated data? This cannot be undone."
          confirmLabel="Delete account"
          disabled={busy}
          onConfirm={handleDelete}
        >
          {busy ? "Deleting…" : "Delete account"}
        </ConfirmButton>
      </div>
    </section>
  );
}
