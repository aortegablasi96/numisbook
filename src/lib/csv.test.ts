import { describe, it, expect } from "vitest";
import { UTF8_BOM, csvField, csvRow, toCsv, parseCsv } from "./csv";

describe("csvField", () => {
  it("leaves a plain value unquoted", () => {
    expect(csvField("Athens")).toBe("Athens");
  });

  it("quotes a value containing the delimiter", () => {
    expect(csvField("RIC 123, Sear 456")).toBe('"RIC 123, Sear 456"');
  });

  it("quotes and doubles embedded quotes", () => {
    expect(csvField('Struck "off-centre"')).toBe('"Struck ""off-centre"""');
  });

  it("quotes a value containing a newline", () => {
    // `observations` and `pedigree` are long free text and will contain these.
    expect(csvField("Ex Smith\nEx Jones")).toBe('"Ex Smith\nEx Jones"');
  });

  it("quotes a value containing a carriage return", () => {
    expect(csvField("Ex Smith\r\nEx Jones")).toBe('"Ex Smith\r\nEx Jones"');
  });

  it("leaves an empty value empty rather than quoting it", () => {
    expect(csvField("")).toBe("");
  });
});

describe("csvRow", () => {
  it("joins fields with commas", () => {
    expect(csvRow(["Romans", "Silver", "Denarius"])).toBe("Romans,Silver,Denarius");
  });

  it("quotes only the fields that need it", () => {
    expect(csvRow(["Romans", "RIC 5, var.", ""])).toBe('Romans,"RIC 5, var.",');
  });
});

describe("toCsv", () => {
  it("emits a BOM so Excel reads it as UTF-8", () => {
    // Without this every accented mint is mangled on open — the whole point.
    const csv = toCsv(["mint"], [["Zürich"]]);
    expect(csv.startsWith(UTF8_BOM)).toBe(true);
    expect(csv).toContain("Zürich");
  });

  it("separates and terminates records with CRLF", () => {
    const csv = toCsv(["a", "b"], [["1", "2"]]);
    expect(csv).toBe(`${UTF8_BOM}a,b\r\n1,2\r\n`);
  });

  it("produces a valid header-only document for zero rows", () => {
    // An over-narrow filter yields a template, not an error (ADR-017).
    expect(toCsv(["a", "b"], [])).toBe(`${UTF8_BOM}a,b\r\n`);
  });

  it("keeps a quoted multi-line field inside one record", () => {
    const csv = toCsv(["note"], [["line one\nline two"]]);
    expect(csv).toBe(`${UTF8_BOM}note\r\n"line one\nline two"\r\n`);
  });
});

describe("parseCsv", () => {
  it("reads a plain document into rows of cells", () => {
    expect(parseCsv("a,b\r\n1,2\r\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("strips a leading BOM", () => {
    // Our own writer emits one; without this the first header reads "﻿title"
    // and every file NumisBook produced would fail its own header check.
    expect(parseCsv(`${UTF8_BOM}title,mint\r\n`)).toEqual([["title", "mint"]]);
  });

  it("accepts bare LF as well as CRLF", () => {
    // We write CRLF; a file round-tripped through an editor may come back LF.
    expect(parseCsv("a,b\n1,2\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("unquotes a quoted field", () => {
    expect(parseCsv('"Athens"\r\n')).toEqual([["Athens"]]);
  });

  it("keeps a delimiter inside a quoted field", () => {
    expect(parseCsv('a,"RIC 123, Sear 456",b\r\n')).toEqual([
      ["a", "RIC 123, Sear 456", "b"],
    ]);
  });

  it("collapses a doubled quote to one literal quote", () => {
    expect(parseCsv('"Struck ""off-centre"""\r\n')).toEqual([['Struck "off-centre"']]);
  });

  it("keeps a newline inside a quoted field as one field", () => {
    // The case that makes a line-splitting parser wrong. `observations` and
    // `pedigree` are 4000-char free text and routinely contain newlines.
    expect(parseCsv('a,"Ex Smith\nEx Jones",b\r\n')).toEqual([
      ["a", "Ex Smith\nEx Jones", "b"],
    ]);
  });

  it("keeps a CRLF inside a quoted field as one field", () => {
    expect(parseCsv('a,"Ex Smith\r\nEx Jones"\r\n')).toEqual([
      ["a", "Ex Smith\r\nEx Jones"],
    ]);
  });

  it("preserves empty fields, including a trailing one", () => {
    expect(parseCsv("a,,c,\r\n")).toEqual([["a", "", "c", ""]]);
  });

  it("keeps a row of only empty fields — that is not a blank line", () => {
    expect(parseCsv(",,,\r\n")).toEqual([["", "", "", ""]]);
  });

  it("reads a final record with no trailing newline", () => {
    expect(parseCsv("a,b")).toEqual([["a", "b"]]);
  });

  it("skips blank lines rather than emitting phantom rows", () => {
    // A trailing newline from a text editor must not become an invalid coin.
    expect(parseCsv("a,b\r\n\r\n1,2\r\n\r\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("reads an empty document as no rows", () => {
    expect(parseCsv("")).toEqual([]);
    expect(parseCsv(UTF8_BOM)).toEqual([]);
  });
});

describe("toCsv → parseCsv round-trip (ADR-017 §3)", () => {
  // The property that pins the two directions together. Every case here is one
  // the writer can actually produce, so a failure means export and import have
  // drifted — the milestone's highest-severity risk.
  const cases: Record<string, string[][]> = {
    "plain values": [["Romans", "Silver"], ["Greeks", "Gold"]],
    "embedded delimiter": [["RIC 5, var.", "x"]],
    "embedded quote": [['Struck "off-centre"', "x"]],
    "embedded LF": [["Ex Smith\nEx Jones", "x"]],
    "embedded CRLF": [["Ex Smith\r\nEx Jones", "x"]],
    "empty and trailing empty cells": [["a", "", ""]],
    "all cells empty": [["", "", ""]],
    "unicode": [["Zürich", "北京"]],
    "signed year, untouched by escaping": [["-44", "Denarius"]],
    "leading formula character": [["=SUM(A1)", "x"]],
    "no rows at all": [],
  };

  for (const [name, rows] of Object.entries(cases)) {
    it(`round-trips ${name}`, () => {
      const headers = ["one", "two"];
      const parsed = parseCsv(toCsv(headers, rows));
      expect(parsed[0]).toEqual(headers);
      expect(parsed.slice(1)).toEqual(rows);
    });
  }
});
