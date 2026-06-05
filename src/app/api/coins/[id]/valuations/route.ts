import { NextResponse } from "next/server";
import { listValuations, recordValuation } from "@/services/valuation.service";
import { currentUser, errorResponse, unauthorized } from "../../../_lib";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const user = await currentUser();
    if (!user) return unauthorized();
    const { id } = await params;
    const valuations = await listValuations(user.id, id);
    return NextResponse.json({ valuations });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const user = await currentUser();
    if (!user) return unauthorized();
    const { id } = await params;
    const valuation = await recordValuation(user.id, id, await request.json());
    return NextResponse.json({ valuation }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
