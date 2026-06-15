import {
  collectionRepository,
  type Collection,
  type CollectionWithCount,
} from "@/repositories/collection.repository";
import { collectionNameSchema } from "@/lib/validation/collection";
import { NotFoundError, ValidationError } from "@/lib/errors";

// Business logic for collections. Every use case is scoped to the acting user
// so collections stay private to their owner. Framework-agnostic: no
// Request/Response, no React — data access goes through the repository only.

function normalizeName(name: string): string {
  const result = collectionNameSchema.safeParse(name);
  if (!result.success) {
    throw new ValidationError(result.error.issues[0]?.message ?? "Invalid name");
  }
  return result.data;
}

export async function listCollections(
  userId: string,
): Promise<CollectionWithCount[]> {
  return collectionRepository.listByUserWithCounts(userId);
}

export async function getCollection(
  userId: string,
  id: string,
): Promise<Collection> {
  const collection = await collectionRepository.findByIdForUser(id, userId);
  if (!collection) throw new NotFoundError("Collection not found");
  return collection;
}

export async function createCollection(
  userId: string,
  name: string,
): Promise<Collection> {
  return collectionRepository.create({ userId, name: normalizeName(name) });
}

export async function renameCollection(
  userId: string,
  id: string,
  name: string,
): Promise<Collection> {
  const updated = await collectionRepository.update(id, userId, {
    name: normalizeName(name),
  });
  if (!updated) throw new NotFoundError("Collection not found");
  return updated;
}

export async function deleteCollection(
  userId: string,
  id: string,
): Promise<void> {
  const deleted = await collectionRepository.delete(id, userId);
  if (!deleted) throw new NotFoundError("Collection not found");
}
