// Structured-logging contract (ADR-011). The app logs through this interface so
// the concrete sink (a JSON/pretty console writer today) can be swapped without
// touching call sites.

export type LogLevel = "debug" | "info" | "warn" | "error";

/** Arbitrary structured fields attached to a log line (requestId, userId, …). */
export type LogContext = Record<string, unknown>;

export interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
}
