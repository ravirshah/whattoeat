import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: { '@': resolve(__dirname, './src') },
  },
  test: {
    environment: 'node',
    globals: false,
    include: ['tests/rls/**/*.test.ts'],
    testTimeout: 30_000,
  },
});
