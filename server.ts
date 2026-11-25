/**
 * @module server
 * Responsibility: Boot the Express application created by createApp() and bind to PORT on 0.0.0.0.
 * Must not define HTTP routes, middleware, or business logic.
 */
import { createApp, resolveServerPort } from './server/app.ts';
import { SERVER_CONFIG } from './src/constants/server.ts';

async function startServer(): Promise<void> {
  const app = await createApp();
  const port = resolveServerPort(process.env.PORT);
  const server = app.listen(port, SERVER_CONFIG.HOST);
  server.requestTimeout = SERVER_CONFIG.REQUEST_TIMEOUT_MS;
  server.timeout = SERVER_CONFIG.REQUEST_TIMEOUT_MS;
}

void startServer();
