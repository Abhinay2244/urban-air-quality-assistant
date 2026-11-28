import type { Express } from 'express';
import { createApp } from '../../../server/app.ts';
import { loadServerConfig } from '../../../server/lib/config.ts';
import type { ProviderDeps } from '../../../server/providers/providerDeps.ts';

/**
 * Builds an isolated test Express app from explicit env overrides and injected provider deps.
 */
export function createTestApp(
  envOverrides: NodeJS.ProcessEnv = {},
  deps: Partial<ProviderDeps> = {},
): Promise<Express> {
  const silentWarn = { warn: (): void => undefined };
  return createApp(loadServerConfig({ NODE_ENV: 'test', ...envOverrides }, silentWarn), deps);
}
