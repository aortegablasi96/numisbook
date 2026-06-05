"use client";

import Link from "next/link";
import { useState } from "react";

// Client-side shape: the server passes domain rows whose dates are serialized.
export type CollectionView = {
  id: string;
  name: string;
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
  const [collections, setCollections] =
    useState<CollectionView[]>(initialCollections);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
      const { collection } = (await response.json()) as {
        collection: CollectionView;
      };
      setCollections((prev) => [collection, ...prev]);
      setNewName("");
    } finally {
      setBusy(false);
    }
  }

  async function handleRename(id: string, current: string) {
    const next = window.prompt("Rename collection", current);
    if (next === null || next.trim() === current) return;
    setError(null);
    setBusy(true);
    try {
      const response = await fetch(`/api/collections/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: next }),
      });
      if (!response.ok) {
        setError(await readError(response));
        return;
      }
      const { collection } = (await response.json()) as {
        collection: CollectionView;
      };
      setCollections((prev) =>
        prev.map((c) => (c.id === id ? collection : c)),
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setError(null);
    setBusy(true);
    try {
      const response = await fetch(`/api/collections/${id}`, {
        method: "DELETE",
      });
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
    <section>
      <form onSubmit={handleCreate}>
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New collection name"
          aria-label="New collection name"
        />
        <button type="submit" disabled={busy || newName.trim() === ""}>
          Add
        </button>
      </form>

      {error && <p role="alert">{error}</p>}

      {collections.length === 0 ? (
        <p>No collections yet. Create your first one above.</p>
      ) : (
        <ul>
          {collections.map((collection) => (
            <li key={collection.id}>
              <Link href={`/collections/${collection.id}`}>
                {collection.name}
              </Link>{" "}
              <button
                type="button"
                onClick={() => handleRename(collection.id, collection.name)}
                disabled={busy}
              >
                Rename
              </button>{" "}
              <button
                type="button"
                onClick={() => handleDelete(collection.id, collection.name)}
                disabled={busy}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
