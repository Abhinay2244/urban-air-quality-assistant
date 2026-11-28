/**
 * @module server/logger
 * Responsibility: Emit structured single-line JSON logs with level filtering and secret redaction.
 * Must not depend on Express request/response objects or log raw API keys, tokens, or payloads.
 */
import { OBSERVABILITY_CONFIG } from '../../shared/constants/server.ts';
import { isRecord } from '../../shared/utils/typeGuards.ts';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type LogMetadata = Record<string, unknown>;

/** Structured JSON logger contract. */
export interface StructuredLogger {
  debug: (message: string, meta?: LogMetadata) => void;
  info: (message: string, meta?: LogMetadata) => void;
  warn: (message: string, meta?: LogMetadata) => void;
  error: (message: string, meta?: LogMetadata) => void;
}

/** Configuration options for createLogger. */
export interface LoggerOptions {
  minLevel?: LogLevel;
  secrets?: readonly string[];
  writeStdout?: (line: string) => void;
  writeStderr?: (line: string) => void;
}

const LEVEL_RANK: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const SENSITIVE_KEY_PATTERN = /(api[_-]?key|token|secret|password|authorization|cookie)/i;
const GOOGLE_KEY_PATTERN = /AIza[0-9A-Za-z_-]{8,}/g;
const BEARER_PATTERN = /(Bearer\s+)\S+/gi;
const QUERY_SECRET_PATTERN = /([?&](?:key|token|api[_-]?key)=)[^&\s]+/gi;
const MAX_DEPTH = 4;

const registeredSecrets = new Set<string>();

function scrubString(value: string, extraSecrets: readonly string[]): string {
  let scrubbed = value
    .replace(GOOGLE_KEY_PATTERN, OBSERVABILITY_CONFIG.REDACTED_VALUE)
    .replace(BEARER_PATTERN, `$1${OBSERVABILITY_CONFIG.REDACTED_VALUE}`)
    .replace(QUERY_SECRET_PATTERN, `$1${OBSERVABILITY_CONFIG.REDACTED_VALUE}`);

  for (const secret of [...registeredSecrets, ...extraSecrets]) {
    if (secret.length >= OBSERVABILITY_CONFIG.MIN_SECRET_LENGTH) {
      scrubbed = scrubbed.split(secret).join(OBSERVABILITY_CONFIG.REDACTED_VALUE);
    }
  }
  return scrubbed;
}

function sanitizeRecord(
  record: Record<string, unknown>,
  extraSecrets: readonly string[],
  depth: number,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(record)) {
    out[k] = SENSITIVE_KEY_PATTERN.test(k)
      ? OBSERVABILITY_CONFIG.REDACTED_VALUE
      : sanitizeValue(v, extraSecrets, depth + 1);
  }
  return out;
}

function sanitizePrimitive(value: unknown, extraSecrets: readonly string[]): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return scrubString(value, extraSecrets);
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (typeof value === 'bigint' || typeof value === 'symbol') {
    return scrubString(String(value), extraSecrets);
  }
  return '[Unserializable]';
}

function sanitizeValue(value: unknown, extraSecrets: readonly string[], depth = 0): unknown {
  if (typeof value !== 'object' || value === null) return sanitizePrimitive(value, extraSecrets);
  if (value instanceof Error) {
    return { name: value.name, message: scrubString(value.message, extraSecrets) };
  }
  if (depth >= MAX_DEPTH) return '[MaxDepth]';
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, extraSecrets, depth + 1));
  }
  return isRecord(value) ? sanitizeRecord(value, extraSecrets, depth) : '[Unserializable]';
}

/** Registers a secret value so any future log line scrubs literal occurrences of it. */
export function registerSecretForRedaction(secret: string | undefined): void {
  if (secret && secret.trim().length >= OBSERVABILITY_CONFIG.MIN_SECRET_LENGTH) {
    registeredSecrets.add(secret.trim());
  }
}

/** Creates a structured JSON logger with automatic secret redaction. */
export function createLogger(options: LoggerOptions = {}): StructuredLogger {
  const minLevel = options.minLevel ?? 'info';
  const extraSecrets = options.secrets ?? [];
  const writeStdout =
    options.writeStdout ?? ((line: string): boolean => process.stdout.write(line));
  const writeStderr =
    options.writeStderr ?? ((line: string): boolean => process.stderr.write(line));

  const emit = (level: LogLevel, message: string, meta?: LogMetadata): void => {
    if (LEVEL_RANK[level] < LEVEL_RANK[minLevel]) return;
    const sanitizedMeta = meta ? sanitizeValue(meta, extraSecrets) : undefined;
    const payload = {
      timestamp: new Date().toISOString(),
      level,
      message: scrubString(message, extraSecrets),
      ...(isRecord(sanitizedMeta) ? sanitizedMeta : {}),
    };
    const line = `${JSON.stringify(payload)}\n`;
    if (level === 'warn' || level === 'error') {
      writeStderr(line);
    } else {
      writeStdout(line);
    }
  };

  return {
    debug: (message, meta) => {
      emit('debug', message, meta);
    },
    info: (message, meta) => {
      emit('info', message, meta);
    },
    warn: (message, meta) => {
      emit('warn', message, meta);
    },
    error: (message, meta) => {
      emit('error', message, meta);
    },
  };
}

/** Shared structured server logger instance. */
export const logger: StructuredLogger = createLogger();
