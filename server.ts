import 'dotenv/config';
import express, { type Express } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { handleLiveAqiLookup } from './server/aqiHandler.ts';
import { handleAssistantRecommendations } from './server/geminiHandler.ts';
import { applySecurityHeaders, createApiRateLimiter } from './server/securityMiddleware.ts';
import { API_ENDPOINTS, SERVER_CONFIG } from './src/constants/limits.ts';

const CURRENT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.resolve(CURRENT_DIR, 'dist');
const INDEX_HTML_PATH = path.resolve(DIST_DIR, 'index.html');
const PRODUCTION_ENV = 'production';

async function configureApp(app: Express): Promise<void> {
  const isProduction = process.env.NODE_ENV === PRODUCTION_ENV;
  app.use(applySecurityHeaders(isProduction));
  app.use(express.json({ limit: SERVER_CONFIG.JSON_BODY_LIMIT }));
  app.use(API_ENDPOINTS.API_PREFIX, createApiRateLimiter());
  app.get(API_ENDPOINTS.AQI_LIVE, handleLiveAqiLookup);
  app.post(API_ENDPOINTS.ASSISTANT_RECOMMENDATIONS, handleAssistantRecommendations);

  if (isProduction && fs.existsSync(DIST_DIR)) {
    app.use(express.static(DIST_DIR));
    app.get('*', (_req, res) => {
      res.sendFile(INDEX_HTML_PATH);
    });
    return;
  }

  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
}

/**
 * Starts the Express + Vite full-stack server on port 3000.
 */
async function startServer(): Promise<void> {
  const app = express();
  await configureApp(app);
  app.listen(SERVER_CONFIG.PORT, SERVER_CONFIG.HOST);
}

void startServer();
