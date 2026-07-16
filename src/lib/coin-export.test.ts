import { describe, it, expect } from "vitest";
import type { Coin } from "@/repositories/coin.repository";
import {
  COIN_EXPORT_COLUMNS,
  COIN_EXPORT_OMITTED,
  coinExportHeaders,
  coinExportRow,
  escapeCell,
  type ExportableCoin,
  type ExportedField,
} from "./coin-export";

// ---- Compile-time: the contract cannot silently drift from the schema --------

// `ExportableCoin` is structural (src/lib never imports from @/repositories), so
// nothing would otherwise stop a new coin column from being added to the schema
// and quietly missing from every export. This turns that into a build failure:
// a new column must be given a contract entry or listed in COIN_EXPORT_OMITTED.
// `import type` is erased, so this costs no runtime import of @/db.
type AssertNever<T extends never> = T;
type UnexportedCoinColumns = Exclude<
  keyof Coin,
  NonNullable<ExportedField> | (typeof COIN_EXPORT_OMITTED)[number]
>;
export type _NoUnexportedCoinColumns = AssertNever<UnexportedCoinColumns>;

// ---- Fixtures ---------------------------------------------------------------

const EMPTY: ExportableCoin = {
  collectionName: "Roman Silver",
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
};

const coin = (overrides: Partial<ExportableCoin> = {}): ExportableCoin => ({
  ...EMPTY,
  ...overrides,
});

/** Read one column out of a row by header, so tests don't depend on column order. */
const cell = (row: string[], header: string): string =>
  row[coinExportHeaders().indexOf(header)];

// ---- Headers ----------------------------------------------------------------

describe("coinExportHeaders", () => {
  it("leads with the derived title, then the collection", () => {
    expect(coinExportHeaders().slice(0, 2)).toEqual(["title", "collection"]);
  });

  it("emits unique headers", () => {
    const headers = coinExportHeaders();
    expect(new Set(headers).size).toBe(headers.length);
  });

  it("names headers after the validation schema's fields", () => {
    // Import maps a header straight to a schema key, so these must not become prose.
    expect(coinExportHeaders()).toContain("issuingAuthority");
    expect(coinExportHeaders()).toContain("priceCurrency");
  });
});

// ---- Values are written as stored -------------------------------------------

describe("coinExportRow", () => {
  it("writes a null attribute as an empty cell", () => {
    const row = coinExportRow(coin());
    expect(cell(row, "category")).toBe("");
    expect(cell(row, "auctionDate")).toBe("");
    expect(cell(row, "finalPrice")).toBe("");
  });

  it("derives the title from the coin's attributes", () => {
    const row = coinExportRow(
      coin({ category: "Romans", issuingAuthority: "Augustus", mint: "Lugdunum" }),
    );
    expect(cell(row, "title")).toBe("Romans. Augustus, Lugdunum");
  });

  it("falls back to a label when a coin has nothing to derive a title from", () => {
    expect(cell(coinExportRow(coin()), "title")).toBe("Untitled coin");
  });

  it("carries the owning collection", () => {
    expect(cell(coinExportRow(coin()), "collection")).toBe("Roman Silver");
  });

  it("writes prices as stored, in the coin's own currency", () => {
    // Never FX-converted — an export is a record of fact (ADR-017 §5).
    const row = coinExportRow(
      coin({ finalPrice: "1250.00", priceCurrency: "USD", hammerPrice: "1000.00" }),
    );
    expect(cell(row, "hammerPrice")).toBe("1000.00");
    expect(cell(row, "finalPrice")).toBe("1250.00");
    expect(cell(row, "priceCurrency")).toBe("USD");
  });

  it("writes an ISO date unchanged", () => {
    expect(cell(coinExportRow(coin({ auctionDate: "2024-03-15" })), "auctionDate")).toBe(
      "2024-03-15",
    );
  });

  it("writes the grade enum as its code", () => {
    expect(cell(coinExportRow(coin({ grade: "EF" })), "grade")).toBe("EF");
  });
});

// ---- BC years: the case the blanket escaping rule would have corrupted -------

describe("coinExportRow — signed years", () => {
  it("writes a BC year as a negative number, not the display form", () => {
    const row = coinExportRow(coin({ yearFrom: -44, yearTo: -44 }));
    expect(cell(row, "yearFrom")).toBe("-44");
    expect(cell(row, "yearTo")).toBe("-44");
  });

  it("does not prefix a negative year with a formula guard", () => {
    // The regression this contract's typing exists to prevent: the textbook
    // "prefix anything starting with -" rule would emit '-44 here, turning the
    // most numismatically important field in the file into text (ADR-017 §7).
    const row = coinExportRow(coin({ yearFrom: -323 }));
    expect(cell(row, "yearFrom")).toBe("-323");
    expect(cell(row, "yearFrom").startsWith("'")).toBe(false);
  });

  it("writes an AD year plainly", () => {
    expect(cell(coinExportRow(coin({ yearFrom: 117 })), "yearFrom")).toBe("117");
  });

  it("still renders BC in the derived title", () => {
    // The display form lives in the title column; the data columns stay signed.
    expect(cell(coinExportRow(coin({ category: "Romans", yearFrom: -44, yearTo: -44 })), "title"))
      .toBe("Romans (44 BC)");
  });
});

// ---- Formula injection ------------------------------------------------------

describe("escapeCell", () => {
  it.each(["=", "+", "-", "@", "\t", "\r"])(
    "neutralizes a text cell starting with %j",
    (prefix) => {
      expect(escapeCell(`${prefix}HYPERLINK("http://evil")`, "text")).toBe(
        `'${prefix}HYPERLINK("http://evil")`,
      );
    },
  );

  it("leaves ordinary text alone", () => {
    expect(escapeCell("Ex Smith collection", "text")).toBe("Ex Smith collection");
  });

  it("leaves an empty cell alone", () => {
    expect(escapeCell("", "text")).toBe("");
  });

  it.each(["number", "date", "enum"] as const)(
    "never touches a %s cell",
    (kind) => {
      expect(escapeCell("-44", kind)).toBe("-44");
    },
  );
});

describe("coinExportRow — formula injection", () => {
  it("neutralizes a formula hidden in free text", () => {
    const row = coinExportRow(coin({ observations: "=1+1" }));
    expect(cell(row, "observations")).toBe("'=1+1");
  });

  it("neutralizes a formula that reaches the derived title", () => {
    // title is derived from user text, so it inherits the hazard.
    const row = coinExportRow(coin({ category: "=cmd|' /C calc'!A0" }));
    expect(cell(row, "title").startsWith("'=")).toBe(true);
  });

  it("guards every text column and no other", () => {
    // Pins the mitigation to column typing: a new free-text column typed as
    // anything else would silently lose its escaping.
    for (const column of COIN_EXPORT_COLUMNS) {
      const guarded = escapeCell("=1+1", column.kind) === "'=1+1";
      expect(guarded).toBe(column.kind === "text");
    }
  });
});
