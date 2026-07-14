import { NextResponse } from "next/server";
import sharp from "sharp";
import { getCoinImage, removeCoinImage } from "@/services/coinImage.service";
import {
  assertWritable,
  currentUser,
  errorResponse,
  unauthorized,
} from "../../../../_lib";

type Params = { params: Promise<{ id: string; imageId: string }> };

export async function GET(request: Request, { params }: Params) {
  try {
    const user = await currentUser();
    if (!user) return unauthorized();
    const { id, imageId } = await params;
    const image = await getCoinImage(user.id, id, imageId);

    const wParam = new URL(request.url).searchParams.get("w");
    const width = wParam ? parseInt(wParam, 10) : null;

    if (width && width > 0 && width <= 2000) {
      const resized = await sharp(image.data)
        .resize(width, width, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer();
      return new Response(new Uint8Array(resized), {
        headers: {
          "Content-Type": "image/webp",
          // Image IDs are stable UUIDs; the image never changes — safe to cache forever.
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }

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
    assertWritable(user);
    const { id, imageId } = await params;
    await removeCoinImage(user.id, id, imageId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}
