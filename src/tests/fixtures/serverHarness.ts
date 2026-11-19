import type { Express } from 'express';

/** Starts an ephemeral HTTP server for an Express instance and closes it after running assertions. */
export async function withEphemeralServer(
  createOrSetup: () => Promise<Express> | Express,
  run: (baseUrl: string) => Promise<void>,
): Promise<void> {
  const app = await createOrSetup();
  const server = app.listen(0);
  try {
    const address = server.address();
    if (!address || typeof address === 'string') {
      throw new Error('Expected TCP server address');
    }
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    server.close();
  }
}
