import { NextResponse } from "next/server";
import { createCollectionSchema } from "@/lib/validation/collection";
import { createCollection, listCollections } from "@/services/collection.service";
import {
  assertWritable,
  currentUser,
  errorResponse,
  unauthorized,
} from "../_lib";

export async function GET() {
  try {
    const user = await currentUser();
    if (!user) return unauthorized();
    const collections = await listCollections(user.id);
    return NextResponse.json({ collections });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await currentUser();
    if (!user) return unauthorized();
    assertWritable(user);
    const { name } = createCollectionSchema.parse(await request.json());
    const collection = await createCollection(user.id, name);
    return NextResponse.json({ collection }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
