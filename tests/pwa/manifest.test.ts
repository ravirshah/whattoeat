/**
 * tests/pwa/manifest.test.ts
 *
 * Validates the web app manifest against the PWA installability requirements.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const MANIFEST_PATH = path.join(ROOT, 'public', 'manifest.webmanifest');

interface ManifestIcon {
  src: string;
  sizes: string;
  type?: string;
  purpose?: string;
}

interface WebAppManifest {
  name?: string;
  short_name?: string;
  start_url?: string;
  scope?: string;
  display?: string;
  background_color?: string;
  theme_color?: string;
  icons?: ManifestIcon[];
  [key: string]: unknown;
}

function loadManifest(): WebAppManifest {
  const raw = fs.readFileSync(MANIFEST_PATH, 'utf8');
  return JSON.parse(raw) as WebAppManifest;
}

describe('manifest.webmanifest', () => {
  it('exists at public/manifest.webmanifest', () => {
    expect(fs.existsSync(MANIFEST_PATH)).toBe(true);
  });

  it('is valid JSON', () => {
    expect(() => loadManifest()).not.toThrow();
  });

  it('has required fields: name, short_name, start_url, display', () => {
    const manifest = loadManifest();
    expect(manifest.name).toBeTruthy();
    expect(manifest.short_name).toBeTruthy();
    expect(manifest.start_url).toBeTruthy();
    expect(manifest.display).toBeTruthy();
  });

  it('start_url begins with /', () => {
    const manifest = loadManifest();
    expect(manifest.start_url).toMatch(/^\//);
  });

  it('display is standalone or fullscreen (required for installability)', () => {
    const manifest = loadManifest();
    expect(['standalone', 'fullscreen']).toContain(manifest.display);
  });

  it('has an icons array with at least 2 entries', () => {
    const manifest = loadManifest();
    expect(Array.isArray(manifest.icons)).toBe(true);
    expect(manifest.icons?.length).toBeGreaterThanOrEqual(2);
  });

  it('has a 192x192 icon', () => {
    const manifest = loadManifest();
    const has192 = manifest.icons?.some((icon) => icon.sizes === '192x192');
    expect(has192).toBe(true);
  });

  it('has a 512x512 icon', () => {
    const manifest = loadManifest();
    const has512 = manifest.icons?.some((icon) => icon.sizes === '512x512');
    expect(has512).toBe(true);
  });

  it('has at least one maskable icon', () => {
    const manifest = loadManifest();
    const hasMaskable = manifest.icons?.some((icon) => icon.purpose?.includes('maskable'));
    expect(hasMaskable).toBe(true);
  });

  it('all icon src paths exist under public/', () => {
    const manifest = loadManifest();
    for (const icon of manifest.icons ?? []) {
      const iconPath = path.join(ROOT, 'public', icon.src);
      expect(fs.existsSync(iconPath), `Icon file missing: public${icon.src}`).toBe(true);
    }
  });

  it('theme_color is defined', () => {
    const manifest = loadManifest();
    expect(manifest.theme_color).toBeTruthy();
  });

  it('background_color is defined', () => {
    const manifest = loadManifest();
    expect(manifest.background_color).toBeTruthy();
  });
});
