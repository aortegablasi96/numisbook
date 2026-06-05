import {
  valuationRepository,
  type Valuation,
} from "@/repositories/valuation.repository";
import { coinRepository } from "@/repositories/coin.repository";
import { createValuationSchema } from "@/lib/validation/valuation";
import { NotFoundError } from "@/lib/errors";

// Business logic for valuations. A valuation's tenant is the owner of its coin's
// collection, so every use case is gated on the acting user owning the coin.
// Framework-agnostic: data access goes through repositories only.

async function assertOwnsCoin(userId: string, coinId: string): Promise<void> {
  const owned = await coinRepository.findByIdForUser(coinId, userId);
  if (!owned) throw new NotFoundError("Coin not found");
}

export async function listValuations(
  userId: string,
  coinId: string,
): Promise<Valuation[]> {
  await assertOwnsCoin(userId, coinId);
  return valuationRepository.listByCoin(coinId);
}

export async function recordValuation(
  userId: string,
  coinId: string,
  input: unknown,
): Promise<Valuation> {
  const data = createValuationSchema.parse(input);
  await assertOwnsCoin(userId, coinId);
  return valuationRepository.create({
    coinId,
    // numeric(12,2) is stored/returned as a string; fix to the column scale.
    amount: data.amount.toFixed(2),
    currency: data.currency,
    source: data.source ?? null,
    valuedAt: data.valuedAt,
  });
}
