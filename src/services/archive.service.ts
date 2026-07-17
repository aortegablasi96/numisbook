import { randomUUID } from "node:crypto";
import {
  archiveRepository,
  type RestoreGraph,
} from "@/repositories/archive.repository";
import { zipStore, unzip } from "@/lib/zip";
import {
  ARCHIVE_VERSION,
  MANIFEST_ENTRY,
  archiveManifestSchema,
  buildArchiveFilename,
  imageEntryName,
  invoiceEntryName,
  type ArchiveManifest,
  type RestoreSummary,
} from "@/lib/archive";
import { ValidationError } from "@/lib/errors";

// Full-account archive export + restore (ADR-017 addendum, slice 3). Framework-
// agnostic: it maps between the archive contract (`@/lib/archive`) and the account
// graph the repository reads/writes, and does the zip mechanics via `@/lib/zip`.
// The acting `userId` always comes from the session (tenant isolation) — it scopes
// the export read and owns every restored row.

/** A generated archive: the zip bytes and the name to offer it under. */
export type ArchiveExport = {
  filename: string;
  zip: Buffer;
};

/**
 * Build a complete archive of the user's account: a `manifest.json` describing the
 * whole graph, plus the raw image and invoice bytes, packed into a STORE zip.
 * Values are recorded as stored (ADR-017 §5) — no FX conversion, signed years —
 * and `createdAt` is preserved so a restore reproduces acquisition order.
 */
export async function exportArchive(userId: string): Promise<ArchiveExport> {
  const snapshot = await archiveRepository.readAccountSnapshot(userId);

  const entries: { name: string; data: Buffer }[] = [];

  const images = snapshot.images.map((img) => {
    const id = randomUUID();
    const entry = imageEntryName(id);
    entries.push({ name: entry, data: img.data });
    return {
      coinId: img.coinId,
      entry,
      mimeType: img.mimeType,
      createdAt: img.createdAt.toISOString(),
    };
  });

  const invoices = snapshot.invoices.map((inv) => {
    const id = randomUUID();
    const entry = invoiceEntryName(id);
    entries.push({ name: entry, data: inv.data });
    return {
      coinId: inv.coinId,
      entry,
      mimeType: inv.mimeType,
      filename: inv.filename,
      createdAt: inv.createdAt.toISOString(),
    };
  });

  const manifest: ArchiveManifest = {
    version: ARCHIVE_VERSION,
    app: "numisbook",
    exportedAt: new Date().toISOString(),
    collections: snapshot.collections.map((c) => ({
      id: c.id,
      name: c.name,
      createdAt: c.createdAt.toISOString(),
    })),
    coins: snapshot.coins.map(({ createdAt, ...rest }) => ({
      ...rest,
      createdAt: createdAt.toISOString(),
    })),
    valuations: snapshot.valuations.map((v) => ({
      coinId: v.coinId,
      amount: v.amount,
      currency: v.currency,
      source: v.source,
      sourceUrl: v.sourceUrl,
      valuedAt: v.valuedAt.toISOString(),
      createdAt: v.createdAt.toISOString(),
    })),
    images,
    invoices,
  };

  // The manifest leads the archive so a reader hits it first.
  entries.unshift({
    name: MANIFEST_ENTRY,
    data: Buffer.from(JSON.stringify(manifest, null, 2), "utf8"),
  });

  return { filename: buildArchiveFilename(new Date()), zip: zipStore(entries) };
}

/**
 * Restore an archive into the user's account, **additively** (ADR-017 addendum):
 * every collection, coin, valuation, image and invoice is recreated with a fresh
 * id in the acting user's account, wired to each other but to nothing pre-existing.
 * Re-restoring the same archive therefore duplicates it — the caller discloses the
 * counts rather than preventing it, exactly as CSV import does.
 *
 * The manifest is fully validated — shape (Zod), then referential integrity and
 * blob presence — before a single row or byte is written, so a malformed archive
 * is rejected whole (ADR-017 addendum §20) rather than half-restored.
 */
