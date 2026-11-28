/**
 * @module server/healthHandler
 * Responsibility: Serve GET /api/health with process uptime and package.json version without external calls.
 * Must not call external APIs, read request bodies, or expose environment secrets.
 */
import type { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { HTTP_STATUS } from '../../shared/constants/http.ts';
import { OBSERVABILITY_CONFIG } from '../../shared/constants/server.ts';
import { isRecord } from '../../shared/utils/typeGuards.ts';

const DEFAULT_VERSION = '0.0.0';

function resolvePackageJsonPath(): string {
  if (import.meta.url.startsWith('file:')) {
    return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../package.json');
  }
  return path.resolve(process.cwd(), 'package.json');
}

function readPackageVersion(): string {
  try {
    const parsed: unknown = JSON.parse(fs.readFileSync(resolvePackageJsonPath(), 'utf8'));
    if (isRecord(parsed) && typeof parsed.version === 'string' && parsed.version.trim() !== '') {
      return parsed.version.trim();
    }
  } catch {
    return DEFAULT_VERSION;
  }
  return DEFAULT_VERSION;
}

const APP_VERSION = readPackageVersion();

/**
 * Express handler returning { status: 'ok', uptimeSeconds, version } without calling external services.
 */
export function handleHealthCheck(_req: Request, res: Response): void {
  res.status(HTTP_STATUS.OK).json({
    status: OBSERVABILITY_CONFIG.HEALTH_STATUS_OK,
    uptimeSeconds: Math.floor(process.uptime()),
    version: APP_VERSION,
  });
}
