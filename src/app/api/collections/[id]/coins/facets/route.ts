import { NextResponse } from "next/server";
import { getCoinFacets } from "@/services/coin.service";
import { currentUser, errorResponse, unauthorized } from "../../../../_lib";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const user = await currentUser();
    if (!user) return unauthorized();
    const { id } = await params;
    const facets = await getCoinFacets(user.id, id);
    return NextResponse.json(facets);
  } catch (error) {
    return errorResponse(error);
  }
}
