/**
 * @module server/app
 * Responsibility: Composition root wiring middleware, /api routes, JSON 404/error handlers, and frontend serving.
 * Must not contain AQI provider parsing, Gemini prompt assembly, or direct process.listen() calls.
 */
import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  API_ENDPOINTS,
  ERROR_CODES,
  ERROR_MESSAGES,
  HTTP_STATUS,
} from '../shared/constants/http.ts';
import { SERVER_CONFIG } from '../shared/constants/server.ts';
import { isRecord } from '../shared/utils/typeGuards.ts';
import { serverConfig, type ServerEnvConfig } from './lib/config.ts';
import { sendErrorResponse } from './lib/errorResponse.ts';
import {
  enforceSameOriginCors,
  rejectUnsupportedMethod,
  requireJsonContentType,
} from './middleware/httpHardeningMiddleware.ts';
import { createRequestContextMiddleware } from './middleware/requestContext.ts';
import { applySecurityHeaders, createApiRateLimiter } from './middleware/securityMiddleware.ts';
import { DEFAULT_PROVIDER_DEPS, type ProviderDeps } from './providers/providerDeps.ts';
import { createLiveAqiHandler } from './routes/aqiHandler.ts';
import { createCitiesHandler } from './routes/citiesHandler.ts';
import { createAssistantRecommendationsHandler } from './routes/geminiHandler.ts';
import { handleHealthCheck } from './routes/healthHandler.ts';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST_DIR = path.resolve(ROOT_DIR, 'dist');
const INDEX_HTML_PATH = path.resolve(DIST_DIR, 'index.html');
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

/** Resolves the TCP port from a raw string, falling back to SERVER_CONFIG.PORT (3000). */
export function resolveServerPort(rawPort: string | undefined): number {
  if (!rawPort) return SERVER_CONFIG.PORT;
  const parsed = Number(rawPort);
  return Number.isInteger(parsed) && parsed > 0 && parsed <= SERVER_CONFIG.MAX_PORT
    ? parsed
    : SERVER_CONFIG.PORT;
}

/**
 * Configures and returns the Express application composition root with injected provider deps.
 */
export async function createApp(
  config: ServerEnvConfig = serverConfig,
  deps: Partial<ProviderDeps> = {},
): Promise<Express> {
  const app = express();
  const providerDeps: ProviderDeps = { ...DEFAULT_PROVIDER_DEPS, ...deps };

  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(createRequestContextMiddleware());
  app.use(applySecurityHeaders(config.isProduction));
  app.use(API_ENDPOINTS.API_PREFIX, enforceSameOriginCors());
  app.use(express.json({ limit: SERVER_CONFIG.JSON_BODY_LIMIT }));
  app.use(
    API_ENDPOINTS.API_PREFIX,
    createApiRateLimiter(undefined, undefined, undefined, providerDeps.now),
  );

  app.get(API_ENDPOINTS.HEALTH, handleHealthCheck);
  app.all(API_ENDPOINTS.HEALTH, rejectUnsupportedMethod(['GET']));

  app.get(API_ENDPOINTS.AQI_LIVE, createLiveAqiHandler(config, providerDeps));
  app.all(API_ENDPOINTS.AQI_LIVE, rejectUnsupportedMethod(['GET']));

  app.get(API_ENDPOINTS.CITIES_SEARCH, createCitiesHandler(providerDeps));
  app.all(API_ENDPOINTS.CITIES_SEARCH, rejectUnsupportedMethod(['GET']));

  app.post(
    API_ENDPOINTS.ASSISTANT_RECOMMENDATIONS,
    requireJsonContentType(),
    createAssistantRecommendationsHandler(undefined, config, providerDeps.now),
  );
  app.all(API_ENDPOINTS.ASSISTANT_RECOMMENDATIONS, rejectUnsupportedMethod(['POST']));

  app.use(API_ENDPOINTS.API_PREFIX, (_req: Request, res: Response): void => {
    sendErrorResponse(
      res,
      HTTP_STATUS.NOT_FOUND,
      ERROR_CODES.NOT_FOUND,
      ERROR_MESSAGES.API_ROUTE_NOT_FOUND,
    );
  });
  app.use(apiErrorMiddleware);

  if (config.isTest) return app;
  if (config.isProduction && fs.existsSync(DIST_DIR)) {
    app.use(express.static(DIST_DIR));
    app.get('*', (_req, res) => {
      res.sendFile(INDEX_HTML_PATH);
    });
    return app;
  }

  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
  app.use(vite.middlewares);
  return app;
}
