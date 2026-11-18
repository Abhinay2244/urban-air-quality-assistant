import 'dotenv/config';
import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  API_ENDPOINTS,
  ERROR_CODES,
  ERROR_MESSAGES,
  HTTP_STATUS,
  SERVER_CONFIG,
} from '../src/constants/limits.ts';
import { isRecord } from '../src/utils/typeGuards.ts';
import { handleLiveAqiLookup } from './aqiHandler.ts';
import { sendErrorResponse } from './errorResponse.ts';
import { handleAssistantRecommendations } from './geminiHandler.ts';
import { applySecurityHeaders, createApiRateLimiter } from './securityMiddleware.ts';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST_DIR = path.resolve(ROOT_DIR, 'dist');
const INDEX_HTML_PATH = path.resolve(DIST_DIR, 'index.html');
const PRODUCTION_ENV = 'production';
const TEST_ENV = 'test';
const ENTITY_TOO_LARGE_TYPE = 'entity.too.large';

function apiErrorMiddleware(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  const errType = isRecord(err) && typeof err.type === 'string' ? err.type : undefined;
  const errStatus = isRecord(err) && typeof err.status === 'number' ? err.status : undefined;

  if (errStatus === HTTP_STATUS.PAYLOAD_TOO_LARGE || errType === ENTITY_TOO_LARGE_TYPE) {
    sendErrorResponse(
      res,
      HTTP_STATUS.PAYLOAD_TOO_LARGE,
      ERROR_CODES.PAYLOAD_TOO_LARGE,
      ERROR_MESSAGES.PAYLOAD_TOO_LARGE,
    );
    return;
  }

  if (err instanceof SyntaxError && errStatus === HTTP_STATUS.BAD_REQUEST) {
    sendErrorResponse(
      res,
      HTTP_STATUS.BAD_REQUEST,
      ERROR_CODES.VALIDATION_ERROR,
      ERROR_MESSAGES.INVALID_JSON,
    );
    return;
  }

  sendErrorResponse(
    res,
    HTTP_STATUS.INTERNAL_SERVER_ERROR,
    ERROR_CODES.UNKNOWN_ERROR,
    ERROR_MESSAGES.AI_REQUEST_FAILED,
  );
}

/**
 * Configures and returns the Express application with security middleware, API routes,
 * JSON 404/error handlers, and production static or Vite dev frontend serving.
 */
export async function createApp(): Promise<Express> {
  const app = express();
  const isProduction = process.env.NODE_ENV === PRODUCTION_ENV;

  app.set('trust proxy', 1);
  app.use(applySecurityHeaders(isProduction));
  app.use(express.json({ limit: SERVER_CONFIG.JSON_BODY_LIMIT }));
  app.use(API_ENDPOINTS.API_PREFIX, createApiRateLimiter());
  app.get(API_ENDPOINTS.AQI_LIVE, handleLiveAqiLookup);
  app.post(API_ENDPOINTS.ASSISTANT_RECOMMENDATIONS, handleAssistantRecommendations);

  app.use(API_ENDPOINTS.API_PREFIX, (_req: Request, res: Response): void => {
    sendErrorResponse(
      res,
      HTTP_STATUS.NOT_FOUND,
      ERROR_CODES.NOT_FOUND,
      ERROR_MESSAGES.API_ROUTE_NOT_FOUND,
    );
  });
  app.use(apiErrorMiddleware);

  if (process.env.NODE_ENV === TEST_ENV || process.env.VITEST === 'true') {
    return app;
  }

  if (isProduction && fs.existsSync(DIST_DIR)) {
    app.use(express.static(DIST_DIR));
    app.get('*', (_req, res) => {
      res.sendFile(INDEX_HTML_PATH);
    });
    return app;
  }

  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
  return app;
}
