import { exportCoins } from "@/services/coin.service";
import { parseCoinSearchParams } from "@/lib/validation/coin";
import {
  csvResponse,
  currentUser,
  errorResponse,
  unauthorized,
} from "../../../../_lib";

type Params = { params: Promise<{ id: string }> };

// A collection's coins as a CSV download (ADR-017). Mirrors
// `GET /api/coins/export`, differing only in scope — the same search contract,
// the same column contract, the same headers.
export async function GET(request: Request, { params }: Params) {
  try {
    const user = await currentUser();
    if (!user) return unauthorized();
    const { id } = await params;
    const search = parseCoinSearchParams(new URL(request.url).searchParams);
    const { filename, csv } = await exportCoins(user.id, id, search);
    return csvResponse(filename, csv);
  } catch (error) {
    return errorResponse(error);
  }
}
