import { DetailResponseSchema } from '@/engine/prompt';
import { describe, expect, it } from 'vitest';
import { zodToGeminiSchema } from '../gemini-schema';

function deepKeys(node: unknown, found: Set<string> = new Set()): Set<string> {
  if (Array.isArray(node)) {
    for (const v of node) deepKeys(v, found);
  } else if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) {
      found.add(k);
      deepKeys(v, found);
    }
  }
  return found;
}

describe('zodToGeminiSchema constraint stripping', () => {
  it('removes numeric/length/items constraints from DetailResponseSchema', () => {
    const out = zodToGeminiSchema(DetailResponseSchema);
    const keys = deepKeys(out);
    for (const k of [
      'minLength',
      'maxLength',
      'minimum',
      'maximum',
      'minItems',
      'maxItems',
      'pattern',
      'format',
      'multipleOf',
    ]) {
      expect(keys.has(k), `expected ${k} to be stripped`).toBe(false);
    }
  });
});
