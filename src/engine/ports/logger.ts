export interface Logger {
  info(message: string, fields?: Record<string, unknown>): void;
  warn(message: string, fields?: Record<string, unknown>): void;
  error(message: string, fields?: Record<string, unknown>): void;
}

export const consoleLogger: Logger = {
  info: (m, f) => console.info(m, f ?? {}),
  warn: (m, f) => console.warn(m, f ?? {}),
  error: (m, f) => console.error(m, f ?? {}),
};
