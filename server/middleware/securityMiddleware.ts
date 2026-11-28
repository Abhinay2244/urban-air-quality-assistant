/**
 * @module server/securityMiddleware
 * Responsibility: Apply HTTP security headers/CSP and enforce bounded per-IP API rate limiting.
 * Must not inspect application domain payloads or invoke external upstream APIs.
 */
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { ERROR_CODES, ERROR_MESSAGES, HTTP_STATUS } from '../../shared/constants/http.ts';
import { RATE_LIMIT_CONFIG, SECURITY_HEADERS } from '../../shared/constants/server.ts';
import { sendErrorResponse } from '../lib/errorResponse.ts';
import type { ClockFn } from '../providers/providerDeps.ts';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const UNKNOWN_IP = 'unknown';

function pruneExpiredEntries(
  hits: Map<string, RateLimitEntry>,
  now: number,
  maxEntries: number,
): void {
  if (hits.size < maxEntries) {
    return;
  }

  for (const [key, entry] of hits.entries()) {
    if (now >= entry.resetAt) {
      hits.delete(key);
    }
  }

  if (hits.size >= maxEntries) {
    const oldestKey = hits.keys().next().value;
    if (oldestKey !== undefined) {
      hits.delete(oldestKey);
    }
  }
}

/**
 * Express middleware setting baseline HTTP security headers and Vite-compatible CSP.
 */
export function applySecurityHeaders(isProduction: boolean): RequestHandler {
  const csp = isProduction ? SECURITY_HEADERS.PROD_CSP : SECURITY_HEADERS.DEV_CSP;
  return (req: Request, res: Response, next: NextFunction): void => {
    res.setHeader('X-Content-Type-Options', SECURITY_HEADERS.CONTENT_TYPE_OPTIONS);
    res.setHeader('X-Frame-Options', SECURITY_HEADERS.FRAME_OPTIONS);
    res.setHeader('Referrer-Policy', SECURITY_HEADERS.REFERRER_POLICY);
    res.setHeader('Permissions-Policy', SECURITY_HEADERS.PERMISSIONS_POLICY);
    res.setHeader('Cross-Origin-Opener-Policy', SECURITY_HEADERS.CROSS_ORIGIN_OPENER_POLICY);
    res.setHeader('Cross-Origin-Resource-Policy', SECURITY_HEADERS.CROSS_ORIGIN_RESOURCE_POLICY);
    res.setHeader('X-DNS-Prefetch-Control', SECURITY_HEADERS.DNS_PREFETCH_CONTROL);
    res.setHeader('Content-Security-Policy', csp);
    if (req.secure) {
      res.setHeader('Strict-Transport-Security', SECURITY_HEADERS.STRICT_TRANSPORT_SECURITY);
    }
    next();
  };
}

/**
 * Creates an in-memory per-IP fixed-window rate limiter middleware for /api routes
 * with bounded map pruning to prevent unbounded memory growth.
 */
export function createApiRateLimiter(
  maxRequests: number = RATE_LIMIT_CONFIG.MAX_REQUESTS,
  windowMs: number = RATE_LIMIT_CONFIG.WINDOW_MS,
  maxEntries: number = RATE_LIMIT_CONFIG.MAX_TRACKED_IPS,
  nowMs: ClockFn = (): number => Date.now(),
): RequestHandler {
  const hits = new Map<string, RateLimitEntry>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const now = nowMs();
    const clientIp = req.ip ?? req.socket.remoteAddress ?? UNKNOWN_IP;
    const current = hits.get(clientIp);

    // Why: A fixed per-IP window capped by maxEntries bounds upstream Gemini/AQI proxy spend
    // while preventing memory exhaustion under spoofed-IP traffic spikes.
    if (!current || now >= current.resetAt) {
      pruneExpiredEntries(hits, now, maxEntries);
      hits.set(clientIp, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    if (current.count >= maxRequests) {
      const retryAfter = Math.max(
        1,
        Math.ceil((current.resetAt - now) / RATE_LIMIT_CONFIG.MS_PER_SECOND),
      );
      res.setHeader('Retry-After', String(retryAfter));
      sendErrorResponse(
        res,
        HTTP_STATUS.TOO_MANY_REQUESTS,
        ERROR_CODES.RATE_LIMIT_EXCEEDED,
        ERROR_MESSAGES.RATE_LIMIT_EXCEEDED,
      );
      return;
    }

    current.count += 1;
    next();
  };
}
