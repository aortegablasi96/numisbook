import { NextResponse } from "next/server";
import { deleteCoin, editCoin } from "@/services/coin.service";
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
    const coin = await editCoin(user.id, id, await request.json());
    return NextResponse.json({ coin });
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
    await deleteCoin(user.id, id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}
