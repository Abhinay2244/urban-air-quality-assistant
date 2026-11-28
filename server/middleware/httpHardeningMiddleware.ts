/**
 * @module server/httpHardeningMiddleware
 * Responsibility: Enforce explicit same-origin CORS, application/json POST Content-Type, and 405 Allow rules.
 * Must not access environment secrets directly or perform domain payload business validation.
 */
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { ERROR_CODES, ERROR_MESSAGES, HTTP_STATUS } from '../../shared/constants/http.ts';
import { CORS_POLICY_CONFIG } from '../../shared/constants/server.ts';
import { sendErrorResponse } from '../lib/errorResponse.ts';

function resolveRequestHost(req: Request): string | null {
  const forwardedHost = req.get('x-forwarded-host')?.split(',')[0]?.trim();
  const host = forwardedHost && forwardedHost.length > 0 ? forwardedHost : req.get('host')?.trim();
  return host && host.length > 0 ? host : null;
}

function parseOriginUrl(rawOrigin: string): URL | null {
  try {
    const parsed = new URL(rawOrigin);
    const validScheme = parsed.protocol === 'http:' || parsed.protocol === 'https:';
    return validScheme && parsed.origin === rawOrigin ? parsed : null;
  } catch {
    return null;
  }
}

function matchesForwardedHost(originUrl: URL, host: string): boolean {
  if (/[/?#@\\\s]/.test(host)) {
    return false;
  }
  try {
    return new URL(`${originUrl.protocol}//${host}`).origin === originUrl.origin;
  } catch {
    return false;
  }
}

function isTrustedSameOrigin(requestOrigin: string, req: Request): boolean {
  const originUrl = parseOriginUrl(requestOrigin);
  const host = originUrl ? resolveRequestHost(req) : null;
  if (!originUrl || !host || !matchesForwardedHost(originUrl, host)) {
    return false;
  }
  return (
    originUrl.protocol === `${req.protocol}:` ||
    (req.protocol === 'http' && originUrl.protocol === 'https:')
  );
}

/**
 * Enforces an explicit same-origin CORS policy without wildcards, echoing only verified same-origin headers.
 */
export function enforceSameOriginCors(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    res.setHeader('Vary', 'Origin');
    const requestOrigin = req.get('origin');
    if (!requestOrigin) {
      next();
      return;
    }

    if (!isTrustedSameOrigin(requestOrigin, req)) {
      sendErrorResponse(
        res,
        HTTP_STATUS.FORBIDDEN,
        ERROR_CODES.FORBIDDEN,
        ERROR_MESSAGES.CORS_ORIGIN_FORBIDDEN,
      );
      return;
    }

    res.setHeader('Access-Control-Allow-Origin', requestOrigin);
    res.setHeader('Access-Control-Allow-Methods', CORS_POLICY_CONFIG.ALLOWED_METHODS);
    res.setHeader('Access-Control-Allow-Headers', CORS_POLICY_CONFIG.ALLOWED_HEADERS);
    if (req.method === 'OPTIONS') {
      res.status(HTTP_STATUS.NO_CONTENT).end();
      return;
    }
    next();
  };
}

/**
 * Rejects POST requests whose Content-Type is not application/json with HTTP 415.
 */
export function requireJsonContentType(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.method === 'POST' && !req.is(CORS_POLICY_CONFIG.JSON_MEDIA_TYPE)) {
      sendErrorResponse(
        res,
        HTTP_STATUS.UNSUPPORTED_MEDIA_TYPE,
        ERROR_CODES.UNSUPPORTED_MEDIA_TYPE,
        ERROR_MESSAGES.UNSUPPORTED_MEDIA_TYPE,
      );
      return;
    }
    next();
  };
}

/**
 * Rejects unsupported HTTP methods on a route with HTTP 405 and an explicit Allow header.
 */
export function rejectUnsupportedMethod(allowedMethods: readonly string[]): RequestHandler {
  const allowHeader = allowedMethods.join(', ');
  return (_req: Request, res: Response): void => {
    res.setHeader('Allow', allowHeader);
    sendErrorResponse(
      res,
      HTTP_STATUS.METHOD_NOT_ALLOWED,
      ERROR_CODES.METHOD_NOT_ALLOWED,
      ERROR_MESSAGES.METHOD_NOT_ALLOWED,
    );
  };
}
