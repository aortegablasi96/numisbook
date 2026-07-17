// A minimal RFC 4180 CSV writer and reader. Dependency-free by decision: ADR-017
// §11 deferred the "does parsing earn a library?" question to the import slice,
// and the addendum (§13) answered it — the dialect is a strict subset we write
// ourselves, a header check rejects anything foreign before parsing, and what a
// library sells (delimiter sniffing, encoding detection, streaming) is dead
// weight against that. See `parseCsv` for the one part that is genuinely hard.
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

/**
 * Read a CSV document into rows of raw cells — the inverse of `toCsv`.
 *
 * This is a **character state machine, not a line split**, and that is the whole
 * design. `split("\n")` is the obvious implementation and it is wrong here: a
 * quoted field may legally contain a newline, and coins carry 4000-char free text
 * (`observations`, `pedigree`) that routinely does. A line-splitting parser
 * silently tears one coin into two malformed rows — it does not throw, it
 * corrupts. Reject any rewrite of this into a split.
 *
 * Accepts, because real files contain all of them:
 * - a leading UTF-8 BOM (our own writer emits one — see `UTF8_BOM`)
 * - CRLF (what we write) or bare LF (what an editor may save back)
 * - quoted fields containing delimiters, quotes (doubled), and line breaks
 *
 * Blank lines are skipped: a line with nothing on it carries no fields, and a
 * trailing newline from a text editor should not become a phantom row. Note a
 * line of `,,,` is *not* blank — it is four empty fields, and is kept. The one
 * consequence: a single-cell row whose only cell is empty cannot round-trip,
 * because it serializes to a blank line. No column contract has one column, so
 * nothing real is affected.
 *
 * Cells are returned exactly as written — unquoted, but not otherwise
 * interpreted. Un-escaping a cell needs to know its column's type, which is the
 * contract's job, not this module's (ADR-017 §7).
 */
export function parseCsv(text: string): string[][] {
  const input = text.startsWith(UTF8_BOM) ? text.slice(UTF8_BOM.length) : text;

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  // A row is only real if it has more than one field, or its single field has
  // content — otherwise it is a blank line (see the note above).
  const endRow = () => {
    row.push(field);
    field = "";
    if (row.length > 1 || row[0] !== "") rows.push(row);
    row = [];
  };

  let i = 0;
  while (i < input.length) {
    const char = input[i];

    if (quoted) {
      if (char === '"') {
        // A doubled quote inside a quoted field is one literal quote.
        if (input[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        quoted = false;
        i += 1;
        continue;
      }
      // Delimiters and newlines are literal text while quoted — the reason this
      // cannot be a line split.
      field += char;
      i += 1;
      continue;
    }

    if (char === '"') {
      quoted = true;
      i += 1;
      continue;
    }
    if (char === DELIMITER) {
      row.push(field);
      field = "";
      i += 1;
      continue;
    }
    if (char === "\r") {
      if (input[i + 1] === "\n") i += 1; // CRLF is one terminator, not two
      endRow();
      i += 1;
      continue;
    }
    if (char === "\n") {
      endRow();
      i += 1;
      continue;
    }

    field += char;
    i += 1;
  }

  // A final record with no trailing newline still counts. After a terminated
  // document (ours always is) there is nothing pending and this is a no-op.
  if (field !== "" || row.length > 0) endRow();

  return rows;
}
