import { healthRepository } from "@/repositories/health.repository";
import { logger } from "@/lib/logger";

// Production diagnostics (ADR-011). Aggregates liveness signals into a single
// report consumed by /api/health (uptime checks, the deploy platform). Framework-
// agnostic: it reports status rather than shaping an HTTP response.

export type DependencyStatus = "up" | "down";

export type HealthReport = {
  status: "ok" | "degraded";
  uptimeSeconds: number;
  db: DependencyStatus;
};

export async function checkHealth(): Promise<HealthReport> {
  let db: DependencyStatus = "up";
  try {
    await healthRepository.ping();
  } catch (error) {
    db = "down";
    logger.error("Health check: database ping failed", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return {
    status: db === "up" ? "ok" : "degraded",
    uptimeSeconds: Math.round(process.uptime()),
    db,
  };
}
