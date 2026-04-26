import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  resolve: {
    alias: { '@': resolve(__dirname, './src') },
  },
  css: {
    postcss: { plugins: [] },
  },
  test: {
    environment: 'node',
    globals: false,
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    setupFiles: [],
  },
});
