import { NextResponse } from "next/server";
import { addCoin, listCoins } from "@/services/coin.service";
import { currentUser, errorResponse, unauthorized } from "../../../_lib";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const user = await currentUser();
    if (!user) return unauthorized();
    const { id } = await params;
    const coins = await listCoins(user.id, id);
    return NextResponse.json({ coins });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const user = await currentUser();
    if (!user) return unauthorized();
    const { id } = await params;
    const coin = await addCoin(user.id, id, await request.json());
    return NextResponse.json({ coin }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
