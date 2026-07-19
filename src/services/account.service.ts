import { userRepository } from "@/repositories/user.repository";
import { coinImageRepository } from "@/repositories/coinImage.repository";
import { coinInvoiceRepository } from "@/repositories/coinInvoice.repository";
import { objectStorage } from "@/lib/storage";
import { forgetUserUsage } from "@/services/assistant-limits.service";
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
 *
 * Step (4) forgets the user's assistant usage. `assistant_usage` has no foreign
 * key — its subject key is polymorphic (ADR-018 §4) — so the cascade cannot
 * reach it, and rows left behind would still carry the deleted user's id.
 *
 * Unlike the storage purge above it, **a failed usage purge propagates**: an
 * orphaned blob is invisible and re-sweepable, whereas an orphaned usage row is
 * the privacy defect this step exists to prevent. Do not "make it consistent"
 * with the best-effort purge beside it.
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

  await forgetUserUsage(userId);
}
