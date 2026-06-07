import { NextResponse } from "next/server";
import { addCoinImage, listCoinImages } from "@/services/coinImage.service";
import { ValidationError } from "@/lib/errors";
import { currentUser, errorResponse, unauthorized } from "../../../_lib";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const user = await currentUser();
    if (!user) return unauthorized();
    const { id } = await params;
    const images = await listCoinImages(user.id, id);
    return NextResponse.json({ images: images.map((img) => ({ id: img.id })) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const user = await currentUser();
    if (!user) return unauthorized();
    const { id } = await params;
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      throw new ValidationError("Expected a file upload under the 'file' field.");
    }
    const data = Buffer.from(await file.arrayBuffer());
    const imageId = await addCoinImage(user.id, id, file.type, data);
    return NextResponse.json({ id: imageId }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
