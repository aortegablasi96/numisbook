"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { ALLOWED_IMAGE_TYPES } from "@/lib/images";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { readError, NETWORK_ERROR } from "@/lib/http";
import { useT } from "@/components/i18n/LocaleProvider";
import { useIsDemo } from "@/components/demo/DemoProvider";

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

export function CoinImage({ coinId }: { coinId: string }) {
  const t = useT();
  const isDemo = useIsDemo();
  const [imageIds, setImageIds] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lightboxRef = useRef<HTMLDialogElement>(null);

  const fetchImages = useCallback(async () => {
    const res = await fetch(`/api/coins/${coinId}/images`);
    if (!res.ok) return;
    const { images } = (await res.json()) as { images: { id: string }[] };
    setImageIds(images.map((i) => i.id));
    setLoaded(true);
  }, [coinId]);

  useEffect(() => {
    void fetchImages();
  }, [fetchImages]);

  const currentId = imageIds[currentIndex];
  const src = currentId ? `/api/coins/${coinId}/images/${currentId}` : null;
  const hasImages = imageIds.length > 0;
  const hasMultiple = imageIds.length > 1;

  const openLightbox = useCallback(() => lightboxRef.current?.showModal(), []);
  const closeLightboxOnBackdrop = useCallback(
    (e: React.MouseEvent<HTMLDialogElement>) => {
      if (e.target === lightboxRef.current) lightboxRef.current?.close();
    },
    [],
  );

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch(`/api/coins/${coinId}/images`, {
        method: "POST",
        body,
      });
      if (!response.ok) {
        setError(await readError(response, t("upload.failed")));
        return;
      }
      const { id: newId } = (await response.json()) as { id: string };
      setImageIds((prev) => {
        const updated = [...prev, newId];
        setCurrentIndex(updated.length - 1);
        return updated;
      });
    } catch {
      setError(NETWORK_ERROR);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleRemove() {
    if (!currentId) return;
    setError(null);
    setBusy(true);
    try {
      const response = await fetch(`/api/coins/${coinId}/images/${currentId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        setError(await readError(response, t("coinImage.removeError")));
        return;
      }
      const removedId = currentId;
      setImageIds((prev) => {
        const updated = prev.filter((id) => id !== removedId);
        setCurrentIndex((idx) => Math.min(idx, Math.max(0, updated.length - 1)));
        return updated;
      });
    } catch {
      setError(NETWORK_ERROR);
    } finally {
      setBusy(false);
    }
  }

  if (!loaded)
    return (
      <section className="coin-image-card" aria-busy="true">
        <div className="coin-photo-wrap">
          <span
            className="skeleton"
            style={{ width: "100%", height: "100%", minHeight: "12rem" }}
            aria-hidden
          />
        </div>
      </section>
    );

  return (
    <section className="coin-image-card">
      <div className="coin-photo-wrap">
        {hasImages && src ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={t("coinImage.pictureAlt", { n: currentIndex + 1 })}
              className="coin-photo"
              key={currentId}
            />
            <button
              type="button"
              className="coin-photo-expand"
              onClick={openLightbox}
              aria-label={t("coinImage.expandAria")}
              title={t("coinImage.expandAria")}
            >
              <IconExpand />
            </button>
            <dialog
              ref={lightboxRef}
              className="lightbox-dialog"
              onClick={closeLightboxOnBackdrop}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={t("coinImage.fullAlt")} />
            </dialog>
          </>
        ) : (
          <p className="muted" style={{ margin: 0 }}>
            {t("coinImage.none")}
          </p>
        )}
      </div>

      {/* Selectable thumbnail strip — pick which picture to view. Only useful
          with more than one image. */}
      {hasMultiple && (
        <div className="coin-thumbs" role="group" aria-label={t("coinImage.thumbsAria")}>
          {imageIds.map((id, i) => (
            <button
              key={id}
              type="button"
              className={`coin-thumb${i === currentIndex ? " is-active" : ""}`}
              onClick={() => setCurrentIndex(i)}
              aria-label={t("coinImage.showPictureAria", { n: i + 1 })}
              aria-current={i === currentIndex}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/coins/${coinId}/images/${id}?w=160`}
                alt=""
                className="coin-thumb-img"
              />
            </button>
          ))}
        </div>
      )}

      {hasImages && (
        <p className="coin-photo-caption mono-label">
          {hasMultiple
            ? t("coinImage.captionOf", { n: currentIndex + 1, total: imageIds.length })
            : t("coinImage.caption", { n: currentIndex + 1 })}
        </p>
      )}

      {/* The demo shows the photographs (the carousel is much of the appeal) but
          offers no way to add to or remove from the shared set. */}
      {!isDemo && (
        <div className="row">
          <input
            ref={inputRef}
            type="file"
            accept={ALLOWED_IMAGE_TYPES.join(",")}
            onChange={handleUpload}
            disabled={busy}
            aria-label={t("coinImage.fileAria")}
            style={{ display: "none" }}
          />
          <button
            type="button"
            className="btn-upload-image"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
          >
            <IconUpload />
            {t("coinImage.addPhoto")}
          </button>
          {hasImages && (
            <ConfirmButton
              className="btn-sm btn-danger"
              disabled={busy}
              message={t("coinImage.removeConfirm")}
              confirmLabel={t("action.remove")}
              onConfirm={handleRemove}
            >
              {t("action.remove")}
            </ConfirmButton>
          )}
        </div>
      )}

      {error && <p className="alert">{error}</p>}
    </section>
  );
}
