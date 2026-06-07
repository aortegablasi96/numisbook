"use client";

import { useRef, useState, useCallback } from "react";
import { ALLOWED_IMAGE_TYPES } from "@/lib/images";
import { ConfirmButton } from "@/components/ui/ConfirmButton";

async function readError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error ?? "Upload failed";
  } catch {
    return "Upload failed";
  }
}

function IconExpand() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
    </svg>
  );
}

function IconUpload() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z" />
    </svg>
  );
}

// Display, upload, and remove a coin's image. The <img> loads the owner-scoped
// endpoint; `version` cache-busts after a change, and `hasImage` is driven by the
// image's load/error events (no separate existence query needed).
export function CoinImage({ coinId }: { coinId: string }) {
  const [version, setVersion] = useState(0);
  const [hasImage, setHasImage] = useState(true); // assume until onError says otherwise
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lightboxRef = useRef<HTMLDialogElement>(null);

  const openLightbox = useCallback(() => lightboxRef.current?.showModal(), []);
  const closeLightboxOnBackdrop = useCallback((e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === lightboxRef.current) lightboxRef.current?.close();
  }, []);

  const src = `/api/coins/${coinId}/image?v=${version}`;

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch(`/api/coins/${coinId}/image`, {
        method: "POST",
        body,
      });
      if (!response.ok) {
        setError(await readError(response));
        return;
      }
      setHasImage(true);
      setVersion((v) => v + 1);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleRemove() {
    setError(null);
    setBusy(true);
    try {
      const response = await fetch(`/api/coins/${coinId}/image`, {
        method: "DELETE",
      });
      if (!response.ok) {
        setError(await readError(response));
        return;
      }
      setHasImage(false);
      setVersion((v) => v + 1);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card coin-image-card">
      <div className="coin-photo-wrap">
        {hasImage ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt="Coin"
              className="coin-photo"
              onError={() => setHasImage(false)}
            />
            <button
              type="button"
              className="coin-photo-expand"
              onClick={openLightbox}
              aria-label="Expand image"
              title="Expand image"
            >
              <IconExpand />
            </button>
            <dialog
              ref={lightboxRef}
              className="lightbox-dialog"
              onClick={closeLightboxOnBackdrop}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="Coin (full size)" />
            </dialog>
          </>
        ) : (
          <p className="muted" style={{ margin: 0 }}>
            No image yet.
          </p>
        )}
      </div>

      <div className="row">
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_IMAGE_TYPES.join(",")}
          onChange={handleUpload}
          disabled={busy}
          aria-label="Coin image"
          style={{ display: "none" }}
        />
        <button
          type="button"
          className="btn-upload-image"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
        >
          <IconUpload />
          {hasImage ? "Replace photo" : "Add photo"}
        </button>
        {hasImage && (
          <ConfirmButton
            className="btn-sm btn-danger"
            disabled={busy}
            message="Remove this coin's image?"
            confirmLabel="Remove"
            onConfirm={handleRemove}
          >
            Remove
          </ConfirmButton>
        )}
      </div>

      {error && <p className="alert">{error}</p>}
    </section>
  );
}
