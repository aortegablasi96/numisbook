import { describe, it, expect } from "vitest";
import {
  ARCHIVE_VERSION,
  archiveManifestSchema,
  buildArchiveFilename,
  imageEntryName,
  invoiceEntryName,
} from "./archive";

const validManifest = {
  version: ARCHIVE_VERSION,
  app: "numisbook",
  exportedAt: "2026-07-17T12:00:00.000Z",
  collections: [{ id: "c1", name: "Roman", createdAt: "2026-01-01T00:00:00.000Z" }],
  coins: [
    {
      id: "k1",
      collectionId: "c1",
      category: "Romans",
      issuingAuthority: null,
      yearFrom: -44,
      yearTo: -44,
      denomination: null,
      mint: null,
      metal: "Silver",
      grade: "VF",
      weight: "3.80",
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
      hammerPrice: "100.00",
      auctionPremium: null,
      shippingCost: null,
      taxCost: null,
      finalPrice: "100.00",
      priceCurrency: "EUR",
      createdAt: "2026-02-01T00:00:00.000Z",
    },
  ],
  valuations: [
    {
      coinId: "k1",
      amount: "150.00",
      currency: "EUR",
      source: "estimate",
      sourceUrl: null,
      valuedAt: "2026-03-01T00:00:00.000Z",
      createdAt: "2026-03-01T00:00:00.000Z",
    },
  ],
  images: [
    { coinId: "k1", entry: "images/img1", mimeType: "image/webp", createdAt: "2026-02-01T00:00:00.000Z" },
  ],
  invoices: [
    { coinId: "k1", entry: "invoices/inv1", mimeType: "application/pdf", filename: "receipt.pdf", createdAt: "2026-02-01T00:00:00.000Z" },
  ],
};

describe("archive manifest contract", () => {
  it("accepts a well-formed manifest and keeps the signed BC year", () => {
    const parsed = archiveManifestSchema.parse(validManifest);
    expect(parsed.coins[0].yearFrom).toBe(-44);
    expect(parsed.collections).toHaveLength(1);
  });

  it("rejects an unsupported version with a clear message", () => {
    const result = archiveManifestSchema.safeParse({ ...validManifest, version: 999 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toMatch(/unsupported archive version/i);
    }
  });

  it("rejects a tampered grade", () => {
    const bad = { ...validManifest, coins: [{ ...validManifest.coins[0], grade: "XX" }] };
    expect(archiveManifestSchema.safeParse(bad).success).toBe(false);
  });

  it("requires the array sections", () => {
    const { coins, ...withoutCoins } = validManifest;
    void coins;
    expect(archiveManifestSchema.safeParse(withoutCoins).success).toBe(false);
  });

  it("builds a dated, header-safe filename", () => {
    expect(buildArchiveFilename(new Date("2026-07-17T12:00:00Z"))).toBe(
      "numisbook-archive-2026-07-17.zip",
    );
  });

  it("names blob entries by id under their prefix", () => {
    expect(imageEntryName("abc")).toBe("images/abc");
    expect(invoiceEntryName("def")).toBe("invoices/def");
  });
});
