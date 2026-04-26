#!/usr/bin/env bun
/**
 * scripts/assert-pwa-build.ts
 *
 * Post-build CI assertion script for PWA artifacts.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

let failures = 0;

function assert(condition: boolean, message: string): void {
  if (condition) {
    console.info(`  PASS  ${message}`);
  } else {
    console.error(`  FAIL  ${message}`);
    failures++;
  }
}

function readJson(filePath: string): Record<string, unknown> | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as Record<string, unknown>;
  } catch {
    return null;
  }
}

console.info('\nChecking manifest.webmanifest...');

const manifestPath = path.join(ROOT, 'public', 'manifest.webmanifest');
assert(fs.existsSync(manifestPath), 'manifest.webmanifest exists');

const manifest = readJson(manifestPath);
assert(manifest !== null, 'manifest.webmanifest is valid JSON');

if (manifest) {
  assert(typeof manifest.name === 'string' && manifest.name.length > 0, 'manifest.name is set');
  assert(typeof manifest.short_name === 'string', 'manifest.short_name is set');
  assert(typeof manifest.start_url === 'string', 'manifest.start_url is set');
  assert(
    manifest.display === 'standalone' || manifest.display === 'fullscreen',
    'manifest.display is standalone or fullscreen',
  );
  assert(Array.isArray(manifest.icons), 'manifest.icons is an array');

  const icons = manifest.icons as Array<{ src: string; sizes: string; purpose?: string }>;
  assert(
    icons.some((i) => i.sizes === '192x192'),
    'manifest has a 192x192 icon',
  );
  assert(
    icons.some((i) => i.sizes === '512x512'),
    'manifest has a 512x512 icon',
  );
  assert(
    icons.some((i) => i.purpose?.includes('maskable')),
    'manifest has at least one maskable icon',
  );
  assert(typeof manifest.theme_color === 'string', 'manifest.theme_color is set');
}

console.info('\nChecking public/sw.js...');

const swPath = path.join(ROOT, 'public', 'sw.js');
assert(fs.existsSync(swPath), 'public/sw.js exists (Workbox plugin ran)');

if (fs.existsSync(swPath)) {
  const swContent = fs.readFileSync(swPath, 'utf8');
  assert(swContent.length > 1024, 'public/sw.js is non-trivially sized (> 1 KB)');
  assert(
    swContent.includes('workbox') || swContent.includes('__WB_MANIFEST'),
    'public/sw.js contains Workbox markers',
  );
  assert(
    !swContent.includes('self.__WB_MANIFEST'),
    'self.__WB_MANIFEST placeholder has been replaced by injectManifest',
  );
}

console.info('\nChecking PWA icon files...');

const expectedIcons = [
  'icon-192.png',
  'icon-512.png',
  'icon-maskable-192.png',
  'icon-maskable-512.png',
];

for (const iconFile of expectedIcons) {
  const iconPath = path.join(ROOT, 'public', 'icons', iconFile);
  assert(fs.existsSync(iconPath), `public/icons/${iconFile} exists`);

  if (fs.existsSync(iconPath)) {
    const { size } = fs.statSync(iconPath);
    assert(size > 2048, `public/icons/${iconFile} is non-trivially sized (> 2 KB)`);
  }
}

console.info('');
if (failures === 0) {
  console.info('All PWA build assertions passed.');
  process.exit(0);
} else {
  console.error(`${failures} assertion(s) failed. Fix the issues above before merging.`);
  process.exit(1);
}
