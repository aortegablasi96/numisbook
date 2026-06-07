import { NextResponse } from "next/server";
import { getCoinImage, removeCoinImage } from "@/services/coinImage.service";
import { currentUser, errorResponse, unauthorized } from "../../../../_lib";

type Params = { params: Promise<{ id: string; imageId: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const user = await currentUser();
    if (!user) return unauthorized();
    const { id, imageId } = await params;
    const image = await getCoinImage(user.id, id, imageId);
    return new Response(new Uint8Array(image.data), {
      headers: {
        "Content-Type": image.mimeType,
        "Cache-Control": "private, no-cache",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const user = await currentUser();
    if (!user) return unauthorized();
    const { id, imageId } = await params;
    await removeCoinImage(user.id, id, imageId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}
