import { NextResponse } from "next/server";
import { updateProfileSchema } from "@/lib/validation/user";
import { updateDisplayName } from "@/services/user.service";
import { deleteAccount } from "@/services/account.service";
import {
  assertWritable,
  currentUser,
  errorResponse,
  unauthorized,
} from "../_lib";

// The signed-in user's own account. PATCH edits the profile (display name);
// DELETE permanently removes the account and all its data (ADR-013). The acting
// userId always comes from the session, never the request body.

export async function PATCH(request: Request) {
  try {
    const user = await currentUser();
    if (!user) return unauthorized();
    assertWritable(user);
    const { name } = updateProfileSchema.parse(await request.json());
    const updated = await updateDisplayName(user.id, name);
    return NextResponse.json({ name: updated });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE() {
  try {
    const user = await currentUser();
    if (!user) return unauthorized();
    assertWritable(user);
    await deleteAccount(user.id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}
