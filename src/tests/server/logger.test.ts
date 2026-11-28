import { describe, expect, it } from 'vitest';
import { OBSERVABILITY_CONFIG } from '@shared/constants/server.ts';
import { isRecord } from '@shared/utils/typeGuards.ts';
import { createLogger, registerSecretForRedaction } from '../../../server/lib/logger.ts';

function parseJsonRecord(raw: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(raw);
  if (!isRecord(parsed)) throw new Error('Expected JSON object');
  return parsed;
}

describe('server/logger structured JSON output and secret redaction', () => {
  it('emits structured JSON lines routed by log level and respects minLevel', () => {
    const stdoutLines: string[] = [];
    const stderrLines: string[] = [];
    const testLogger = createLogger({
      minLevel: 'info',
      writeStdout: (line) => stdoutLines.push(line),
      writeStderr: (line) => stderrLines.push(line),
    });

    testLogger.debug('ignored debug');
    testLogger.info('request finished', { requestId: 'req-123', status: 200 });
    testLogger.warn('upstream slow', { requestId: 'req-123', model: 'gemini-4-hydrogen' });
    testLogger.error('handler crashed', { error: new Error('boom') });

    expect(stdoutLines).toHaveLength(1);
    expect(stderrLines).toHaveLength(2);

    const infoEntry = parseJsonRecord(stdoutLines[0] ?? '');
    expect(infoEntry).toMatchObject({
      level: 'info',
      message: 'request finished',
      requestId: 'req-123',
      status: 200,
    });
    expect(typeof infoEntry.timestamp).toBe('string');

    const errorEntry = parseJsonRecord(stderrLines[1] ?? '');
    expect(errorEntry).toMatchObject({
      level: 'error',
      message: 'handler crashed',
      error: { name: 'Error', message: 'boom' },
    });
  });

  it('redacts sensitive metadata keys, API key patterns, Bearer tokens, and registered secrets', () => {
    const stderrLines: string[] = [];
    registerSecretForRedaction('my-registered-waqi-secret');
    const testLogger = createLogger({
      secrets: ['local-secret-token'],
      writeStderr: (line) => stderrLines.push(line),
    });

    testLogger.error('Upstream failure with Bearer top-secret-jwt and AIzaSySecretKey123456', {
      apiKey: 'plain-key',
      nested: { token: 'abc', queryUrl: 'https://api.example.com?token=hidden123&city=Delhi' },
      leaked: 'prefix my-registered-waqi-secret and local-secret-token',
    });

    const raw = stderrLines[0] ?? '';
    expect(raw).not.toContain('top-secret-jwt');
    expect(raw).not.toContain('AIzaSySecretKey123456');
    expect(raw).not.toContain('plain-key');
    expect(raw).not.toContain('hidden123');
    expect(raw).not.toContain('my-registered-waqi-secret');
    expect(raw).not.toContain('local-secret-token');

    const parsed = parseJsonRecord(raw);
    expect(parsed.apiKey).toBe(OBSERVABILITY_CONFIG.REDACTED_VALUE);
    expect(parsed.message).toContain(`Bearer ${OBSERVABILITY_CONFIG.REDACTED_VALUE}`);
  });
});
