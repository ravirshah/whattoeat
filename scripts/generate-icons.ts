#!/usr/bin/env bun
/**
 * scripts/generate-icons.ts
 *
 * Generates PWA icon PNGs from a single source SVG using sharp.
 * Produces four output files:
 *   public/icons/icon-192.png          — standard icon, 192x192, transparent bg
 *   public/icons/icon-512.png          — standard icon, 512x512, transparent bg
 *   public/icons/icon-maskable-192.png — maskable icon, 192x192, amber bg + 10% padding
 *   public/icons/icon-maskable-512.png — maskable icon, 512x512, amber bg + 10% padding
 *
 * Run: bun run scripts/generate-icons.ts
 * Prerequisite: bun add -d sharp
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const ICONS_DIR = path.join(ROOT, 'public', 'icons');
const SOURCE_SVG = path.join(ICONS_DIR, 'icon.svg');

// Brand amber (#D97706) as RGB components
const AMBER_R = 217;
const AMBER_G = 119;
const AMBER_B = 6;

// The maskable safe zone is 10% inset on each side (W3C recommendation).
const MASKABLE_PADDING_RATIO = 0.1;

async function generateStandard(size: number): Promise<void> {
  const out = path.join(ICONS_DIR, `icon-${size}.png`);
  await sharp(SOURCE_SVG)
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(out);
  console.info(`  Generated ${path.relative(ROOT, out)}`);
}

async function generateMaskable(size: number): Promise<void> {
  const out = path.join(ICONS_DIR, `icon-maskable-${size}.png`);

  const padding = Math.round(size * MASKABLE_PADDING_RATIO);
  const innerSize = size - padding * 2;

  const innerPng = await sharp(SOURCE_SVG)
    .resize(innerSize, innerSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: AMBER_R, g: AMBER_G, b: AMBER_B, alpha: 1 },
    },
  })
    .composite([{ input: innerPng, gravity: 'center' }])
    .png()
    .toFile(out);

  console.info(`  Generated ${path.relative(ROOT, out)}`);
}

async function main(): Promise<void> {
  if (!fs.existsSync(SOURCE_SVG)) {
    console.error(`Source SVG not found: ${SOURCE_SVG}`);
    process.exit(1);
  }

  fs.mkdirSync(ICONS_DIR, { recursive: true });

  console.info('Generating PWA icons...');
  await generateStandard(192);
  await generateStandard(512);
  await generateMaskable(192);
  await generateMaskable(512);
  console.info('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
