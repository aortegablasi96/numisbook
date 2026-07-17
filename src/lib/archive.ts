// The full-account archive contract (ADR-017 addendum, slice 3 of 3) — the single
// source of truth for what a NumisBook archive contains and how it is shaped.
//
// An archive is a STORE zip (see `zip.ts`) of a JSON `manifest.json` plus the raw
// image and invoice bytes. Unlike the CSV column contract (`coin-export.ts`),
// which is deliberately lossy (coin attributes only, no ids, no valuations, no
// bytes), the archive is the *complete* graph: every collection, coin, valuation,
// image and invoice, with `createdAt` preserved. It is a distinct, richer format
// and is versioned so it can evolve without breaking files already on disk.
//
// Layering: `src/lib` never imports from `@/repositories` / `@/db`, so the shapes
// below are declared structurally (mirroring the DB columns) exactly as
// `coin-export.ts` does. The service maps repository rows to and from them.

import { z } from "zod";

/** Bump when the manifest shape changes incompatibly; restore refuses others. */
export const ARCHIVE_VERSION = 1;

export const MANIFEST_ENTRY = "manifest.json";
const IMAGE_PREFIX = "images/";
const INVOICE_PREFIX = "invoices/";

/**
 * Restore upload ceiling. An archive buffers whole (ADR-017 §8): the zip, plus
 * the decoded bytes, sit in memory. Bound it explicitly rather than letting a
 * tenant's data size the request. STORE means no decompression amplification, so
 * this byte count is also the real uncompressed size — no zip-bomb to guard.
 * Revisit alongside export's "four figures" trigger.
 */
export const MAX_RESTORE_BYTES = 100 * 1024 * 1024; // 100 MB

/** Zip entry name for an image / invoice blob, keyed by the manifest's own id. */
export const imageEntryName = (id: string): string => `${IMAGE_PREFIX}${id}`;
export const invoiceEntryName = (id: string): string => `${INVOICE_PREFIX}${id}`;

/** `numisbook-archive-YYYY-MM-DD.zip` — dated, no user text, so header-safe. */
export const buildArchiveFilename = (on: Date): string =>
  `numisbook-archive-${on.toISOString().slice(0, 10)}.zip`;

// A fixed-scale numeric column as Drizzle returns it: a string, or null.
const numeric = z.string().nullable();
// An ISO timestamp string (Date fields serialize to this through JSON).
const isoTimestamp = z.string();

const collectionSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: isoTimestamp,
});

const coinSchema = z.object({
  id: z.string(),
  collectionId: z.string(),
  category: z.string().nullable(),
  issuingAuthority: z.string().nullable(),
  yearFrom: z.number().int().nullable(),
  yearTo: z.number().int().nullable(),
  denomination: z.string().nullable(),
  mint: z.string().nullable(),
  metal: z.string().nullable(),
  // Mirrors coinGradeEnum (src/db/schema/coins.ts); duplicated here to keep
  // src/lib free of a schema import, and to reject a tampered grade with a 400.
  grade: z.enum(["G", "VG", "F", "VF", "EF", "AU", "MS"]).nullable(),
  weight: numeric,
  diameter: numeric,
  obverseDescription: z.string().nullable(),
  reverseDescription: z.string().nullable(),
  observations: z.string().nullable(),
  catalogueReferences: z.string().nullable(),
  pedigree: z.string().nullable(),
  auctionHouse: z.string().nullable(),
  auctionName: z.string().nullable(),
  auctionLot: z.string().nullable(),
  auctionDate: z.string().nullable(), // "YYYY-MM-DD"
  hammerPrice: numeric,
  auctionPremium: numeric,
  shippingCost: numeric,
  taxCost: numeric,
  finalPrice: numeric,
  priceCurrency: z.string().nullable(),
  createdAt: isoTimestamp,
});

const valuationSchema = z.object({
  coinId: z.string(),
  amount: z.string(),
  currency: z.string(),
  source: z.string().nullable(),
  sourceUrl: z.string().nullable(),
  valuedAt: isoTimestamp,
  createdAt: isoTimestamp,
});

const imageSchema = z.object({
  coinId: z.string(),
  entry: z.string(),
  mimeType: z.string(),
  createdAt: isoTimestamp,
});

const invoiceSchema = z.object({
  coinId: z.string(),
  entry: z.string(),
  mimeType: z.string(),
  filename: z.string().nullable(),
  createdAt: isoTimestamp,
});

/**
 * The manifest schema. `version` is pinned to the one version this build reads,
 * so an archive from a future (or corrupt) format is rejected with a 400 naming
 * the mismatch rather than half-restored.
 */
export const archiveManifestSchema = z.object({
  version: z.literal(ARCHIVE_VERSION, {
    errorMap: () => ({
      message: `Unsupported archive version (this build reads version ${ARCHIVE_VERSION}).`,
    }),
  }),
  app: z.string().optional(),
  exportedAt: z.string().optional(),
  collections: z.array(collectionSchema),
  coins: z.array(coinSchema),
  valuations: z.array(valuationSchema),
  images: z.array(imageSchema),
  invoices: z.array(invoiceSchema),
});

export type ArchiveManifest = z.infer<typeof archiveManifestSchema>;
export type ArchiveCollection = z.infer<typeof collectionSchema>;
export type ArchiveCoin = z.infer<typeof coinSchema>;
export type ArchiveValuation = z.infer<typeof valuationSchema>;
export type ArchiveImage = z.infer<typeof imageSchema>;
export type ArchiveInvoice = z.infer<typeof invoiceSchema>;

/** What a restore created, for the result summary shown to the collector. */
export type RestoreSummary = {
  collections: number;
  coins: number;
  valuations: number;
  images: number;
  invoices: number;
};
