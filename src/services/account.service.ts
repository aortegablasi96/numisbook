import { userRepository } from "@/repositories/user.repository";
import { coinImageRepository } from "@/repositories/coinImage.repository";
import { coinInvoiceRepository } from "@/repositories/coinInvoice.repository";
import { objectStorage } from "@/lib/storage";
import { logger } from "@/lib/logger";

// Account lifecycle business logic. Framework-agnostic; data access goes through
// repositories. The acting userId always comes from the session, never client
// input (tenant isolation).

/**
 * Permanently delete a user's account and all associated data (ADR-013).
 *
 * Order matters: object-storage keys must be read *before* the rows that hold
 * them are gone. So we (1) enumerate the user's image + invoice storage keys,
 * (2) delete the user row — Postgres foreign keys cascade the entire owned graph
 * (collections → coins → images/invoices/valuations, plus Auth.js
 * accounts/sessions), then (3) best-effort purge the storage blobs a DB cascade
 * can't reach. A purge failure is logged (leaving a re-sweepable orphan) rather
 * than surfaced, mirroring the per-row delete pattern in the media repositories.
 */
export async function deleteAccount(userId: string): Promise<void> {
  const keys = [
    ...(await coinImageRepository.listStorageKeysForUser(userId)),
    ...(await coinInvoiceRepository.listStorageKeysForUser(userId)),
  ];

  await userRepository.deleteById(userId);

  const results = await Promise.allSettled(
    keys.map((key) => objectStorage.delete(key)),
  );
  const failed = results.filter((r) => r.status === "rejected").length;
  if (failed > 0) {
    logger.warn("account deletion left orphaned storage objects", {
      userId,
      failed,
      total: keys.length,
    });
  }
}
