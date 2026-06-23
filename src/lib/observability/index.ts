import { randomUUID } from "node:crypto";
import { logger, type LogContext } from "@/lib/logger";
import type { ErrorReporter } from "./types";

export type { ErrorReporter } from "./types";

// Turn an unknown thrown value into structured, log-safe fields.
function describe(error: unknown): LogContext {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack };
  }
  return { message: String(error) };
}

// Default reporter: log the error at `error` level tagged with a generated id.
// This is the swap-in point for a hosted error monitor (Sentry etc.) — replace
// the implementation here and call sites are unaffected. See ADR-011.
class LoggingErrorReporter implements ErrorReporter {
  captureException(error: unknown, context?: LogContext): string {
    const errorId = randomUUID();
    logger.error("Unhandled error", {
      errorId,
      ...context,
      error: describe(error),
    });
    return errorId;
  }
}

function createErrorReporter(): ErrorReporter {
  return new LoggingErrorReporter();
}

/** Process-wide error reporter, mirroring the other src/lib singletons. */
export const errorReporter: ErrorReporter = createErrorReporter();

/** Convenience wrapper around the singleton reporter. */
export function captureException(error: unknown, context?: LogContext): string {
  return errorReporter.captureException(error, context);
}
