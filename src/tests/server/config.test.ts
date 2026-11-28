import { describe, expect, it, vi } from 'vitest';
import { loadServerConfig } from '../../../server/lib/config.ts';
import { ENV_CONFIG, SERVER_CONFIG } from '@shared/constants/server.ts';

describe('server/config 12-factor validation', () => {
  it('applies defaults, freezes config, and logs a warning when GEMINI_API_KEY is missing', () => {
    const warn = vi.fn();
    const config = loadServerConfig({}, { warn });

    expect(Object.isFrozen(config)).toBe(true);
    expect(config).toEqual({
      port: SERVER_CONFIG.PORT,
      geminiApiKey: undefined,
      aqiApiKey: undefined,
      nodeEnv: ENV_CONFIG.DEFAULT_NODE_ENV,
      isProduction: false,
      isTest: false,
    });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toContain('GEMINI_API_KEY');
  });

  it('parses valid config values and strips .env.example placeholder keys', () => {
    const warn = vi.fn();
    const config = loadServerConfig(
      {
        PORT: '8080',
        NODE_ENV: 'production',
        GEMINI_API_KEY: '  AIzaValidSampleKey12345  ',
        AQI_API_KEY: ENV_CONFIG.AQI_PLACEHOLDER,
      },
      { warn },
    );

    expect(config).toEqual({
      port: 8080,
      geminiApiKey: 'AIzaValidSampleKey12345',
      aqiApiKey: undefined,
      nodeEnv: 'production',
      isProduction: true,
      isTest: false,
    });
    expect(warn).not.toHaveBeenCalled();

    const placeholderGemini = loadServerConfig(
      { GEMINI_API_KEY: ENV_CONFIG.GEMINI_PLACEHOLDER },
      { warn },
    );
    expect(placeholderGemini.geminiApiKey).toBeUndefined();
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('throws descriptive errors for invalid PORT or NODE_ENV values', () => {
    const silentWarn = { warn: vi.fn() };
    expect(() => loadServerConfig({ PORT: 'abc' }, silentWarn)).toThrow('Invalid PORT');
    expect(() => loadServerConfig({ PORT: '0' }, silentWarn)).toThrow('Invalid PORT');
    expect(() => loadServerConfig({ PORT: '70000' }, silentWarn)).toThrow('Invalid PORT');
    expect(() => loadServerConfig({ NODE_ENV: 'staging' }, silentWarn)).toThrow('Invalid NODE_ENV');
  });
});
