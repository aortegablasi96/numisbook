import {
  coinBillRepository,
  type CoinBillData,
  type CoinBillMeta,
} from "@/repositories/coinBill.repository";
import { coinRepository } from "@/repositories/coin.repository";
import { MAX_BILL_BYTES, isAllowedBillType, ALLOWED_BILL_TYPES } from "@/lib/bills";
import { NotFoundError, ValidationError } from "@/lib/errors";

// Business logic for coin bills (auction/seller PDF receipts). A bill's tenant is
// the owner of the coin's collection, so every use case is gated on the acting
// user owning the coin. Framework-agnostic: data access goes through
// repositories only. Mirrors coinImage.service.

async function assertOwnsCoin(userId: string, coinId: string): Promise<void> {
  const owned = await coinRepository.findByIdForUser(coinId, userId);
  if (!owned) throw new NotFoundError("Coin not found");
}

function validateUpload(mimeType: string, data: Buffer): void {
  if (!isAllowedBillType(mimeType)) {
    throw new ValidationError(
      `Unsupported bill type. Allowed: ${ALLOWED_BILL_TYPES.join(", ")}.`,
    );
  }
  if (data.length === 0) throw new ValidationError("Bill file is empty.");
  if (data.length > MAX_BILL_BYTES) {
    throw new ValidationError(
      `Bill is too large (max ${Math.round(MAX_BILL_BYTES / (1024 * 1024))} MB).`,
    );
  }
}

export async function addCoinBill(
  userId: string,
  coinId: string,
  mimeType: string,
  filename: string | null,
  data: Buffer,
): Promise<string> {
  validateUpload(mimeType, data);
  await assertOwnsCoin(userId, coinId);
  return coinBillRepository.insert(coinId, mimeType, filename, data);
}

export async function listCoinBills(
  userId: string,
  coinId: string,
): Promise<CoinBillMeta[]> {
  await assertOwnsCoin(userId, coinId);
  return coinBillRepository.listByCoinId(coinId);
}

export async function getCoinBill(
  userId: string,
  coinId: string,
  billId: string,
): Promise<CoinBillData> {
  await assertOwnsCoin(userId, coinId);
  const bill = await coinBillRepository.getById(billId);
  if (!bill) throw new NotFoundError("Bill not found");
  return bill;
}

export async function removeCoinBill(
  userId: string,
  coinId: string,
  billId: string,
): Promise<void> {
  await assertOwnsCoin(userId, coinId);
  const deleted = await coinBillRepository.deleteById(billId);
  if (!deleted) throw new NotFoundError("Bill not found");
}
