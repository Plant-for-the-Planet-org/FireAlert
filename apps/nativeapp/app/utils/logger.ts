type LogData = Record<string, unknown> | unknown[] | unknown;

// `destination` holds an email address, phone number or webhook URL, so it
// must never reach the console. Log only the non-identifying fields.
export function redactAlertMethod(alertMethod: unknown) {
  const value = alertMethod as
    | {
        id?: string;
        method?: string;
        isVerified?: boolean;
        isEnabled?: boolean;
      }
    | null
    | undefined;
  if (!value) {
    return {present: false};
  }
  return {
    id: value.id,
    method: value.method,
    isVerified: value.isVerified,
    isEnabled: value.isEnabled,
  };
}

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
