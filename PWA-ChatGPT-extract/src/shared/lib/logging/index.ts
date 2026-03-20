export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface Logger {
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

const isProd = import.meta.env.PROD === true;

const logToConsole = (
  method: 'debug' | 'info' | 'warn' | 'error',
  ...args: unknown[]
): void => {
  if (typeof console === 'undefined') {
    return;
  }

  const fn = (console as any)[method] ?? console.log;
  if (typeof fn !== 'function') {
    return;
  }

  fn(...args);
};

const logger: Logger = {
  debug: (...args: unknown[]) => {
    if (!isProd) {
      logToConsole('debug', ...args);
    }
  },
  info: (...args: unknown[]) => {
    if (!isProd) {
      logToConsole('info', ...args);
    }
  },
  warn: (...args: unknown[]) => {
    // In productie alleen waarschuwingen loggen, overige niveaus zijn optioneel/no-op.
    logToConsole('warn', ...args);
  },
  error: (...args: unknown[]) => {
    // Fouten worden altijd gelogd, ook in productie.
    logToConsole('error', ...args);
  },
};

export const debug = (...args: unknown[]): void => logger.debug(...args);
export const info = (...args: unknown[]): void => logger.info(...args);
export const warn = (...args: unknown[]): void => logger.warn(...args);
export const error = (...args: unknown[]): void => logger.error(...args);

export default logger;
