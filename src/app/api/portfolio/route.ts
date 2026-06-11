import { NextResponse } from "next/server";
import { getPortfolioSummary } from "@/services/analytics.service";
import { currentUser, errorResponse, unauthorized } from "../_lib";

export async function GET() {
  try {
    const user = await currentUser();
    if (!user) return unauthorized();
    const summary = await getPortfolioSummary(user.id, user.baseCurrency);
    return NextResponse.json({ summary });
  } catch (error) {
    return errorResponse(error);
  }
}
