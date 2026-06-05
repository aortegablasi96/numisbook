"use client";

import { useRef, useState } from "react";
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

// Display, upload, and remove a coin's image. The <img> loads the owner-scoped
// endpoint; `version` cache-busts after a change, and `hasImage` is driven by the
// image's load/error events (no separate existence query needed).
export function CoinImage({ coinId }: { coinId: string }) {
  const [version, setVersion] = useState(0);
  const [hasImage, setHasImage] = useState(true); // assume until onError says otherwise
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
    <section className="card stack">
      {hasImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt="Coin"
          className="coin-photo"
          onError={() => setHasImage(false)}
        />
      ) : (
        <p className="muted" style={{ margin: 0 }}>
          No image yet.
        </p>
      )}

      <div className="row">
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_IMAGE_TYPES.join(",")}
          onChange={handleUpload}
          disabled={busy}
          aria-label="Coin image"
        />
        {hasImage && (
          <ConfirmButton
            className="btn-sm btn-danger"
            disabled={busy}
            message="Remove this coin's image?"
            confirmLabel="Remove"
            onConfirm={handleRemove}
          >
            Remove image
          </ConfirmButton>
        )}
      </div>

      {error && <p className="alert">{error}</p>}
    </section>
  );
}
