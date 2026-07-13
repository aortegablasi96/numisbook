import { NextResponse } from "next/server";
import { getAllCoinFacets } from "@/services/coin.service";
import { currentUser, errorResponse, unauthorized } from "../../_lib";

// Distinct filter values across all of the user's collections. Scoped to the
// signed-in user in the repository — an unscoped distinct query would leak other
// collectors' data through a filter dropdown (ADR-015).
export async function GET() {
  try {
    const user = await currentUser();
    if (!user) return unauthorized();
    return NextResponse.json(await getAllCoinFacets(user.id));
  } catch (error) {
    return errorResponse(error);
  }
}
