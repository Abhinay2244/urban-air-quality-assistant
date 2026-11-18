import { createApp } from './server/app.ts';
import { SERVER_CONFIG } from './src/constants/limits.ts';

async function startServer(): Promise<void> {
  const app = await createApp();
  app.listen(SERVER_CONFIG.PORT, SERVER_CONFIG.HOST);
}

void startServer();
