import { ConsoleLogger, type LogLevel as NestLogLevel } from '@nestjs/common';
import type { AppConfig } from '../config/app-config.js';

const ORDER: NestLogLevel[] = ['fatal', 'error', 'warn', 'log', 'debug', 'verbose'];

/**
 * App-wide logger: JSON lines in production (one object per line, ready for a log collector),
 * coloured text locally. `LOG_LEVEL` is the most verbose level that is printed.
 */
export function createLogger({ log }: AppConfig): ConsoleLogger {
  return new ConsoleLogger({
    json: log.json,
    colors: !log.json,
    logLevels: ORDER.slice(0, ORDER.indexOf(log.level) + 1),
  });
}
