import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(import.meta.dirname, '../..');

const EXCLUDED_FILES = new Set([
  'src/styles/tokens.css',
  'tailwind.config.ts',
  'src/styles/_no-raw-color.test.ts',
]);

const SCAN_DIRS = ['src/components', 'src/app'];

const HEX_RE = /#[0-9a-fA-F]{3,8}\b/;
const OKLCH_RE = /oklch\s*\(/;

function walkFiles(dir: string): string[] {
  const results: string[] = [];
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return results;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      results.push(...walkFiles(full));
    } else if (/\.(ts|tsx|css|js|jsx)$/.test(entry)) {
      results.push(full);
    }
  }
  return results;
}

function stripLineComments(source: string): string {
  // Remove // single-line comments and /* block */ comments
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '');
}

describe('no-raw-color guard', () => {
  const files = SCAN_DIRS.flatMap((d) => walkFiles(join(ROOT, d))).filter((f) => {
    const rel = relative(ROOT, f).replace(/\\/g, '/');
    return !EXCLUDED_FILES.has(rel);
  });

  it('should have files to scan', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const file of files) {
    const rel = relative(ROOT, file).replace(/\\/g, '/');
    it(`${rel} — no raw hex or oklch`, () => {
      const src = stripLineComments(readFileSync(file, 'utf8'));
      const hexMatch = src.match(HEX_RE);
      const oklchMatch = src.match(OKLCH_RE);
      expect(hexMatch, `Raw hex color found: ${hexMatch?.[0]}`).toBeNull();
      expect(oklchMatch, `Raw oklch() found in ${rel}`).toBeNull();
    });
  }
});
