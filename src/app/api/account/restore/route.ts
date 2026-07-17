import { NextResponse } from "next/server";
import { restoreArchive } from "@/services/archive.service";
import { MAX_RESTORE_BYTES } from "@/lib/archive";
import { ValidationError } from "@/lib/errors";
import {
  assertWritable,
  currentUser,
  errorResponse,
  unauthorized,
} from "../../_lib";

/**
 * Restore a full-account archive (ADR-017 addendum, slice 3).
 *
 * **Additive** — every collection/coin/valuation/image/invoice in the archive is
 * recreated with a fresh id in the caller's account, never overwriting anything.
 * Single-step, unlike CSV import's preview+commit (addendum): additive restore is
 * non-destructive, so there is no duplicate-into-an-existing-collection hazard to
 * preview, and re-uploading a multi-MB archive twice would be wasteful.
 *
 * Restore writes, so ADR-016 applies in full and the read-only demo tenant is
 * refused. `write-guard.test.ts` fails the build if this guard goes missing.
 *
 * Thin, per the layering rules: read the multipart, bound the size, hand the bytes
 * to the service, return what it created.
 */
export async function POST(request: Request) {
  try {
    const user = await currentUser();
    if (!user) return unauthorized();
    assertWritable(user);

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      throw new ValidationError("Expected a file upload under the 'file' field.");
    }
    if (file.size > MAX_RESTORE_BYTES) {
      throw new ValidationError(
        `This archive is larger than the ${Math.round(MAX_RESTORE_BYTES / (1024 * 1024))} MB limit.`,
      );
    }

    const zip = Buffer.from(await file.arrayBuffer());
    const summary = await restoreArchive(user.id, zip);
    return NextResponse.json(summary);
  } catch (error) {
    return errorResponse(error);
  }
}
