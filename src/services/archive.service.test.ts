import { describe, it, expect, vi, beforeEach } from "vitest";
import { exportArchive, restoreArchive } from "./archive.service";
import { zipStore } from "@/lib/zip";
import { MANIFEST_ENTRY, ARCHIVE_VERSION } from "@/lib/archive";
import type {
  AccountSnapshot,
  RestoreGraph,
} from "@/repositories/archive.repository";

vi.mock("@/repositories/archive.repository", () => ({
  archiveRepository: {
    readAccountSnapshot: vi.fn(),
    restoreAccount: vi.fn(),
  },
}));

import { archiveRepository } from "@/repositories/archive.repository";

const readSnapshot = vi.mocked(archiveRepository.readAccountSnapshot);
const restoreAccount = vi.mocked(archiveRepository.restoreAccount);

function sampleSnapshot(): AccountSnapshot {
  return {
    collections: [
      { id: "coll-1", userId: "u1", name: "Roman Republic", createdAt: new Date("2026-01-01T00:00:00Z") },
    ],
    coins: [
      {
        id: "coin-1",
        collectionId: "coll-1",
        issuingAuthority: "Julius Caesar",
        category: "Romans",
        yearFrom: -44,
        yearTo: -44,
        denomination: "Denarius",
        mint: "Rome",
        metal: "Silver",
        grade: "VF",
        weight: "3.80",
        diameter: "18.00",
        obverseDescription: null,
        reverseDescription: null,
        observations: "=SUM(A1) not a formula, just text",
        catalogueReferences: "Crawford 443/1",
        pedigree: null,
        auctionHouse: "CNG",
        auctionName: "Triton XX",
        auctionLot: "123",
        auctionDate: "2026-01-15",
        hammerPrice: "1000.00",
        auctionPremium: "200.00",
        shippingCost: "50.00",
        taxCost: "30.00",
        finalPrice: "1280.00",
        priceCurrency: "EUR",
        createdAt: new Date("2026-02-01T00:00:00Z"),
      },
    ],
    valuations: [
      {
        id: "val-1",
        coinId: "coin-1",
        amount: "1500.00",
        currency: "EUR",
        source: "estimate",
        sourceUrl: "https://example.test/lot/123",
        valuedAt: new Date("2026-03-01T00:00:00Z"),
        createdAt: new Date("2026-03-01T00:00:00Z"),
      },
    ],
    images: [
      { coinId: "coin-1", mimeType: "image/webp", createdAt: new Date("2026-02-01T00:00:00Z"), data: Buffer.from([1, 2, 3, 4, 5]) },
    ],
    invoices: [
      { coinId: "coin-1", mimeType: "application/pdf", filename: "receipt.pdf", createdAt: new Date("2026-02-01T00:00:00Z"), data: Buffer.from("%PDF-1.4 fake") },
    ],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("exportArchive", () => {
  it("packs the whole graph into a dated zip and preserves values as stored", async () => {
    readSnapshot.mockResolvedValue(sampleSnapshot());

    const { filename, zip } = await exportArchive("u1");

    expect(readSnapshot).toHaveBeenCalledWith("u1");
    expect(filename).toMatch(/^numisbook-archive-\d{4}-\d{2}-\d{2}\.zip$/);

    // Round-trip the zip through the real reader.
    const { unzip } = await import("@/lib/zip");
    const files = unzip(zip);
    const manifest = JSON.parse(files.get(MANIFEST_ENTRY)!.toString("utf8"));

    expect(manifest.version).toBe(ARCHIVE_VERSION);
    expect(manifest.collections).toHaveLength(1);
    expect(manifest.coins[0].yearFrom).toBe(-44); // signed BC year, not "44 BC"
    expect(manifest.coins[0].finalPrice).toBe("1280.00"); // as stored, no FX
    expect(manifest.valuations[0].amount).toBe("1500.00");
    // Blobs present under their manifest entry names, byte-for-byte.
    expect(files.get(manifest.images[0].entry)?.equals(Buffer.from([1, 2, 3, 4, 5]))).toBe(true);
    expect(files.get(manifest.invoices[0].entry)?.toString()).toBe("%PDF-1.4 fake");
  });
});

describe("restoreArchive", () => {
  it("round-trips: an exported archive restores as the same graph, additively", async () => {
    readSnapshot.mockResolvedValue(sampleSnapshot());
    restoreAccount.mockResolvedValue({ collections: 1, coins: 1, valuations: 1, images: 1, invoices: 1 });

    const { zip } = await exportArchive("u1");
    const summary = await restoreArchive("u2", zip);

    expect(summary).toEqual({ collections: 1, coins: 1, valuations: 1, images: 1, invoices: 1 });
    expect(restoreAccount).toHaveBeenCalledTimes(1);
    const [userId, graph] = restoreAccount.mock.calls[0] as [string, RestoreGraph];

    // Restored into the acting user, referencing the archive's own ids by source.
    expect(userId).toBe("u2");
    expect(graph.collections[0]).toMatchObject({ srcId: "coll-1", name: "Roman Republic" });
    expect(graph.coins[0]).toMatchObject({ srcId: "coin-1", srcCollectionId: "coll-1" });
    expect(graph.coins[0].values.yearFrom).toBe(-44);
    expect(graph.coins[0].values.createdAt).toBeInstanceOf(Date);
    expect(graph.coins[0].values.createdAt!.toISOString()).toBe("2026-02-01T00:00:00.000Z");
    expect(graph.valuations[0]).toMatchObject({ srcCoinId: "coin-1" });
    expect(graph.valuations[0].values.valuedAt).toBeInstanceOf(Date);
    // Blob bytes wired back through, byte-for-byte.
    expect(graph.images[0].data.equals(Buffer.from([1, 2, 3, 4, 5]))).toBe(true);
    expect(graph.invoices[0].filename).toBe("receipt.pdf");
    expect(graph.invoices[0].data.toString()).toBe("%PDF-1.4 fake");
  });

  it("rejects a file that is not a zip", async () => {
    await expect(restoreArchive("u1", Buffer.from("nonsense"))).rejects.toThrow(/not a valid archive/i);
    expect(restoreAccount).not.toHaveBeenCalled();
  });

  it("rejects a zip with no manifest", async () => {
    const zip = zipStore([{ name: "images/x", data: Buffer.from("x") }]);
    await expect(restoreArchive("u1", zip)).rejects.toThrow(/missing its manifest/i);
  });

  it("rejects a manifest that is not valid JSON", async () => {
    const zip = zipStore([{ name: MANIFEST_ENTRY, data: Buffer.from("{ not json") }]);
    await expect(restoreArchive("u1", zip)).rejects.toThrow(/not valid JSON/i);
  });

  it("rejects an unsupported archive version", async () => {
    const manifest = { version: 999, collections: [], coins: [], valuations: [], images: [], invoices: [] };
    const zip = zipStore([{ name: MANIFEST_ENTRY, data: Buffer.from(JSON.stringify(manifest)) }]);
    await expect(restoreArchive("u1", zip)).rejects.toThrow(/unsupported archive version/i);
  });

  it("rejects a coin that references an unknown collection", async () => {
    const manifest = {
      version: ARCHIVE_VERSION,
      collections: [],
      coins: [minimalCoin("coin-1", "ghost-collection")],
      valuations: [],
      images: [],
      invoices: [],
    };
    const zip = zipStore([{ name: MANIFEST_ENTRY, data: Buffer.from(JSON.stringify(manifest)) }]);
    await expect(restoreArchive("u1", zip)).rejects.toThrow(/unknown collection/i);
    expect(restoreAccount).not.toHaveBeenCalled();
  });

  it("rejects an image whose bytes are absent from the zip", async () => {
    const manifest = {
      version: ARCHIVE_VERSION,
      collections: [{ id: "c1", name: "C", createdAt: "2026-01-01T00:00:00.000Z" }],
      coins: [minimalCoin("coin-1", "c1")],
      valuations: [],
      images: [{ coinId: "coin-1", entry: "images/missing", mimeType: "image/webp", createdAt: "2026-02-01T00:00:00.000Z" }],
      invoices: [],
    };
    const zip = zipStore([{ name: MANIFEST_ENTRY, data: Buffer.from(JSON.stringify(manifest)) }]);
    await expect(restoreArchive("u1", zip)).rejects.toThrow(/missing image bytes/i);
  });
});

function minimalCoin(id: string, collectionId: string) {
  return {
    id,
    collectionId,
    category: null,
    issuingAuthority: null,
    yearFrom: null,
    yearTo: null,
    denomination: null,
    mint: null,
    metal: null,
    grade: null,
    weight: null,
    diameter: null,
    obverseDescription: null,
    reverseDescription: null,
    observations: null,
    catalogueReferences: null,
    pedigree: null,
    auctionHouse: null,
    auctionName: null,
    auctionLot: null,
    auctionDate: null,
    hammerPrice: null,
    auctionPremium: null,
    shippingCost: null,
    taxCost: null,
    finalPrice: null,
    priceCurrency: null,
    createdAt: "2026-02-01T00:00:00.000Z",
  };
}
