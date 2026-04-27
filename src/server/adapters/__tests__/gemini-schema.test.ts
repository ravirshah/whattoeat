import { describe, expect, it } from 'vitest';
import { z } from 'zod';
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

describe('zodToGeminiSchema', () => {
  it('strips $schema and additionalProperties (the keys Gemini rejects)', () => {
    const schema = z.object({
      items: z.array(z.object({ name: z.string(), category: z.string() })),
    });
    const out = zodToGeminiSchema(schema);
    const keys = deepKeys(out);
    expect(keys.has('$schema')).toBe(false);
    expect(keys.has('additionalProperties')).toBe(false);
    expect(keys.has('$ref')).toBe(false);
    expect(keys.has('definitions')).toBe(false);
  });

  it('preserves the structural shape Gemini needs (type, properties, items, required)', () => {
    const schema = z.object({
      items: z.array(z.object({ name: z.string(), category: z.string() })),
    });
    const out = zodToGeminiSchema(schema) as Record<string, unknown>;
    expect(out.type).toBe('object');
    expect((out.properties as Record<string, unknown>).items).toBeDefined();
    const items = (out.properties as Record<string, Record<string, unknown>>).items;
    expect(items.type).toBe('array');
    expect(items.items).toBeDefined();
  });

  it('handles enum values', () => {
    const schema = z.object({
      kind: z.enum(['a', 'b', 'c']),
    });
    const out = zodToGeminiSchema(schema) as Record<string, Record<string, unknown>>;
    const kind = out.properties.kind as { enum: string[] };
    expect(kind.enum).toEqual(['a', 'b', 'c']);
  });
});
