import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      // 'server-only' is a Next.js sentinel that throws in non-Next environments.
      // In Vitest we replace it with an empty module so tests can import
      // server-side files without the runtime guard firing.
      'server-only': resolve(__dirname, './src/__mocks__/server-only.ts'),
    },
  },
  css: {
    postcss: { plugins: [] },
  },
  test: {
    environment: 'node',
    globals: false,
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    exclude: ['node_modules/**', 'tests/rls/**'],
    setupFiles: [],
  },
});
