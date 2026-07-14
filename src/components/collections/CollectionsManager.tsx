"use client";

import Link from "next/link";
import { useState } from "react";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { IconPencil, IconTrash, IconPlus, IconCheck, IconX } from "@/components/ui/icons";
import { readError, NETWORK_ERROR } from "@/lib/http";
import { formatMoney } from "@/lib/currencies";
import { useT } from "@/components/i18n/LocaleProvider";
import { useIsDemo } from "@/components/demo/DemoProvider";

export type CollectionView = {
  id: string;
  name: string;
  coinCount: number;
  totalPaid: number | null; // converted cost (base currency), null when none
  coverCoinId: string | null; // oldest coin with an image (card background)
  coverImageId: string | null;
};

export function CollectionsManager({
  initialCollections,
  baseCurrency,
}: {
  initialCollections: CollectionView[];
  baseCurrency: string | null;
}) {
  const t = useT();
  // The read-only demo tenant renders no create/rename/delete affordances
  // (DDR-007). Cosmetic only — the API refuses the writes regardless (ADR-016).
  const isDemo = useIsDemo();
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
      setCollections((prev) => [
        { ...collection, coinCount: 0, totalPaid: null, coverCoinId: null, coverImageId: null },
        ...prev,
      ]);
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
            placeholder={t("collections.filterPlaceholder")}
            aria-label={t("collections.filterAria")}
            style={{ maxWidth: "220px" }}
          />
        )}
        {!isDemo && (
          <button
            type="button"
            className="btn-primary btn-sm btn-icon"
            onClick={() => { setShowAddForm(true); setNewName(""); setError(null); }}
          >
            <IconPlus size={13} /> {t("collections.new")}
          </button>
        )}
      </div>

      {showAddForm && (
        <form onSubmit={handleCreate} className="create-bar">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t("collections.namePlaceholder")}
            aria-label={t("collections.newNameAria")}
            autoFocus
            style={{ flex: 1 }}
          />
          <button
            type="submit"
            className="btn-sm btn-primary btn-icon"
            disabled={busy || newName.trim() === ""}
          >
            <IconCheck size={12} /> {t("action.create")}
          </button>
          <button
            type="button"
            className="btn-sm btn-ghost btn-icon"
            onClick={() => { setShowAddForm(false); setNewName(""); setError(null); }}
            aria-label={t("action.cancel")}
          >
            <IconX size={12} />
          </button>
        </form>
      )}

      {error && <p className="alert">{error}</p>}

      {collections.length === 0 ? (
        <p className="empty">{t("collections.empty")}</p>
      ) : visible.length === 0 ? (
        <p className="empty">{t("collections.noMatch", { filter })}</p>
      ) : (
        <ul className="collection-grid">
          {visible.map((collection) => {
            const cover =
              collection.coverCoinId && collection.coverImageId
                ? `/api/coins/${collection.coverCoinId}/images/${collection.coverImageId}?w=512`
                : null;
            return (
              <li
                key={collection.id}
                className={`collection-card${cover ? " has-cover" : ""}`}
                style={cover ? { ["--cover" as string]: `url("${cover}")` } : undefined}
              >
                {editingId === collection.id ? (
                  <form onSubmit={saveRename} className="stack" style={{ gap: "0.5rem" }}>
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      aria-label={t("collections.nameAria")}
                      autoFocus
                    />
                    <div className="row" style={{ gap: "0.5rem", justifyContent: "flex-end" }}>
                      <button
                        type="submit"
                        className="btn-sm btn-primary"
                        disabled={busy || editingName.trim() === ""}
                      >
                        {t("action.save")}
                      </button>
                      <button
                        type="button"
                        className="btn-sm"
                        onClick={() => setEditingId(null)}
                        disabled={busy}
                      >
                        {t("action.cancel")}
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <Link href={`/collections/${collection.id}`} className="collection-card-link">
                      <span className="collection-card-panel">
                        <span className="collection-card-name">{collection.name}</span>
                        <span className="collection-card-meta mono-label">
                          {t(
                            collection.coinCount === 1 ? "unit.coinOne" : "unit.coinOther",
                            { count: collection.coinCount },
                          )}
                          {collection.totalPaid !== null && baseCurrency
                            ? ` · ${formatMoney(collection.totalPaid, baseCurrency)}`
                            : ""}
                        </span>
                      </span>
                    </Link>
                    {!isDemo && (
                      <div className="row row-actions collection-card-actions" style={{ gap: "0.4rem" }}>
                        <button
                          type="button"
                          className="btn-sm btn-icon"
                          onClick={() => startRename(collection)}
                          disabled={busy}
                          aria-label={t("collections.renameAria", { name: collection.name })}
                        >
                          <IconPencil /> {t("action.rename")}
                        </button>
                        <ConfirmButton
                          className="btn-sm btn-danger btn-icon"
                          disabled={busy}
                          message={t("collections.deleteConfirm", { name: collection.name })}
                          onConfirm={() => handleDelete(collection.id)}
                        >
                          <IconTrash /> {t("action.delete")}
                        </ConfirmButton>
                      </div>
                    )}
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
