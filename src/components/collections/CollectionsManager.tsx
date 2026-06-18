"use client";

import Link from "next/link";
import { useState } from "react";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { IconPencil, IconTrash, IconPlus, IconCheck, IconX } from "@/components/ui/icons";
import { readError, NETWORK_ERROR } from "@/lib/http";
import { formatMoney } from "@/lib/currencies";

export type CollectionView = {
  id: string;
  name: string;
  coinCount: number;
  totalPaid: number | null; // converted cost (base currency), null when none
};

export function CollectionsManager({
  initialCollections,
  baseCurrency,
}: {
  initialCollections: CollectionView[];
  baseCurrency: string | null;
}) {
  const [collections, setCollections] = useState<CollectionView[]>(initialCollections);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [filter, setFilter] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const visible = collections.filter((c) =>
    c.name.toLowerCase().includes(filter.trim().toLowerCase()),
  );

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const response = await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
      });
      if (!response.ok) {
        setError(await readError(response));
        return;
      }
      // The API returns the new collection without a count; it has no coins yet.
      const { collection } = (await response.json()) as {
        collection: { id: string; name: string };
      };
      setCollections((prev) => [{ ...collection, coinCount: 0, totalPaid: null }, ...prev]);
      setNewName("");
      setShowAddForm(false);
    } catch {
      setError(NETWORK_ERROR);
    } finally {
      setBusy(false);
    }
  }

  function startRename(collection: CollectionView) {
    setEditingId(collection.id);
    setEditingName(collection.name);
    setError(null);
  }

  async function saveRename(event: React.FormEvent) {
    event.preventDefault();
    if (!editingId) return;
    setError(null);
    setBusy(true);
    try {
      const response = await fetch(`/api/collections/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editingName }),
      });
      if (!response.ok) {
        setError(await readError(response));
        return;
      }
      // Rename returns name only; keep each row's existing coin count.
      const { collection } = (await response.json()) as {
        collection: { id: string; name: string };
      };
      setCollections((prev) =>
        prev.map((c) => (c.id === collection.id ? { ...c, name: collection.name } : c)),
      );
      setEditingId(null);
      setEditingName("");
    } catch {
      setError(NETWORK_ERROR);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string) {
    setError(null);
    setBusy(true);
    try {
      const response = await fetch(`/api/collections/${id}`, { method: "DELETE" });
      if (!response.ok) {
        setError(await readError(response));
        return;
      }
      setCollections((prev) => prev.filter((c) => c.id !== id));
    } catch {
      setError(NETWORK_ERROR);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="stack">
      <div className="row" style={{ gap: "0.75rem" }}>
        {collections.length > 1 && (
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter collections…"
            aria-label="Filter collections"
            style={{ maxWidth: "220px" }}
          />
        )}
        <button
          type="button"
          className="btn-primary btn-sm btn-icon"
          onClick={() => { setShowAddForm(true); setNewName(""); setError(null); }}
        >
          <IconPlus size={13} /> New collection
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleCreate} className="create-bar">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Collection name…"
            aria-label="New collection name"
            autoFocus
            style={{ flex: 1 }}
          />
          <button
            type="submit"
            className="btn-sm btn-primary btn-icon"
            disabled={busy || newName.trim() === ""}
          >
            <IconCheck size={12} /> Create
          </button>
          <button
            type="button"
            className="btn-sm btn-ghost btn-icon"
            onClick={() => { setShowAddForm(false); setNewName(""); setError(null); }}
            aria-label="Cancel"
          >
            <IconX size={12} />
          </button>
        </form>
      )}

      {error && <p className="alert">{error}</p>}

      {collections.length === 0 ? (
        <p className="empty">No collections yet. Use the button above to create one.</p>
      ) : visible.length === 0 ? (
        <p className="empty">No collections match &ldquo;{filter}&rdquo;.</p>
      ) : (
        <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th className="td-num">Coins</th>
              <th className="td-num">Paid</th>
              <th>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.map((collection) => (
              <tr key={collection.id}>
                <td>
                  {editingId === collection.id ? (
                    <form onSubmit={saveRename} className="row" style={{ gap: "0.5rem" }}>
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        aria-label="Collection name"
                        autoFocus
                        style={{ flex: 1 }}
                      />
                      <button
                        type="submit"
                        className="btn-sm btn-primary"
                        disabled={busy || editingName.trim() === ""}
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        className="btn-sm"
                        onClick={() => setEditingId(null)}
                        disabled={busy}
                      >
                        Cancel
                      </button>
                    </form>
                  ) : (
                    <Link href={`/collections/${collection.id}`}>
                      {collection.name}
                    </Link>
                  )}
                </td>
                <td className="td-num muted">
                  {collection.coinCount}
                </td>
                <td className="td-num muted">
                  {collection.totalPaid !== null && baseCurrency
                    ? formatMoney(collection.totalPaid, baseCurrency)
                    : "—"}
                </td>
                <td className="td-actions">
                  {editingId !== collection.id && (
                    <span className="row row-actions" style={{ gap: "0.4rem", justifyContent: "flex-end" }}>
                      <button
                        type="button"
                        className="btn-sm btn-icon"
                        onClick={() => startRename(collection)}
                        disabled={busy}
                      >
                        <IconPencil /> Rename
                      </button>
                      <ConfirmButton
                        className="btn-sm btn-danger btn-icon"
                        disabled={busy}
                        message={`Delete "${collection.name}" and all of its coins? This cannot be undone.`}
                        onConfirm={() => handleDelete(collection.id)}
                      >
                        <IconTrash /> Delete
                      </ConfirmButton>
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
    </section>
  );
}
