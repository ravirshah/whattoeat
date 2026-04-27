import type { ZodSchema } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

// Gemini's `responseSchema` is an OpenAPI 3.0 schema subset — it rejects
// JSON Schema draft fields like `$schema`, `additionalProperties`, `$ref`,
// `definitions`, `default`, and several others. zod-to-json-schema's
// openApi3 target is closer but still emits some of these, so we scrub the
// output before handing it to the SDK.
//
// Why we ALSO strip numeric/length/items constraints: Gemini compiles
// structured-output schemas to a state machine. Rich constraint metadata
// (minLength, maxLength, minimum, maximum, minItems, maxItems, format,
// pattern) causes "schema produces a constraint that has too many states
// for serving" 400s on non-trivial schemas. We keep validation on our side
// via Zod after the response arrives — the schema we hand to Gemini is
// only a shape hint.
//
// Symptoms this fixes:
//   400 Bad Request: Unknown name "additionalProperties" / "$schema"
//   400 Bad Request: schema produces a constraint that has too many states
// from `models/<model>:generateContent`.

const STRIPPED_KEYS = new Set([
  '$schema',
  '$ref',
  '$id',
  '$comment',
  '$defs',
  'definitions',
  'additionalProperties',
  'patternProperties',
  'unevaluatedProperties',
  'default',
  'examples',
  'const',
  'readOnly',
  'writeOnly',
  'allOf',
  'oneOf',
  'anyOf',
  'not',
  'if',
  'then',
  'else',
  'dependencies',
  'dependentRequired',
  'dependentSchemas',
  // Constraint metadata — kept in Zod for validation, dropped here for Gemini.
  'minLength',
  'maxLength',
  'minimum',
  'maximum',
  'exclusiveMinimum',
  'exclusiveMaximum',
  'multipleOf',
  'minItems',
  'maxItems',
  'uniqueItems',
  'minProperties',
  'maxProperties',
  'pattern',
  'format',
]);

function scrub(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(scrub);
  if (node && typeof node === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      if (STRIPPED_KEYS.has(k)) continue;
      out[k] = scrub(v);
    }
    return out;
  }
  return node;
}

export function zodToGeminiSchema(zod: ZodSchema<unknown>): object {
  const json = zodToJsonSchema(zod, {
    target: 'openApi3',
    $refStrategy: 'none',
  });
  return scrub(json) as object;
}
