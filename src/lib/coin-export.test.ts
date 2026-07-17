import { describe, it, expect } from "vitest";
import type { Coin } from "@/repositories/coin.repository";
import {
  COIN_EXPORT_COLUMNS,
  COIN_EXPORT_OMITTED,
  COIN_IMPORT_IGNORED,
  coinExportHeaders,
  coinExportRow,
  escapeCell,
  parseRow,
  unescapeCell,
  validateHeaders,
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

// The same guard for the other direction: a column carrying a coin field must be
// either imported or explicitly ignored. Without this a new column could be added
// to the contract, exported, and silently never read back — the round-trip would
// pass on every field it knew about and lose the new one.
const IGNORED_FIELDS = COIN_EXPORT_COLUMNS.filter((c) =>
  (COIN_IMPORT_IGNORED as readonly string[]).includes(c.header),
).map((c) => c.field);

/** Helper: read a parsed row back for one field. */
const headerIndex = () => {
  const check = validateHeaders(coinExportHeaders());
  if (!check.ok) throw new Error("contract headers must validate against themselves");
  return check.index;
};

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

// ---- The inverse pair -------------------------------------------------------

describe("unescapeCell", () => {
  it.each(["=", "+", "-", "@", "\t", "\r"])(
    "undoes the guard on a text cell starting with %j",
    (prefix) => {
      const original = `${prefix}HYPERLINK("http://evil")`;
      expect(unescapeCell(escapeCell(original, "text"), "text")).toBe(original);
    },
  );

  it("leaves ordinary text alone", () => {
    expect(unescapeCell("Ex Smith collection", "text")).toBe("Ex Smith collection");
  });

  it("keeps an apostrophe that is part of the text", () => {
    // The reason the guard is narrower than "strip any leading '": this text was
    // never escaped, so stripping would eat a real character.
    expect(unescapeCell("'tis a fine coin", "text")).toBe("'tis a fine coin");
    expect(unescapeCell("'quoted'", "text")).toBe("'quoted'");
  });

  it.each(["number", "date", "enum"] as const)("never touches a %s cell", (kind) => {
    // The BC-year guarantee, from the other direction.
    expect(unescapeCell("-44", kind)).toBe("-44");
    expect(unescapeCell("'-44", kind)).toBe("'-44");
  });

  it("is the inverse of escapeCell for every column kind", () => {
    const samples = ["plain", "=1+1", "-44", "", "Zürich", "a,b", 'say "hi"'];
    for (const column of COIN_EXPORT_COLUMNS) {
      for (const value of samples) {
        expect(unescapeCell(escapeCell(value, column.kind), column.kind)).toBe(value);
      }
    }
  });

  it("documents the one case escapeCell cannot round-trip", () => {
    // escapeCell is not injective: "=1+1" and the literal "'=1+1" both export as
    // "'=1+1", so no inverse can distinguish them. Text literally starting with
    // an apostrophe *followed by* a formula character loses that apostrophe.
    // Pinned so it stays a known quantity; see unescapeCell's note for why it is
    // not fixed by changing escapeCell.
    expect(escapeCell("'=1+1", "text")).toBe("'=1+1");
    expect(escapeCell("=1+1", "text")).toBe("'=1+1");
    expect(unescapeCell("'=1+1", "text")).toBe("=1+1");
  });
});

// ---- Header validation ------------------------------------------------------

describe("validateHeaders", () => {
  it("accepts the contract's own header row", () => {
    expect(validateHeaders(coinExportHeaders()).ok).toBe(true);
  });

  it("accepts columns in any order", () => {
    // A collector reordering columns in Excel has not broken anything.
    const shuffled = [...coinExportHeaders()].reverse();
    const check = validateHeaders(shuffled);
    expect(check.ok).toBe(true);
    if (check.ok) expect(check.index.get("title")).toBe(shuffled.indexOf("title"));
  });

  it("tolerates surrounding whitespace in a header cell", () => {
    const padded = coinExportHeaders().map((h) => ` ${h} `);
    expect(validateHeaders(padded).ok).toBe(true);
  });

  it("rejects an unknown column and names it", () => {
    const check = validateHeaders([...coinExportHeaders(), "value"]);
    expect(check.ok).toBe(false);
    if (!check.ok) expect(check.unexpected).toEqual(["value"]);
  });

  it("rejects a missing column and names it", () => {
    const check = validateHeaders(coinExportHeaders().filter((h) => h !== "priceCurrency"));
    expect(check.ok).toBe(false);
    if (!check.ok) expect(check.missing).toEqual(["priceCurrency"]);
  });

  it("rejects a file that is not a coin CSV at all", () => {
    const check = validateHeaders(["name", "price"]);
    expect(check.ok).toBe(false);
    if (!check.ok) {
      expect(check.unexpected).toEqual(["name", "price"]);
      expect(check.missing.length).toBeGreaterThan(0);
    }
  });
});

// ---- Reading a row ----------------------------------------------------------

describe("parseRow", () => {
  const read = (c: ExportableCoin) => parseRow(coinExportRow(c), headerIndex());

  it("reads text, enum and date columns back as written", () => {
    const row = read(coin({ category: "Romans", grade: "EF", auctionDate: "2024-03-15" }));
    expect(row.category).toBe("Romans");
    expect(row.grade).toBe("EF");
    expect(row.auctionDate).toBe("2024-03-15");
  });

  it("reads numbers back as numbers", () => {
    const row = read(coin({ weight: "3.90", hammerPrice: "1000.00" }));
    expect(row.weight).toBe(3.9);
    expect(row.hammerPrice).toBe(1000);
  });

  it("reads a BC year back as a negative number", () => {
    // The field this whole contract's typing exists to protect.
    const row = read(coin({ yearFrom: -44, yearTo: -44 }));
    expect(row.yearFrom).toBe(-44);
    expect(row.yearTo).toBe(-44);
  });

  it("reads an empty cell as null, not an empty string", () => {
    const row = read(coin());
    expect(row.category).toBeNull();
    expect(row.finalPrice).toBeNull();
    expect(row.auctionDate).toBeNull();
  });

  it("ignores the derived title column", () => {
    expect(read(coin({ category: "Romans" }))).not.toHaveProperty("title");
  });

  it("ignores the advisory collection column", () => {
    // Import writes into the collection the collector chose, not the one named in
    // the file — collections.name is not unique (ADR-017 addendum §15).
    expect(read(coin())).not.toHaveProperty("collectionName");
  });

  it("un-escapes a formula guarded in free text", () => {
    expect(read(coin({ observations: "=1+1" })).observations).toBe("=1+1");
  });

  it("hands an unparseable number back as its raw string for Zod to reject", () => {
    const cells = coinExportRow(coin());
    const index = headerIndex();
    cells[coinExportHeaders().indexOf("weight")] = "heavy";
    expect(parseRow(cells, index).weight).toBe("heavy");
  });

  it("reads a short row's absent cells as null", () => {
    expect(parseRow([], headerIndex()).category).toBeNull();
  });

  it("reads every column the contract imports", () => {
    // Guards the other half of the drift risk: a column that is exported but
    // never read back would lose data silently on every round-trip.
    const row = read(coin());
    for (const column of COIN_EXPORT_COLUMNS) {
      if (column.field === null || IGNORED_FIELDS.includes(column.field)) continue;
      expect(row).toHaveProperty(column.field);
    }
  });
});

// ---- The round-trip ADR-017 §3 mandates -------------------------------------

describe("parse(export(coin)) ≡ coin", () => {
  const roundTrip = (c: ExportableCoin) => parseRow(coinExportRow(c), headerIndex());

  it("round-trips a fully populated coin", () => {
    const c = coin({
      category: "Romans",
      issuingAuthority: "Augustus",
      yearFrom: -27,
      yearTo: 14,
      denomination: "Denarius",
      mint: "Lugdunum",
      metal: "Silver",
      grade: "EF",
      weight: "3.90",
      diameter: "19.00",
      obverseDescription: "Laureate head right",
      reverseDescription: "Caius and Lucius standing",
      observations: "Ex Smith, 1998",
      catalogueReferences: "RIC 207",
      pedigree: "Ex Jones collection",
      auctionHouse: "NAC",
      auctionName: "Auction 100",
      auctionLot: "42",
      auctionDate: "2024-03-15",
      hammerPrice: "1000.00",
      auctionPremium: "200.00",
      shippingCost: "30.00",
      taxCost: "20.00",
      finalPrice: "1250.00",
      priceCurrency: "EUR",
    });
    const row = roundTrip(c);

    expect(row.category).toBe("Romans");
    expect(row.yearFrom).toBe(-27);
    expect(row.yearTo).toBe(14);
    expect(row.grade).toBe("EF");
    expect(row.weight).toBe(3.9);
    expect(row.auctionDate).toBe("2024-03-15");
    expect(row.hammerPrice).toBe(1000);
    expect(row.taxCost).toBe(20);
    // Never FX-converted on the way out or back (ADR-017 §5).
    expect(row.priceCurrency).toBe("EUR");
    expect(row.finalPrice).toBe(1250);
  });

  it("round-trips an empty coin", () => {
    const row = roundTrip(coin());
    for (const column of COIN_EXPORT_COLUMNS) {
      if (column.field === null || IGNORED_FIELDS.includes(column.field)) continue;
      expect(row[column.field]).toBeNull();
    }
  });

  it("round-trips free text containing delimiters, quotes and newlines", () => {
    const observations = 'Ex "Smith", 1998\nEx Jones, 2004';
    expect(roundTrip(coin({ observations })).observations).toBe(observations);
  });

  it("round-trips a non-base currency without conversion", () => {
    const row = roundTrip(coin({ finalPrice: "1250.00", priceCurrency: "USD" }));
    expect(row.finalPrice).toBe(1250);
    expect(row.priceCurrency).toBe("USD");
  });
});
