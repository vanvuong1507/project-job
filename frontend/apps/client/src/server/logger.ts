/**
 * Minimal structured logger: JSON lines in production (for log collectors), readable lines in development.
 * No `server-only` import on purpose: `instrumentation.ts` uses it and isn't bundled for React Server.
 */

type Level = 'debug' | 'info' | 'warn' | 'error';
type Fields = Record<string, unknown>;

const LEVELS: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const minLevel = LEVELS[(process.env.LOG_LEVEL as Level) ?? 'info'] ?? LEVELS.info;
const pretty = process.env.NODE_ENV !== 'production';

function serializeError(error: unknown): Fields | undefined {
  if (!(error instanceof Error)) return error === undefined ? undefined : { value: String(error) };
  return { name: error.name, message: error.message, stack: error.stack };
}

function write(level: Level, message: string, fields: Fields) {
  if (LEVELS[level] < minLevel) return;
  const { error, ...rest } = fields;
  const entry = {
    time: new Date().toISOString(),
    level,
    message,
    ...rest,
    error: serializeError(error),
  };
  const line = pretty
    ? `[${level}] ${message} ${JSON.stringify({ ...rest, error: entry.error })}`
    : JSON.stringify(entry);
  // stdout/stderr directly: one line per entry, no console formatting (collectors parse JSON lines).
  (LEVELS[level] >= LEVELS.warn ? process.stderr : process.stdout).write(`${line}\n`);
}

export interface Logger {
  debug(message: string, fields?: Fields): void;
  info(message: string, fields?: Fields): void;
  warn(message: string, fields?: Fields): void;
  error(message: string, fields?: Fields): void;
  /** A logger that adds `bindings` (e.g. `{ requestId }`) to every entry. */
  child(bindings: Fields): Logger;
}

function createLogger(bindings: Fields = {}): Logger {
  return {
    debug: (message, fields = {}) => write('debug', message, { ...bindings, ...fields }),
    info: (message, fields = {}) => write('info', message, { ...bindings, ...fields }),
    warn: (message, fields = {}) => write('warn', message, { ...bindings, ...fields }),
    error: (message, fields = {}) => write('error', message, { ...bindings, ...fields }),
    child: (more) => createLogger({ ...bindings, ...more }),
  };
}

export const logger = createLogger({ app: 'client' });
