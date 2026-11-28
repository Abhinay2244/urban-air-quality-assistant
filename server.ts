/**
 * @module server
 * Responsibility: Boot the Express application created by createApp() and bind to validated config.port.
 * Must not define HTTP routes, middleware, or business logic.
 */
import { createApp } from './server/app.ts';
import { serverConfig } from './server/lib/config.ts';
import { logger } from './server/lib/logger.ts';
import { SERVER_CONFIG } from './shared/constants/server.ts';

async function startServer(): Promise<void> {
  const app = await createApp(serverConfig);
  const server = app.listen(serverConfig.port, SERVER_CONFIG.HOST, () => {
    logger.info('Server listening', {
      host: SERVER_CONFIG.HOST,
      port: serverConfig.port,
      nodeEnv: serverConfig.nodeEnv,
    });
  });
  server.requestTimeout = SERVER_CONFIG.REQUEST_TIMEOUT_MS;
  server.timeout = SERVER_CONFIG.REQUEST_TIMEOUT_MS;
}

void startServer();
