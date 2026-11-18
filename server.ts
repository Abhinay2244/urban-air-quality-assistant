import 'dotenv/config';
import express, { type Express } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { handleAssistantRecommendations } from './server/geminiHandler.ts';
import { API_ENDPOINTS, GEMINI_CONFIG } from './src/constants/limits.ts';

const CURRENT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.resolve(CURRENT_DIR, 'dist');
const INDEX_HTML_PATH = path.resolve(DIST_DIR, 'index.html');
const PRODUCTION_ENV = 'production';

async function configureApp(app: Express): Promise<void> {
  app.use(express.json());
  app.post(API_ENDPOINTS.ASSISTANT_RECOMMENDATIONS, handleAssistantRecommendations);

  if (process.env.NODE_ENV === PRODUCTION_ENV && fs.existsSync(DIST_DIR)) {
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
  app.listen(GEMINI_CONFIG.SERVER_PORT, GEMINI_CONFIG.SERVER_HOST);
}

void startServer();
