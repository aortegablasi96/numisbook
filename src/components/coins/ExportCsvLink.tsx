"use client";

import { useT } from "@/components/i18n/LocaleProvider";
import { IconDownload } from "@/components/ui/icons";
import { buildExportParams, type CoinFilterState } from "./coin-filters";

/**
 * The CSV export control, shared by both coin surfaces (ADR-017).
 *
 * A **link, not a button**: the browser then handles the download natively — it
 * streams it, shows its own progress, and survives a slow response with no
 * spinner state to invent — and middle-click / open-in-new-tab behave as they
 * look. A fetch → blob → object-URL path would also hold a second copy of the
 * file in memory for no gain.
 *
 * No `download` attribute: the route already sends `Content-Disposition:
 * attachment`, which both forces the download and names the file. Adding one here
 * would be a second, client-side opinion about the filename.
 *
 * Always enabled, including at zero results: a header-only CSV is a valid
 * template, and a disabled link is an accessibility wart (links have no
 * `disabled`, so it would mean faking one).
 */
export function ExportCsvLink({
  href,
  filters,
}: {
  /** The export endpoint for this surface, without a query string. */
  href: string;
  filters: CoinFilterState;
}) {
  const t = useT();
  // Derived from the live filter state via the same builder the list queries with,
  // so the download is always exactly the list in view.
  const query = buildExportParams(filters).toString();

  return (
    <a className="btn-sm" href={query ? `${href}?${query}` : href}>
      <IconDownload />
      {t("action.exportCsv")}
    </a>
  );
}
