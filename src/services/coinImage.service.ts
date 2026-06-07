import {
  coinImageRepository,
  type CoinImageData,
  type CoinImageMeta,
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

function validateUpload(mimeType: string, data: Buffer): void {
  if (!isAllowedImageType(mimeType)) {
    throw new ValidationError(
      `Unsupported image type. Allowed: ${ALLOWED_IMAGE_TYPES.join(", ")}.`,
    );
  }
  if (data.length === 0) throw new ValidationError("Image file is empty.");
  if (data.length > MAX_IMAGE_BYTES) {
    throw new ValidationError(
      `Image is too large (max ${Math.round(MAX_IMAGE_BYTES / (1024 * 1024))} MB).`,
    );
  }
}

export async function addCoinImage(
  userId: string,
  coinId: string,
  mimeType: string,
  data: Buffer,
): Promise<string> {
  validateUpload(mimeType, data);
  await assertOwnsCoin(userId, coinId);
  return coinImageRepository.insert(coinId, mimeType, data);
}

export async function listCoinImages(
  userId: string,
  coinId: string,
): Promise<CoinImageMeta[]> {
  await assertOwnsCoin(userId, coinId);
  return coinImageRepository.listByCoinId(coinId);
}

export async function getCoinImage(
  userId: string,
  coinId: string,
  imageId: string,
): Promise<CoinImageData> {
  await assertOwnsCoin(userId, coinId);
  const image = await coinImageRepository.getById(imageId);
  if (!image) throw new NotFoundError("Image not found");
  return image;
}

export async function getFirstCoinImage(
  userId: string,
  coinId: string,
): Promise<CoinImageData> {
  await assertOwnsCoin(userId, coinId);
  const image = await coinImageRepository.getFirstByCoinId(coinId);
  if (!image) throw new NotFoundError("Image not found");
  return image;
}

export async function removeCoinImage(
  userId: string,
  coinId: string,
  imageId: string,
): Promise<void> {
  await assertOwnsCoin(userId, coinId);
  const deleted = await coinImageRepository.deleteById(imageId);
  if (!deleted) throw new NotFoundError("Image not found");
}

// Used by the assistant: adds a new image (does not replace existing ones).
export async function setCoinImage(
  userId: string,
  coinId: string,
  mimeType: string,
  data: Buffer,
): Promise<void> {
  await addCoinImage(userId, coinId, mimeType, data);
}
