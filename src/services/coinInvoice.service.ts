import {
  coinInvoiceRepository,
  type CoinInvoiceData,
  type CoinInvoiceMeta,
} from "@/repositories/coinInvoice.repository";
import { coinRepository } from "@/repositories/coin.repository";
import { MAX_INVOICE_BYTES, isAllowedInvoiceType, ALLOWED_INVOICE_TYPES } from "@/lib/invoices";
import { NotFoundError, ValidationError } from "@/lib/errors";

// Business logic for coin invoices (auction/seller PDF receipts). An invoice's
// tenant is the owner of the coin's collection, so every use case is gated on the
// acting user owning the coin. Framework-agnostic: data access goes through
// repositories only. Mirrors coinImage.service.

async function assertOwnsCoin(userId: string, coinId: string): Promise<void> {
  const owned = await coinRepository.findByIdForUser(coinId, userId);
  if (!owned) throw new NotFoundError("Coin not found");
}

function validateUpload(mimeType: string, data: Buffer): void {
  if (!isAllowedInvoiceType(mimeType)) {
    throw new ValidationError(
      `Unsupported invoice type. Allowed: ${ALLOWED_INVOICE_TYPES.join(", ")}.`,
    );
  }
  if (data.length === 0) throw new ValidationError("Invoice file is empty.");
  if (data.length > MAX_INVOICE_BYTES) {
    throw new ValidationError(
      `Invoice is too large (max ${Math.round(MAX_INVOICE_BYTES / (1024 * 1024))} MB).`,
    );
  }
}

export async function addCoinInvoice(
  userId: string,
  coinId: string,
  mimeType: string,
  filename: string | null,
  data: Buffer,
): Promise<string> {
  validateUpload(mimeType, data);
  await assertOwnsCoin(userId, coinId);
  return coinInvoiceRepository.insert(coinId, mimeType, filename, data);
}

export async function listCoinInvoices(
  userId: string,
  coinId: string,
): Promise<CoinInvoiceMeta[]> {
  await assertOwnsCoin(userId, coinId);
  return coinInvoiceRepository.listByCoinId(coinId);
}

export async function getCoinInvoice(
  userId: string,
  coinId: string,
  invoiceId: string,
): Promise<CoinInvoiceData> {
  await assertOwnsCoin(userId, coinId);
  const invoice = await coinInvoiceRepository.getById(invoiceId);
  if (!invoice) throw new NotFoundError("Invoice not found");
  return invoice;
}

export async function removeCoinInvoice(
  userId: string,
  coinId: string,
  invoiceId: string,
): Promise<void> {
  await assertOwnsCoin(userId, coinId);
  const deleted = await coinInvoiceRepository.deleteById(invoiceId);
  if (!deleted) throw new NotFoundError("Invoice not found");
}
