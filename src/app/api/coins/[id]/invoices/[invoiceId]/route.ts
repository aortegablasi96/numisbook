import { NextResponse } from "next/server";
import { getCoinInvoice, removeCoinInvoice } from "@/services/coinInvoice.service";
import {
  assertWritable,
  currentUser,
  errorResponse,
  unauthorized,
} from "../../../../_lib";

type Params = { params: Promise<{ id: string; invoiceId: string }> };

// Strip anything risky from a stored filename before echoing it into a
// Content-Disposition header (no quotes/newlines/path separators).
function safeFilename(name: string | null): string {
  const base = (name ?? "invoice.pdf").replace(/[\\/\r\n"]/g, "_").trim();
  return base.length > 0 ? base : "invoice.pdf";
}

export async function GET(request: Request, { params }: Params) {
  try {
    const user = await currentUser();
    if (!user) return unauthorized();
    const { id, invoiceId } = await params;
    const invoice = await getCoinInvoice(user.id, id, invoiceId);

    // ?download=1 forces a "Save as"; otherwise the PDF opens inline in the tab.
    const download = new URL(request.url).searchParams.get("download") === "1";
    const disposition = download ? "attachment" : "inline";

    return new Response(new Uint8Array(invoice.data), {
      headers: {
        "Content-Type": invoice.mimeType,
        "Content-Disposition": `${disposition}; filename="${safeFilename(invoice.filename)}"`,
        "Cache-Control": "private, no-cache",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const user = await currentUser();
    if (!user) return unauthorized();
    assertWritable(user);
    const { id, invoiceId } = await params;
    await removeCoinInvoice(user.id, id, invoiceId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}
