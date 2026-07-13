import { NextResponse } from "next/server";
import { searchAllCoins } from "@/services/coin.service";
import { parseCoinSearchParams } from "@/lib/validation/coin";
import { currentUser, errorResponse, unauthorized } from "../_lib";

// The user's coins across every collection they own (the `/coins` view). Read-only:
// coins are created inside a collection, so writes stay on the nested route.
export async function GET(request: Request) {
  try {
    const user = await currentUser();
    if (!user) return unauthorized();
    const search = parseCoinSearchParams(new URL(request.url).searchParams);
    const result = await searchAllCoins(user.id, search);
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
