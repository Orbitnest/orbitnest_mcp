type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

let currentLevel: LogLevel = 'info';

export function setLogLevel(level: string): void {
  if (level in LEVELS) {
    currentLevel = level as LogLevel;
  }
}

function shouldLog(level: LogLevel): boolean {
  return LEVELS[level] >= LEVELS[currentLevel];
}

function format(level: LogLevel, message: string, data?: Record<string, unknown>): string {
  const timestamp = new Date().toISOString();
  const base = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  if (data) {
    return `${base} ${JSON.stringify(data)}`;
  }
  return base;
}

export const logger = {
  debug(message: string, data?: Record<string, unknown>) {
    if (shouldLog('debug')) console.error(format('debug', message, data));
  },
  info(message: string, data?: Record<string, unknown>) {
    if (shouldLog('info')) console.error(format('info', message, data));
  },
  warn(message: string, data?: Record<string, unknown>) {
    if (shouldLog('warn')) console.error(format('warn', message, data));
  },
  error(message: string, data?: Record<string, unknown>) {
    if (shouldLog('error')) console.error(format('error', message, data));
  },
};
