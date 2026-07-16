import { exportAllCoins } from "@/services/coin.service";
import { parseCoinSearchParams } from "@/lib/validation/coin";
import { csvResponse, currentUser, errorResponse, unauthorized } from "../../_lib";

// The user's coins across every collection, as a CSV download (ADR-017).
//
// Reads the same search contract as `GET /api/coins` and ignores its `page`: an
// export is of the whole filtered list, not the page in view. Sits beside
// `/api/coins/[id]` the way `/api/coins/facets` already does — Next resolves the
// static segment first, and coin ids are UUIDs regardless.
//
// No `assertWritable`: an export is a read, so the read-only demo tenant can
// export too (ADR-016 governs mutations only).
export async function GET(request: Request) {
  try {
    const user = await currentUser();
    if (!user) return unauthorized();
    const search = parseCoinSearchParams(new URL(request.url).searchParams);
    // Note the service completes before any download header is set, so a failure
    // returns JSON rather than a browser saving an error body as a .csv.
    const { filename, csv } = await exportAllCoins(user.id, search);
    return csvResponse(filename, csv);
  } catch (error) {
    return errorResponse(error);
  }
}
