import { NextResponse } from "next/server";
import { addCoin, searchCoins } from "@/services/coin.service";
import { currentUser, errorResponse, unauthorized } from "../../../_lib";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  try {
    const user = await currentUser();
    if (!user) return unauthorized();
    const { id } = await params;
    const sp = new URL(request.url).searchParams;
    const yearRaw = sp.get("year");
    const year = yearRaw !== null && yearRaw.trim() !== "" ? Number(yearRaw) : undefined;
    const result = await searchCoins(user.id, id, {
      q: sp.get("q") ?? undefined,
      metal: sp.get("metal") ?? undefined,
      category: sp.get("category") ?? undefined,
      year: Number.isFinite(year) ? year : undefined,
      page: Number(sp.get("page") ?? "1"),
    });
    return NextResponse.json(result);
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
