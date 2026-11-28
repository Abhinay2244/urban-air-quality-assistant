import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, '.'),
      '@shared': path.resolve(import.meta.dirname, 'shared'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['src/tests/setup.ts'],
    include: ['src/tests/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      include: ['src/**/*.{ts,tsx}', 'shared/**/*.ts', 'server/**/*.ts', 'server.ts'],
      exclude: ['src/tests/**', '**/*.test.{ts,tsx}', '*.config.*', 'shared/types/**', '**/*.d.ts'],
      thresholds: {
        statements: 85,
        branches: 75,
        functions: 85,
        lines: 85,
      },
    },
  },
});
