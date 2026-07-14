import { NextResponse } from "next/server";
import { renameCollectionSchema } from "@/lib/validation/collection";
import {
  deleteCollection,
  renameCollection,
} from "@/services/collection.service";
import {
  assertWritable,
  currentUser,
  errorResponse,
  unauthorized,
} from "../../_lib";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const user = await currentUser();
    if (!user) return unauthorized();
    assertWritable(user);
    const { id } = await params;
    const { name } = renameCollectionSchema.parse(await request.json());
    const collection = await renameCollection(user.id, id, name);
    return NextResponse.json({ collection });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const user = await currentUser();
    if (!user) return unauthorized();
    assertWritable(user);
    const { id } = await params;
    await deleteCollection(user.id, id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}
