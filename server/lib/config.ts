/**
 * @module server/config
 * Responsibility: Read and validate server environment variables once at startup into a frozen config object.
 * Must not expose secret values in logs or allow process.env reads elsewhere in server code.
 */
import 'dotenv/config';
import { ENV_CONFIG, SERVER_CONFIG } from '../../shared/constants/server.ts';
import { logger, registerSecretForRedaction, type StructuredLogger } from './logger.ts';

type NodeEnvironment = (typeof ENV_CONFIG.ALLOWED_NODE_ENVS)[number];

/** Immutable, startup-validated server configuration. */
export interface ServerEnvConfig {
  readonly port: number;
  readonly geminiApiKey: string | undefined;
  readonly aqiApiKey: string | undefined;
  readonly nodeEnv: NodeEnvironment;
  readonly isProduction: boolean;
  readonly isTest: boolean;
}

function parsePort(rawPort: string | undefined): number {
  if (!rawPort || rawPort.trim() === '') return SERVER_CONFIG.PORT;
  const parsed = Number(rawPort.trim());
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > SERVER_CONFIG.MAX_PORT) {
    throw new Error(
      `Invalid PORT "${rawPort}": expected integer between 1 and ${SERVER_CONFIG.MAX_PORT}.`,
    );
  }
  return parsed;
}

function parseNodeEnv(rawNodeEnv: string | undefined): NodeEnvironment {
  if (!rawNodeEnv || rawNodeEnv.trim() === '') return ENV_CONFIG.DEFAULT_NODE_ENV;
  const normalized = rawNodeEnv.trim();
  if ((ENV_CONFIG.ALLOWED_NODE_ENVS as readonly string[]).includes(normalized)) {
    return normalized as NodeEnvironment;
  }
  throw new Error(
    `Invalid NODE_ENV "${rawNodeEnv}": expected one of ${ENV_CONFIG.ALLOWED_NODE_ENVS.join(', ')}.`,
  );
}

function normalizeSecret(rawValue: string | undefined, placeholder: string): string | undefined {
  if (!rawValue) return undefined;
  const trimmed = rawValue.trim();
  if (trimmed === '' || trimmed === placeholder) return undefined;
  return trimmed;
}

/**
 * Validates environment variables into a frozen ServerEnvConfig object and warns if GEMINI_API_KEY is missing.
 */
export function loadServerConfig(
  env: NodeJS.ProcessEnv = process.env,
  warnLogger: Pick<StructuredLogger, 'warn'> = logger,
): ServerEnvConfig {
  const port = parsePort(env.PORT);
  const nodeEnv = parseNodeEnv(env.NODE_ENV);
  const geminiApiKey = normalizeSecret(env.GEMINI_API_KEY, ENV_CONFIG.GEMINI_PLACEHOLDER);
  const aqiApiKey = normalizeSecret(env.AQI_API_KEY, ENV_CONFIG.AQI_PLACEHOLDER);

  if (!geminiApiKey) {
    warnLogger.warn(
      'GEMINI_API_KEY is not configured; AI recommendations endpoint will return 503 until set.',
    );
  } else {
    registerSecretForRedaction(geminiApiKey);
  }

  if (aqiApiKey) {
    registerSecretForRedaction(aqiApiKey);
  }

  return Object.freeze({
    port,
    geminiApiKey,
    aqiApiKey,
    nodeEnv,
    isProduction: nodeEnv === 'production',
    isTest: nodeEnv === 'test' || env.VITEST === 'true',
  });
}

/** Frozen server configuration loaded once at application startup. */
export const serverConfig: ServerEnvConfig = loadServerConfig(process.env);
