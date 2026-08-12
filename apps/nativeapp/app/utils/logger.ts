type LogData = Record<string, unknown> | unknown[] | unknown;

export function createLogger(tag: string) {
  const prefix = `[AlertMethod:${tag}]`;

  const write = (
    fn: (...args: unknown[]) => void,
    message: string,
    data?: LogData,
  ) => {
    const line = `${prefix} ${new Date().toISOString()} ${message}`;
    if (data !== undefined) {
      fn(line, data);
    } else {
      fn(line);
    }
  };

  return {
    info: (message: string, data?: LogData) => write(console.log, message, data),
    warn: (message: string, data?: LogData) => write(console.warn, message, data),
    error: (message: string, data?: LogData) => write(console.error, message, data),
  };
}
