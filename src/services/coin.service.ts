import {
  coinRepository,
  type Coin,
  type CoinPatch,
  type CoinSortBy,
  type CoinSortDir,
} from "@/repositories/coin.repository";
import { collectionRepository } from "@/repositories/collection.repository";
import { createCoinSchema, updateCoinSchema } from "@/lib/validation/coin";
import { NotFoundError, ValidationError } from "@/lib/errors";

export const COINS_PAGE_SIZE = 20;

const VALID_SORT_BY = new Set<CoinSortBy>(["name", "category", "metal", "denomination", "year", "createdAt"]);

export type CoinSearch = {
  q?: string;
  metal?: string;
  category?: string;
  year?: number;
  page?: number;
  sortBy?: string;
  sortDir?: string;
};

export type CoinSearchResult = {
  coins: Coin[];
  total: number;
  page: number;
  pageSize: number;
};

// Business logic for coins. A coin's tenant is the owner of its collection, so
// every use case is gated on the acting user owning the relevant collection.
// Framework-agnostic: data access goes through repositories only.

async function assertOwnsCollection(
  userId: string,
  collectionId: string,
): Promise<void> {
  const owned = await collectionRepository.findByIdForUser(collectionId, userId);
  if (!owned) throw new NotFoundError("Collection not found");
}

export async function listCoins(
  userId: string,
  collectionId: string,
): Promise<Coin[]> {
  await assertOwnsCollection(userId, collectionId);
  return coinRepository.listByCollection(collectionId);
}

export async function searchCoins(
  userId: string,
  collectionId: string,
  search: CoinSearch,
): Promise<CoinSearchResult> {
  await assertOwnsCollection(userId, collectionId);
  const page = Math.max(1, Math.floor(search.page ?? 1));
  const pageSize = COINS_PAGE_SIZE;
  const sortBy = VALID_SORT_BY.has(search.sortBy as CoinSortBy)
    ? (search.sortBy as CoinSortBy)
    : undefined;
  const sortDir: CoinSortDir | undefined =
    search.sortDir === "asc" || search.sortDir === "desc" ? search.sortDir : undefined;

  const { coins, total } = await coinRepository.searchInCollection(collectionId, {
    q: search.q?.trim() || undefined,
    metal: search.metal?.trim() || undefined,
    category: search.category?.trim() || undefined,
    year: Number.isFinite(search.year) ? search.year : undefined,
    sortBy,
    sortDir,
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });
  return { coins, total, page, pageSize };
}

export async function getCoinFacets(
  userId: string,
  collectionId: string,
): Promise<{ metals: string[]; categories: string[] }> {
  await assertOwnsCollection(userId, collectionId);
  return coinRepository.getDistinctFacets(collectionId);
}

export async function getCoin(userId: string, coinId: string): Promise<Coin> {
  const coin = await coinRepository.findByIdForUser(coinId, userId);
  if (!coin) throw new NotFoundError("Coin not found");
  return coin;
}

export async function addCoin(
  userId: string,
  collectionId: string,
  input: unknown,
): Promise<Coin> {
  const data = createCoinSchema.parse(input);
  await assertOwnsCollection(userId, collectionId);
  return coinRepository.create({ collectionId, ...data });
}

export async function editCoin(
  userId: string,
  coinId: string,
  input: unknown,
): Promise<Coin> {
  const data = updateCoinSchema.parse(input);
  // Drop omitted fields so we only update what was provided (and never .set({})).
  const patch = Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined),
  ) as CoinPatch;
  if (Object.keys(patch).length === 0) {
    throw new ValidationError("No fields to update");
  }
  const updated = await coinRepository.updateForUser(coinId, userId, patch);
  if (!updated) throw new NotFoundError("Coin not found");
  return updated;
}

export async function deleteCoin(userId: string, coinId: string): Promise<void> {
  const deleted = await coinRepository.deleteForUser(coinId, userId);
  if (!deleted) throw new NotFoundError("Coin not found");
}
