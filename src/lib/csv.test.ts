import { describe, it, expect } from "vitest";
import { UTF8_BOM, csvField, csvRow, toCsv } from "./csv";

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
