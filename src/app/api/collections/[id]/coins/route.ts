import { NextResponse } from "next/server";
import { addCoin, searchCoins } from "@/services/coin.service";
import { parseCoinSearchParams } from "@/lib/validation/coin";
import {
  assertWritable,
  currentUser,
  errorResponse,
  unauthorized,
} from "../../../_lib";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  try {
    const user = await currentUser();
    if (!user) return unauthorized();
    const { id } = await params;
    const search = parseCoinSearchParams(new URL(request.url).searchParams);
    const result = await searchCoins(user.id, id, search);
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const user = await currentUser();
    if (!user) return unauthorized();
    assertWritable(user);
    const { id } = await params;
    const coin = await addCoin(user.id, id, await request.json());
    return NextResponse.json({ coin }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
