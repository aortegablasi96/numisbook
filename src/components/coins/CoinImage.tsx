"use client";

import { useRef, useState } from "react";
import { ALLOWED_IMAGE_TYPES } from "@/lib/images";

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
    if (!window.confirm("Remove this coin's image?")) return;
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
    <section>
      {hasImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt="Coin"
          style={{ maxWidth: 320, maxHeight: 320, display: "block" }}
          onError={() => setHasImage(false)}
        />
      ) : (
        <p>No image yet.</p>
      )}

      <p>
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_IMAGE_TYPES.join(",")}
          onChange={handleUpload}
          disabled={busy}
          aria-label="Coin image"
        />{" "}
        {hasImage && (
          <button type="button" onClick={handleRemove} disabled={busy}>
            Remove image
          </button>
        )}
      </p>

      {error && <p role="alert">{error}</p>}
    </section>
  );
}
