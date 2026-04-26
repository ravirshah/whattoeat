import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
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
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'tests/**/*.test.ts'],
    exclude: ['node_modules/**', 'tests/rls/**'],
    setupFiles: [],
    environmentMatchGlobs: [
      // Use happy-dom for React component tests
      ['src/app/__tests__/**', 'happy-dom'],
    ],
  },
});
