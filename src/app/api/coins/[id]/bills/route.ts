import { NextResponse } from "next/server";
import { addCoinBill, listCoinBills } from "@/services/coinBill.service";
import { ValidationError } from "@/lib/errors";
import { currentUser, errorResponse, unauthorized } from "../../../_lib";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const user = await currentUser();
    if (!user) return unauthorized();
    const { id } = await params;
    const bills = await listCoinBills(user.id, id);
    return NextResponse.json({
      bills: bills.map((b) => ({
        id: b.id,
        filename: b.filename,
        sizeBytes: b.sizeBytes,
        createdAt: b.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const user = await currentUser();
    if (!user) return unauthorized();
    const { id } = await params;
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      throw new ValidationError("Expected a file upload under the 'file' field.");
    }
    const data = Buffer.from(await file.arrayBuffer());
    const billId = await addCoinBill(user.id, id, file.type, file.name || null, data);
    return NextResponse.json({ id: billId }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
