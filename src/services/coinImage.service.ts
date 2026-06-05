import {
  coinImageRepository,
  type CoinImage,
} from "@/repositories/coinImage.repository";
import { coinRepository } from "@/repositories/coin.repository";
import {
  MAX_IMAGE_BYTES,
  isAllowedImageType,
  ALLOWED_IMAGE_TYPES,
} from "@/lib/images";
import { NotFoundError, ValidationError } from "@/lib/errors";

// Business logic for coin images. A coin image's tenant is the owner of the
// coin's collection, so every use case is gated on the acting user owning the
// coin. Framework-agnostic: data access goes through repositories only.

async function assertOwnsCoin(userId: string, coinId: string): Promise<void> {
  const owned = await coinRepository.findByIdForUser(coinId, userId);
  if (!owned) throw new NotFoundError("Coin not found");
}

export async function setCoinImage(
  userId: string,
  coinId: string,
  mimeType: string,
  data: Buffer,
): Promise<void> {
  if (!isAllowedImageType(mimeType)) {
    throw new ValidationError(
      `Unsupported image type. Allowed: ${ALLOWED_IMAGE_TYPES.join(", ")}.`,
    );
  }
  if (data.length === 0) {
    throw new ValidationError("Image file is empty.");
  }
  if (data.length > MAX_IMAGE_BYTES) {
    throw new ValidationError(
      `Image is too large (max ${Math.round(MAX_IMAGE_BYTES / (1024 * 1024))} MB).`,
    );
  }
  await assertOwnsCoin(userId, coinId);
  await coinImageRepository.upsert(coinId, mimeType, data);
}

export async function getCoinImage(
  userId: string,
  coinId: string,
): Promise<CoinImage> {
  await assertOwnsCoin(userId, coinId);
  const image = await coinImageRepository.getByCoinId(coinId);
  if (!image) throw new NotFoundError("Image not found");
  return image;
}

export async function removeCoinImage(
  userId: string,
  coinId: string,
): Promise<void> {
  await assertOwnsCoin(userId, coinId);
  const deleted = await coinImageRepository.delete(coinId);
  if (!deleted) throw new NotFoundError("Image not found");
}
