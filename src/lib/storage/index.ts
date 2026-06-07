import path from "node:path";
import type { ObjectStorage } from "./types";
import { S3Storage } from "./s3";
import { FsStorage } from "./fs";

export type { ObjectStorage } from "./types";

// Selects the object-storage backend from the environment:
//   - S3-compatible (Cloudflare R2 etc.) when the R2_* vars are present;
//   - local filesystem otherwise, so dev/test run with no cloud credentials.
// The bytes never live in Postgres in either case.
function createObjectStorage(): ObjectStorage {
  const endpoint = process.env.R2_ENDPOINT;
  const bucket = process.env.R2_BUCKET;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (endpoint && bucket && accessKeyId && secretAccessKey) {
    return new S3Storage({
      endpoint,
      bucket,
      accessKeyId,
      secretAccessKey,
      // R2 ignores the region but the SDK requires one; "auto" is R2's default.
      region: process.env.R2_REGION ?? "auto",
    });
  }

  return new FsStorage(path.resolve(process.cwd(), ".storage"));
}

// Singleton storage client, mirroring the `db` singleton in src/db.
export const objectStorage: ObjectStorage = createObjectStorage();
