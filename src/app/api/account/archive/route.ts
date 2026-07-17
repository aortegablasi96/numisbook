import { exportArchive } from "@/services/archive.service";
import { currentUser, errorResponse, unauthorized } from "../../_lib";

// The user's whole account as a downloadable archive (ADR-017 addendum, slice 3):
// a STORE zip of a JSON manifest plus every image and invoice byte.
//
// No `assertWritable`: an export is a read, so the read-only demo tenant can pull
// its seeded collection out too (ADR-016 governs mutations only; ADR-017 §10).
//
// The service completes before any download header is set, so a failure returns a
// JSON error rather than a browser saving an error body as a `.zip`.
export async function GET() {
  try {
    const user = await currentUser();
    if (!user) return unauthorized();

    const { filename, zip } = await exportArchive(user.id);
    return new Response(new Uint8Array(zip), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        // A tenant's entire account: never store it in a shared cache.
        "Cache-Control": "private, no-cache",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
