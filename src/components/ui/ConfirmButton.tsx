"use client";

import { useRef } from "react";
import { useT } from "@/components/i18n/LocaleProvider";

// A button that opens a styled confirmation dialog (native <dialog>) before
// running `onConfirm`. Replaces window.confirm for destructive actions.
export function ConfirmButton({
  onConfirm,
  message,
  confirmLabel,
  children,
  className,
  disabled,
  title,
}: {
  onConfirm: () => void;
  message: string;
  confirmLabel?: string;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  title?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const t = useT();

  return (
    <>
      <button
        type="button"
        className={className}
        disabled={disabled}
        title={title}
        onClick={() => ref.current?.showModal()}
      >
        {children}
      </button>
      <dialog ref={ref} className="modal">
        <form method="dialog" className="stack">
          <p style={{ margin: 0 }}>{message}</p>
          <div className="row" style={{ justifyContent: "flex-end" }}>
            <button type="submit" value="cancel">
              {t("action.cancel")}
            </button>
            <button
              type="submit"
              value="confirm"
              className="btn-danger"
              onClick={() => onConfirm()}
            >
              {confirmLabel ?? t("action.delete")}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
