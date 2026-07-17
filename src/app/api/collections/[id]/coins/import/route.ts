import { NextResponse } from "next/server";
import { importCoins } from "@/services/coin.service";
import { MAX_IMPORT_BYTES, formatBytes } from "@/lib/csv-import";
import { ValidationError } from "@/lib/errors";
import {
  assertWritable,
  currentUser,
  errorResponse,
  unauthorized,
} from "../../../../_lib";

type Params = { params: Promise<{ id: string }> };

/**
 * Import coins into a collection from a CSV (ADR-017 addendum).
 *
 * **One route, two phases.** `commit` selects between them and defaults to
 * false, so a request that forgets it previews rather than writes. Two separate
 * routes would each parse, header-check and validate identically and differ only
 * in the last step — duplicating the very code path whose divergence ADR-017
 * names as this milestone's highest-severity risk (addendum §16).
 *
 * The file is uploaded once per phase. That is deliberate: the alternative is
 * server-side parse state behind a token, and re-validating on commit is correct
 * rather than wasteful — a token would be a claim about the past that the commit
 * has to trust.
 *
 * Thin, per the layering rules: read the multipart, bound the size, hand the text
 * to the service. What the file means is the service's business.
 */
export async function POST(request: Request, { params }: Params) {
  try {
    const user = await currentUser();
    if (!user) return unauthorized();
    // Import writes, so ADR-016 applies in full and the demo tenant is refused.
    // `write-guard.test.ts` fails the build if this line goes missing.
    assertWritable(user);

    const { id } = await params;
    const form = await request.formData();

    const file = form.get("file");
    if (!(file instanceof File)) {
      throw new ValidationError("Expected a file upload under the 'file' field.");
    }
    if (file.size > MAX_IMPORT_BYTES) {
      throw new ValidationError(
        `This file is ${formatBytes(file.size)}; the limit is ${formatBytes(MAX_IMPORT_BYTES)}.`,
      );
    }

    const commit = form.get("commit") === "true";
    const report = await importCoins(user.id, id, await file.text(), commit);

    return NextResponse.json(report);
  } catch (error) {
    return errorResponse(error);
  }
}
