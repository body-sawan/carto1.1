type LogLevel = "debug" | "info" | "warn" | "error";

class Logger {
  private write(level: LogLevel, message: string, meta?: unknown) {
    const line = { level, message, timestamp: new Date().toISOString(), meta };
    const output = JSON.stringify(line);
    if (level === "error") console.error(output);
    else if (level === "warn") console.warn(output);
    else console.log(output);
  }

  debug(message: string, meta?: unknown) {
    this.write("debug", message, meta);
  }

  info(message: string, meta?: unknown) {
    this.write("info", message, meta);
  }

  warn(message: string, meta?: unknown) {
    this.write("warn", message, meta);
  }

  error(message: string, meta?: unknown) {
    this.write("error", message, meta);
  }
}

export const logger = new Logger();

