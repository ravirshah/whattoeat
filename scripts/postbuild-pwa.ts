#!/usr/bin/env bun
/**
 * scripts/postbuild-pwa.ts
 *
 * Runs after `next build` to compile the service worker and inject the
 * Workbox precache manifest. This is called by the `build` npm script.
 *
 * Inputs:
 *   src/app/sw.ts              — service worker TypeScript source
 *   .next/app-build-manifest.json — Next.js 15 App Router build manifest
 *   .next/build-manifest.json  — Next.js static asset manifest
 *   public/**                  — static public assets to precache
 *
 * Output:
 *   public/sw.js              — precache-injected service worker
 *
 * Skipped when NEXT_PWA_DISABLED=1.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';
import { injectManifest } from 'workbox-build';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

if (process.env.NEXT_PWA_DISABLED === '1') {
  console.info('[postbuild-pwa] NEXT_PWA_DISABLED=1, skipping.');
  process.exit(0);
}

const swSrc = path.join(ROOT, 'src', 'app', 'sw.ts');
const swCompiledJs = path.join(ROOT, '.next', 'sw-source.js');
const swOut = path.join(ROOT, 'public', 'sw.js');

// Step A: Compile sw.ts to a single JS file using esbuild.
console.info('[postbuild-pwa] Compiling sw.ts...');
await esbuild.build({
  entryPoints: [swSrc],
  bundle: true,
  format: 'iife',
  target: 'chrome90',
  platform: 'browser',
  outfile: swCompiledJs,
  minify: false,
  external: [
    'workbox-core',
    'workbox-routing',
    'workbox-strategies',
    'workbox-precaching',
    'workbox-expiration',
  ],
  define: {
    'process.env.NODE_ENV': '"production"',
    __SW_VERSION__: JSON.stringify(Date.now().toString()),
  },
});

// Step B: Read Next.js build manifests.
const appBuildManifestPath = path.join(ROOT, '.next', 'app-build-manifest.json');
const staticManifestPath = path.join(ROOT, '.next', 'build-manifest.json');

// app-build-manifest.json wraps entries in a top-level 'pages' key (Next.js 15).
const appBuildManifestRaw = JSON.parse(fs.readFileSync(appBuildManifestPath, 'utf8')) as {
  pages?: Record<string, string[]>;
};
const appManifest: Record<string, string[]> = appBuildManifestRaw.pages ?? {};

const buildManifest = JSON.parse(fs.readFileSync(staticManifestPath, 'utf8')) as {
  pages: Record<string, string[]>;
};

const staticChunks = new Set<string>();

for (const chunks of Object.values(appManifest)) {
  for (const chunk of chunks) {
    staticChunks.add(chunk.startsWith('/') ? chunk : `/_next/${chunk}`);
  }
}

for (const chunks of Object.values(buildManifest.pages ?? {})) {
  for (const chunk of chunks) {
    staticChunks.add(chunk.startsWith('/') ? chunk : `/_next/${chunk}`);
  }
}

// Step C: Run workbox-build injectManifest.
console.info('[postbuild-pwa] Running workbox-build injectManifest...');
const { count, size } = await injectManifest({
  swSrc: swCompiledJs,
  swDest: swOut,
  globDirectory: path.join(ROOT, 'public'),
  globPatterns: ['**/*.{png,svg,ico,webmanifest,woff2,woff}'],
  additionalManifestEntries: Array.from(staticChunks).map((url) => ({
    url,
    revision: null,
  })),
  globIgnores: ['sw.js', 'sw.js.map'],
  maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
});

console.info(
  `[postbuild-pwa] Injected precache manifest: ${count} entries, ~${(size / 1024).toFixed(1)} KB`,
);
