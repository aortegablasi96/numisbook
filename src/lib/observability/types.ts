import type { LogContext } from "@/lib/logger";

// Error-monitoring contract (ADR-011). The app reports unexpected failures
// through this seam so a hosted monitor (e.g. Sentry) can be wired in later as a
// one-file change, without touching call sites. The default implementation
// routes through the structured logger.
export interface ErrorReporter {
  /**
   * Record an unexpected error and return a short correlation id that can be
   * surfaced to the user (e.g. in a 500 response body) and grepped in the logs.
   */
  captureException(error: unknown, context?: LogContext): string;
}
