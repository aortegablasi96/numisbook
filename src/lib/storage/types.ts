// Object-storage abstraction for binary blobs (currently coin images). The DB
// stores only a `storageKey`; the bytes live behind one of these backends. Keep
// this interface backend-agnostic so swapping providers (R2 → S3 → …) is a
// one-file change in `src/lib/storage`.
export interface ObjectStorage {
  // Store `body` under `key`, overwriting any existing object at that key.
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  // Fetch the bytes at `key`, or `null` if no object exists there.
  get(key: string): Promise<Buffer | null>;
  // Remove the object at `key`. A no-op if it does not exist.
  delete(key: string): Promise<void>;
}
