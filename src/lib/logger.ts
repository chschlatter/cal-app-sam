// @ts-check

/**
 * Simple LLRT-compatible logger with conditional output
 *
 * Accumulates debug logs in memory during request execution.
 * - On error: flush() outputs all accumulated logs to CloudWatch
 * - On success: clear() discards accumulated logs silently
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
}

class SimpleLogger {
  private logs: LogEntry[] = [];

  private formatContext(context?: Record<string, unknown>): string {
    if (!context || Object.keys(context).length === 0) return "";
    try {
      return " " + JSON.stringify(context);
    } catch {
      return " [context serialization failed]";
    }
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    this.logs.push({
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
    });
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.log("debug", message, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log("info", message, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.log("warn", message, context);
  }

  error(message: string, context?: Record<string, unknown>): void {
    this.log("error", message, context);
  }

  /**
   * Flush all accumulated logs to console (called on errors)
   */
  flush(): void {
    for (const entry of this.logs) {
      const contextStr = this.formatContext(entry.context);
      console.log(`${entry.timestamp} ${entry.level.toUpperCase()} ${entry.message}${contextStr}`);
    }
    this.clear();
  }

  /**
   * Clear accumulated logs without printing (called on success)
   */
  clear(): void {
    this.logs = [];
  }
}

export const logger = new SimpleLogger();

// Custom PrintFunc for Hono logger that routes through our logger
// This ensures Hono's HTTP access logs also respect the flush/clear behavior
export const honoPrintFunc = (str: string, ...rest: string[]): void => {
  const message = [str, ...rest].join(" ");
  // HTTP access logs go to info level (only printed on flush)
  logger.info(message);
};

export type AppLogger = SimpleLogger;
