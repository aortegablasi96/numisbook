// A minimal, valid one-page PDF, written by hand.
//
// The demo needs invoice receipts that actually open in a viewer (the invoice
// route serves them inline), but a PDF library would be a dependency the app
// itself never uses. A single-page PDF with one Helvetica text stream is a few
// dozen bytes of structure, so we emit it directly.

type InvoiceLine = { label: string; value: string };

function escapeText(value: string): string {
  return value.replace(/([\\()])/g, "\\$1");
}

/** Build a one-page A4 invoice PDF. Returns the file bytes. */
export function buildInvoicePdf(invoice: {
  house: string;
  lot: string;
  date: string;
  total: string;
  buyer: string;
  description: string;
}): Buffer {
  const lines: InvoiceLine[] = [
    { label: "Auction house", value: invoice.house },
    { label: "Lot", value: invoice.lot },
    { label: "Sale date", value: invoice.date },
    { label: "Buyer", value: invoice.buyer },
    { label: "Description", value: invoice.description },
    { label: "Total paid", value: invoice.total },
  ];

  // Page content: a heading, the rows, and a footer note. PDF text positioning is
  // absolute, so we walk down the page in 24pt steps from the top margin.
  let y = 760;
  const ops: string[] = [
    "BT",
    "/F1 20 Tf",
    `1 0 0 1 60 ${y} Tm`,
    `(${escapeText(invoice.house)}) Tj`,
    "ET",
    "BT",
    "/F1 11 Tf",
    `1 0 0 1 60 ${(y -= 26)} Tm`,
    "(Invoice / statement of account) Tj",
    "ET",
    // A rule under the heading.
    "0.5 w",
    `60 ${(y -= 14)} m 535 ${y} l S`,
  ];

  y -= 34;
  for (const line of lines) {
    ops.push(
      "BT",
      "/F1 10 Tf",
      `1 0 0 1 60 ${y} Tm`,
      `(${escapeText(line.label)}) Tj`,
      "ET",
      "BT",
      "/F1 11 Tf",
      `1 0 0 1 200 ${y} Tm`,
      `(${escapeText(line.value)}) Tj`,
      "ET",
    );
    y -= 24;
  }

  ops.push(
    "BT",
    "/F1 9 Tf",
    `1 0 0 1 60 ${y - 30} Tm`,
    "(Settled in full. Thank you for your custom.) Tj",
    "ET",
    "BT",
    "/F1 8 Tf",
    `1 0 0 1 60 90 Tm`,
    "(Sample document generated for the NumisBook demo collection. Not a real invoice.) Tj",
    "ET",
  );

  const content = ops.join("\n");

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] " +
      "/Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}\nendstream`,
  ];

  // Assemble the file, recording each object's byte offset for the xref table —
  // a PDF is only valid if those offsets are exact.
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(Buffer.byteLength(pdf, "latin1"));
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    pdf += `${offset.toString().padStart(10, "0")} 00000 n \n`;
  }
  pdf +=
    `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n` +
    `startxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(pdf, "latin1");
}
