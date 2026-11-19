/**
 * @module server
 * Responsibility: Boot the Express application created by createApp() and bind to the configured port.
 * Must not define HTTP routes, middleware, or business logic.
 */
import { createApp } from './server/app.ts';
import { SERVER_CONFIG } from './src/constants/server.ts';

async function startServer(): Promise<void> {
  const app = await createApp();
  app.listen(SERVER_CONFIG.PORT, SERVER_CONFIG.HOST);
}

void startServer();
