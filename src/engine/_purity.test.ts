import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

const ENGINE_DIR = 'src/engine';
const FORBIDDEN = [
  /from '@\/server/,
  /from '@\/db/,
  /from '@\/app/,
  /from 'next/,
  /from '@supabase\//,
  /from 'drizzle-orm/,
  /from 'postgres/,
];

function* walk(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (p.endsWith('.ts') && !p.endsWith('.test.ts')) yield p;
  }
}

describe('engine purity', () => {
  test('no forbidden imports anywhere under src/engine', () => {
    const violations: string[] = [];
    for (const file of walk(ENGINE_DIR)) {
      const content = readFileSync(file, 'utf8');
      for (const pat of FORBIDDEN) {
        if (pat.test(content)) violations.push(`${file}: matches ${pat}`);
      }
    }
    expect(violations).toEqual([]);
  });
});