export async function restoreArchive(userId: string, zip: Buffer): Promise<RestoreSummary> {
  const files = readZip(zip);
  const manifest = parseManifest(files);
  validateReferences(manifest, files);

  const graph: RestoreGraph = {
    collections: manifest.collections.map((c) => ({
      srcId: c.id,
      name: c.name,
      createdAt: new Date(c.createdAt),
    })),
    coins: manifest.coins.map(({ id, collectionId, createdAt, ...attrs }) => ({
      srcId: id,
      srcCollectionId: collectionId,
      values: { ...attrs, createdAt: new Date(createdAt) },
    })),
    valuations: manifest.valuations.map((v) => ({
      srcCoinId: v.coinId,
      values: {
        amount: v.amount,
        currency: v.currency,
        source: v.source,
        sourceUrl: v.sourceUrl,
        valuedAt: new Date(v.valuedAt),
        createdAt: new Date(v.createdAt),
      },
    })),
    images: manifest.images.map((img) => ({
      srcCoinId: img.coinId,
      mimeType: img.mimeType,
      createdAt: new Date(img.createdAt),
      data: files.get(img.entry)!,
    })),
    invoices: manifest.invoices.map((inv) => ({
      srcCoinId: inv.coinId,
      mimeType: inv.mimeType,
      filename: inv.filename,
      createdAt: new Date(inv.createdAt),
      data: files.get(inv.entry)!,
    })),
  };

  return archiveRepository.restoreAccount(userId, graph);
}

function readZip(zip: Buffer): Map<string, Buffer> {
  try {
    return unzip(zip);
  } catch (err) {
    // Turn a container-format failure into a domain 400, not a 500.
    throw new ValidationError(
      err instanceof Error ? `This file is not a valid archive: ${err.message}` : "This file is not a valid archive.",
    );
  }
}

function parseManifest(files: Map<string, Buffer>): ArchiveManifest {
  const raw = files.get(MANIFEST_ENTRY);
  if (!raw) {
    throw new ValidationError(`The archive is missing its ${MANIFEST_ENTRY}.`);
  }
  let json: unknown;
  try {
    json = JSON.parse(raw.toString("utf8"));
  } catch {
    throw new ValidationError(`The archive's ${MANIFEST_ENTRY} is not valid JSON.`);
  }
  // Zod errors surface as 400s at the API boundary, naming the offending field.
  return archiveManifestSchema.parse(json);
}

/**
 * Every foreign key in the manifest must resolve within the manifest, and every
 * referenced blob must be present in the zip. Checked up front so the restore is
 * all-or-nothing: a dangling coin→collection link or a missing image entry is
 * rejected before any write, never discovered mid-restore.
 */
function validateReferences(manifest: ArchiveManifest, files: Map<string, Buffer>): void {
  const collectionIds = new Set(manifest.collections.map((c) => c.id));
  const coinIds = new Set(manifest.coins.map((c) => c.id));

  for (const coin of manifest.coins) {
    if (!collectionIds.has(coin.collectionId)) {
      throw new ValidationError(`Archive coin ${coin.id} references an unknown collection.`);
    }
  }
  for (const v of manifest.valuations) {
    if (!coinIds.has(v.coinId)) {
      throw new ValidationError("Archive valuation references an unknown coin.");
    }
  }
  for (const img of manifest.images) {
    if (!coinIds.has(img.coinId)) {
      throw new ValidationError("Archive image references an unknown coin.");
    }
    if (!files.has(img.entry)) {
      throw new ValidationError(`Archive is missing image bytes for ${img.entry}.`);
    }
  }
  for (const inv of manifest.invoices) {
    if (!coinIds.has(inv.coinId)) {
      throw new ValidationError("Archive invoice references an unknown coin.");
    }
    if (!files.has(inv.entry)) {
      throw new ValidationError(`Archive is missing invoice bytes for ${inv.entry}.`);
    }
  }
}
