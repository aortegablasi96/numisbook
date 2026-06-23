import type { Logger, LogContext, LogLevel } from "./types";

export type { Logger, LogContext, LogLevel } from "./types";

// Dependency-free structured logger (ADR-011). One line per call:
//   - JSON in production, so the deploy platform can parse and index it;
//   - a compact human-readable line in development.
// Level and format default from NODE_ENV and can be overridden with LOG_LEVEL
// and LOG_FORMAT. Swapping the sink (e.g. for a hosted log service) is confined
// to this folder, mirroring the provider selection in src/lib/storage.

const SEVERITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

// debug/info → stdout, warn/error → stderr, so platforms split them correctly.
const SINK: Record<LogLevel, (line: string) => void> = {
  debug: (line) => console.debug(line),
  info: (line) => console.info(line),
  warn: (line) => console.warn(line),
  error: (line) => console.error(line),
};

function resolveLevel(): LogLevel {
  const env = process.env.LOG_LEVEL?.toLowerCase();
  if (env && env in SEVERITY) return env as LogLevel;
  return process.env.NODE_ENV === "production" ? "info" : "debug";
}

function resolveFormat(): "json" | "pretty" {
  const env = process.env.LOG_FORMAT?.toLowerCase();
  if (env === "json" || env === "pretty") return env;
  return process.env.NODE_ENV === "production" ? "json" : "pretty";
}

function render(
  format: "json" | "pretty",
  level: LogLevel,
  message: string,
  context?: LogContext,
): string {
  const time = new Date().toISOString();
  if (format === "json") {
    return JSON.stringify({ level, time, msg: message, ...context });
  }
  const fields =
    context && Object.keys(context).length > 0
      ? ` ${JSON.stringify(context)}`
      : "";
  return `${time} ${level.toUpperCase().padEnd(5)} ${message}${fields}`;
}

/**
 * Build a logger, reading LOG_LEVEL/LOG_FORMAT (or NODE_ENV defaults) once. Use
 * the `logger` singleton in app code; this factory exists mainly for tests.
 */
export function createLogger(): Logger {
  const threshold = SEVERITY[resolveLevel()];
  const format = resolveFormat();

  function emit(level: LogLevel, message: string, context?: LogContext): void {
    if (SEVERITY[level] < threshold) return;
    SINK[level](render(format, level, message, context));
  }

  return {
    debug: (m, c) => emit("debug", m, c),
    info: (m, c) => emit("info", m, c),
    warn: (m, c) => emit("warn", m, c),
    error: (m, c) => emit("error", m, c),
  };
}

/** Process-wide logger, mirroring the `db` / `objectStorage` singletons. */
export const logger: Logger = createLogger();
