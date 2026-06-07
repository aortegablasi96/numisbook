import { promises as fs } from "node:fs";
import path from "node:path";
import type { ObjectStorage } from "./types";

// Local-filesystem object storage for development. Lets the app run with no
// cloud credentials (same DX philosophy as the assistant degrading without
// OPENAI_API_KEY). Bytes are written under `rootDir` (gitignored), keyed by the
// same storage keys used in production — never into Postgres. Not for
// production: serverless filesystems (Vercel) are ephemeral.
export class FsStorage implements ObjectStorage {
  constructor(private readonly rootDir: string) {}

  private resolve(key: string): string {
    // Keys are app-generated (coins/<uuid>/<uuid>), but guard against any path
    // escaping the root regardless.
    const full = path.resolve(this.rootDir, key);
    const root = path.resolve(this.rootDir);
    if (full !== root && !full.startsWith(root + path.sep)) {
      throw new Error(`Invalid storage key: ${key}`);
    }
    return full;
  }

  // contentType is part of the ObjectStorage contract but irrelevant on disk;
  // the mime type is persisted alongside the DB row.
  async put(key: string, body: Buffer, _contentType?: string): Promise<void> {
    const target = this.resolve(key);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, body);
  }

  async get(key: string): Promise<Buffer | null> {
    try {
      return await fs.readFile(this.resolve(key));
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw err;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await fs.unlink(this.resolve(key));
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    }
  }
}
