// A minimal RFC 4180 CSV writer. Dependency-free: serializing a known column set
// in one direction is a small amount of code, and a library only earns its place
// if parsing (import) proves genuinely hard — see ADR-017 §11.
//
// Domain-agnostic on purpose: this module knows about quoting and delimiters, not
// about coins. The coin column contract lives in `coin-export.ts`.

/**
 * Excel and Sheets interpret a UTF-8 file as the local ANSI codepage unless it
 * opens with a byte-order mark, which mangles every accented mint and issuing
 * authority in the catalogue ("Zürich" → "ZÃ¼rich"). The BOM is what makes the
 * "opens with accents intact" acceptance criterion true.
 */
export const UTF8_BOM = "﻿";

const DELIMITER = ",";
const NEWLINE = "\r\n"; // RFC 4180 §2.1

/**
 * Quote a single field if it needs it. A field must be quoted when it contains
 * the delimiter, a quote, or a line break; embedded quotes are doubled.
 *
 * Note this is *not* a defence against formula injection — Excel happily executes
 * `"=1+1"` inside a quoted field. That mitigation is the column contract's job,
 * because it needs to know a column's type to apply it without corrupting data
 * (ADR-017 §7).
 */
export function csvField(value: string): string {
  const needsQuoting =
    value.includes(DELIMITER) ||
    value.includes('"') ||
    value.includes("\n") ||
    value.includes("\r");
  if (!needsQuoting) return value;
  return `"${value.replaceAll('"', '""')}"`;
}

/** One CSV record: fields joined by the delimiter, each quoted as needed. */
export function csvRow(fields: readonly string[]): string {
  return fields.map(csvField).join(DELIMITER);
}

/**
 * A complete CSV document: BOM, header row, then one row per record, CRLF
 * separated and CRLF terminated.
 *
 * Zero rows is a valid document, not an error — a header-only file is a usable
 * template, and it is what an over-narrow filter should produce.
 */
export function toCsv(
  headers: readonly string[],
  rows: readonly (readonly string[])[],
): string {
  const lines = [csvRow(headers), ...rows.map(csvRow)];
  return UTF8_BOM + lines.join(NEWLINE) + NEWLINE;
}
