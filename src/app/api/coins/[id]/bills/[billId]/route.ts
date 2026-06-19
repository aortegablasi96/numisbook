import { NextResponse } from "next/server";
import { getCoinBill, removeCoinBill } from "@/services/coinBill.service";
import { currentUser, errorResponse, unauthorized } from "../../../../_lib";

type Params = { params: Promise<{ id: string; billId: string }> };

// Strip anything risky from a stored filename before echoing it into a
// Content-Disposition header (no quotes/newlines/path separators).
function safeFilename(name: string | null): string {
  const base = (name ?? "bill.pdf").replace(/[\\/\r\n"]/g, "_").trim();
  return base.length > 0 ? base : "bill.pdf";
}

export async function GET(request: Request, { params }: Params) {
  try {
    const user = await currentUser();
    if (!user) return unauthorized();
    const { id, billId } = await params;
    const bill = await getCoinBill(user.id, id, billId);

    // ?download=1 forces a "Save as"; otherwise the PDF opens inline in the tab.
    const download = new URL(request.url).searchParams.get("download") === "1";
    const disposition = download ? "attachment" : "inline";

    return new Response(new Uint8Array(bill.data), {
      headers: {
        "Content-Type": bill.mimeType,
        "Content-Disposition": `${disposition}; filename="${safeFilename(bill.filename)}"`,
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
    const { id, billId } = await params;
    await removeCoinBill(user.id, id, billId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}
