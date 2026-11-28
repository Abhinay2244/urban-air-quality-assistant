/**
 * @module server/requestContext
 * Responsibility: Correlate requests via x-request-id headers and log request completion without bodies or secrets.
 * Must not inspect request payloads, query secrets, or leak internal headers.
 */
import crypto from 'crypto';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { API_ENDPOINTS } from '../../shared/constants/http.ts';
import { OBSERVABILITY_CONFIG } from '../../shared/constants/server.ts';
import { logger, type StructuredLogger } from '../lib/logger.ts';

const SAFE_REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]+$/;
const ROUND_FACTOR = 100;

function isApiRequestPath(reqPath: string): boolean {
  return reqPath === API_ENDPOINTS.API_PREFIX || reqPath.startsWith(`${API_ENDPOINTS.API_PREFIX}/`);
}

function resolveRequestId(rawHeader: string | undefined): string {
  if (!rawHeader) return crypto.randomUUID();
  const trimmed = rawHeader.trim();
  if (
    trimmed.length === 0 ||
    trimmed.length > OBSERVABILITY_CONFIG.MAX_REQUEST_ID_LENGTH ||
    !SAFE_REQUEST_ID_PATTERN.test(trimmed)
  ) {
    return crypto.randomUUID();
  }
  return trimmed;
}

/** Reads the correlation request ID assigned to the current response context. */
export function getRequestId(res: Response): string | undefined {
  return typeof res.locals.requestId === 'string' ? res.locals.requestId : undefined;
}

/**
 * Express middleware assigning x-request-id (reusing valid incoming header or generating UUID)
 * and logging HTTP method, path, status, durationMs, and requestId for /api requests.
 */
export function createRequestContextMiddleware(
  appLogger: StructuredLogger = logger,
  nowMs: () => number = (): number => performance.now(),
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const requestId = resolveRequestId(req.header(OBSERVABILITY_CONFIG.REQUEST_ID_HEADER));
    res.locals.requestId = requestId;
    res.setHeader(OBSERVABILITY_CONFIG.REQUEST_ID_HEADER, requestId);

    const requestPath = req.path;
    if (isApiRequestPath(requestPath)) {
      const startedAt = nowMs();
      res.on('finish', () => {
        const durationMs = Math.round((nowMs() - startedAt) * ROUND_FACTOR) / ROUND_FACTOR;
        appLogger.info('HTTP request completed', {
          requestId,
          method: req.method,
          path: requestPath,
          status: res.statusCode,
          durationMs,
        });
      });
    }

    next();
  };
}
