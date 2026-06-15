"use client";

import Link from "next/link";
import { useState } from "react";
import { ConfirmButton } from "@/components/ui/ConfirmButton";

export type CollectionView = {
  id: string;
  name: string;
  coinCount: number;
};

async function readError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error ?? "Something went wrong";
  } catch {
    return "Something went wrong";
  }
}

export function CollectionsManager({
  initialCollections,
}: {
  initialCollections: CollectionView[];
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
      setCollections((prev) => [{ ...collection, coinCount: 0 }, ...prev]);
      setNewName("");
      setShowAddForm(false);
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
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="stack">
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        {collections.length > 1 ? (
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter collections…"
            aria-label="Filter collections"
            style={{ maxWidth: "18rem" }}
          />
        ) : (
          <span />
        )}
        <button
          type="button"
          className="btn-primary btn-sm"
          onClick={() => { setShowAddForm((v) => !v); setNewName(""); setError(null); }}
        >
          {showAddForm ? "Cancel" : "+ New collection"}
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleCreate} className="card toolbar">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Collection name"
            aria-label="New collection name"
            autoFocus
            style={{ flex: 1 }}
          />
          <button
            type="submit"
            className="btn-primary"
            disabled={busy || newName.trim() === ""}
          >
            Create
          </button>
        </form>
      )}

      {error && <p className="alert">{error}</p>}

      {collections.length === 0 ? (
        <p className="empty">No collections yet. Use the button above to create one.</p>
      ) : visible.length === 0 ? (
        <p className="empty">No collections match &ldquo;{filter}&rdquo;.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th className="td-num">Coins</th>
              <th />
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
                <td className="td-actions">
                  {editingId !== collection.id && (
                    <span className="row" style={{ gap: "0.4rem", justifyContent: "flex-end" }}>
                      <button
                        type="button"
                        className="btn-sm"
                        onClick={() => startRename(collection)}
                        disabled={busy}
                      >
                        Rename
                      </button>
                      <ConfirmButton
                        className="btn-sm btn-danger"
                        disabled={busy}
                        message={`Delete "${collection.name}" and all of its coins? This cannot be undone.`}
                        onConfirm={() => handleDelete(collection.id)}
                      >
                        Delete
                      </ConfirmButton>
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
