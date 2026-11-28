import express from 'express';
import { readFileSync } from 'fs';
import path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { API_ENDPOINTS, HTTP_STATUS } from '@shared/constants/http.ts';
import { OBSERVABILITY_CONFIG } from '@shared/constants/server.ts';
import { isRecord } from '@shared/utils/typeGuards.ts';
import { createLogger } from '../../../server/lib/logger.ts';
import { createRequestContextMiddleware } from '../../../server/middleware/requestContext.ts';
import { withEphemeralServer } from '../fixtures/serverHarness.ts';
import { createTestApp } from '../fixtures/testApp.ts';

function toRecord(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) throw new Error('Expected object payload');
  return value;
}

describe('request-ID middleware, request logging, and GET /api/health', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reuses valid incoming x-request-id or generates one, sets response header, and logs safely', async () => {
    const stdoutLines: string[] = [];
    const testLogger = createLogger({ writeStdout: (line) => stdoutLines.push(line) });

    await withEphemeralServer(
      () => {
        const app = express();
        app.use(express.json());
        app.use(createRequestContextMiddleware(testLogger));
        app.post('/api/echo', (_req, res) => res.status(HTTP_STATUS.OK).json({ ok: true }));
        return app;
      },
      async (baseUrl) => {
        const customRes = await fetch(`${baseUrl}/api/echo?secret=omit-me`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            [OBSERVABILITY_CONFIG.REQUEST_ID_HEADER]: 'client-trace-42',
          },
          body: JSON.stringify({ sensitiveBodyField: 'never-log-me' }),
        });
        expect(customRes.headers.get(OBSERVABILITY_CONFIG.REQUEST_ID_HEADER)).toBe(
          'client-trace-42',
        );

        const generatedRes = await fetch(`${baseUrl}/api/echo`, { method: 'POST' });
        const generatedId = generatedRes.headers.get(OBSERVABILITY_CONFIG.REQUEST_ID_HEADER);
        expect(generatedId).toBeTruthy();
        expect(generatedId).not.toBe('client-trace-42');
        const staticRes = await fetch(`${baseUrl}/`);
        expect(staticRes.headers.get(OBSERVABILITY_CONFIG.REQUEST_ID_HEADER)).toBeTruthy();
      },
    );

    expect(stdoutLines).toHaveLength(2);
    const firstLog = toRecord(JSON.parse(stdoutLines[0] ?? ''));
    expect(firstLog).toMatchObject({
      level: 'info',
      method: 'POST',
      path: '/api/echo',
      status: 200,
      requestId: 'client-trace-42',
    });
    expect(typeof firstLog.durationMs).toBe('number');
    expect(stdoutLines[0]).not.toContain('never-log-me');
    expect(stdoutLines[0]).not.toContain('omit-me');
  });

  it('serves GET /api/health with status ok, uptimeSeconds, and package.json version without fetch', async () => {
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const fetchSpy = vi.fn<typeof fetch>();
    const pkg = toRecord(
      JSON.parse(readFileSync(path.resolve(process.cwd(), 'package.json'), 'utf8')),
    );

    await withEphemeralServer(
      () => createTestApp({}, { fetch: fetchSpy }),
      async (baseUrl) => {
        const res = await fetch(`${baseUrl}${API_ENDPOINTS.HEALTH}`);
        expect(res.status).toBe(HTTP_STATUS.OK);
        expect(res.headers.get(OBSERVABILITY_CONFIG.REQUEST_ID_HEADER)).toBeTruthy();
        const body = toRecord(await res.json());
        expect(body.status).toBe(OBSERVABILITY_CONFIG.HEALTH_STATUS_OK);
        expect(typeof body.uptimeSeconds).toBe('number');
        expect(body.version).toBe(pkg.version);
      },
    );

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
