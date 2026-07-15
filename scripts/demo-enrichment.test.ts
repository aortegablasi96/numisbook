import { describe, it, expect } from "vitest";
import { syntheticValuations, syntheticInvoice, type EnrichCoin } from "./demo-enrichment";

const baseCoin: EnrichCoin = {
  finalPrice: "3950.00",
  priceCurrency: "EUR",
  auctionHouse: "Numismatica Ars Classica",
  auctionLot: "459",
  auctionDate: "2020-12-19",
  category: "Roman Republic",
  issuingAuthority: "Brutus",
  yearFrom: -42,
  yearTo: -42,
  mint: "Rome",
};

const NOW = new Date("2026-07-15T00:00:00Z");

describe("syntheticValuations", () => {
  it("returns nothing when the coin has no total price", () => {
    expect(syntheticValuations({ ...baseCoin, finalPrice: null }, NOW)).toEqual([]);
    expect(syntheticValuations({ ...baseCoin, finalPrice: "0" }, NOW)).toEqual([]);
  });

  it("builds a rising history that starts above cost and never lands in the future", () => {
    const vals = syntheticValuations(baseCoin, NOW);
    expect(vals.length).toBeGreaterThanOrEqual(2);
    const basis = 3950;
    // strictly increasing amounts, all above the price paid
    for (let i = 0; i < vals.length; i++) {
      expect(vals[i].amount).toBeGreaterThan(basis);
      if (i > 0) expect(vals[i].amount).toBeGreaterThan(vals[i - 1].amount);
      expect(vals[i].currency).toBe("EUR");
      expect(new Date(`${vals[i].valuedAt}T00:00:00Z`).getTime()).toBeLessThanOrEqual(NOW.getTime());
      expect(new Date(`${vals[i].valuedAt}T00:00:00Z`).getTime()).toBeGreaterThan(
        new Date("2020-12-19T00:00:00Z").getTime(),
      );
    }
    // the most recent point is dated "now"
    expect(vals[vals.length - 1].valuedAt).toBe("2026-07-15");
  });

  it("is deterministic", () => {
    expect(syntheticValuations(baseCoin, NOW)).toEqual(syntheticValuations(baseCoin, NOW));
  });

  it("gives a very recent purchase a single current estimate", () => {
    const recent = syntheticValuations({ ...baseCoin, auctionDate: "2026-06-20" }, NOW);
    expect(recent).toHaveLength(1);
    expect(recent[0].valuedAt).toBe("2026-07-15");
    expect(recent[0].amount).toBeGreaterThan(3950);
  });

  it("carries the coin's price currency", () => {
    const vals = syntheticValuations({ ...baseCoin, priceCurrency: "USD" }, NOW);
    expect(vals.every((v) => v.currency === "USD")).toBe(true);
  });
});

describe("syntheticInvoice", () => {
  it("returns null without an auction house or a total", () => {
    expect(syntheticInvoice({ ...baseCoin, auctionHouse: null }, { buyer: "Demo", now: NOW })).toBeNull();
    expect(syntheticInvoice({ ...baseCoin, finalPrice: null }, { buyer: "Demo", now: NOW })).toBeNull();
  });

  it("builds a PDF and a slugged filename from the auction metadata", () => {
    const inv = syntheticInvoice(baseCoin, { buyer: "Demo Collector", now: NOW });
    expect(inv).not.toBeNull();
    expect(inv!.pdf.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    expect(inv!.filename).toBe("numismatica-ars-classica-2020-12-19-lot-459.pdf");
  });

  it("omits the lot segment when there is no lot", () => {
    const inv = syntheticInvoice({ ...baseCoin, auctionLot: null }, { buyer: "Demo", now: NOW });
    expect(inv!.filename).toBe("numismatica-ars-classica-2020-12-19.pdf");
  });
});
