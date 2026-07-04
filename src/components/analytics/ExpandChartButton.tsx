"use client";

import { useRef, type ReactNode } from "react";
import { IconExpand, IconX } from "@/components/ui/icons";
import { useT } from "@/components/i18n/LocaleProvider";

// An expand control for the portfolio charts: a small icon button that opens a
// wide native <dialog> (the app's `.modal` pattern) containing a full-view copy
// of the chart. The enlarged copy is an independent instance passed as
// `children` (rendered with the chart's `inModal` flag), so it manages its own
// range state and re-measures to the modal width. Dependency-free per the
// design-system rule.
export function ExpandChartButton({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  const t = useT();
  const ref = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        type="button"
        className="btn-sm btn-icon"
        aria-label={t("chart.expandAria", { label })}
        title={t("action.expand")}
        onClick={() => ref.current?.showModal()}
      >
        <IconExpand size={16} />
      </button>
      <dialog ref={ref} className="modal modal-chart" aria-label={t("chart.expandedAria", { label })}>
        <form method="dialog" className="chart-modal-close">
          <button type="submit" className="btn-sm btn-icon" aria-label={t("action.close")}>
            <IconX size={16} />
          </button>
        </form>
        {children}
      </dialog>
    </>
  );
}
