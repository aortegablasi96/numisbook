import { getFirstCoinImage } from "@/services/coinImage.service";
import { currentUser, errorResponse, unauthorized } from "../../../_lib";

type Params = { params: Promise<{ id: string }> };

// Serves the first (oldest) image for a coin — kept for thumbnail backward
// compatibility (CoinsManager list view). New uploads go to /images.
export async function GET(_request: Request, { params }: Params) {
  try {
    const user = await currentUser();
    if (!user) return unauthorized();
    const { id } = await params;
    const image = await getFirstCoinImage(user.id, id);
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
