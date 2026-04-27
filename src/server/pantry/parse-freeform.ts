'use server';

/**
 * Natural-language pantry parser.
 *
 * Accepts a freeform string like:
 *   "2 chicken breasts, half a bag of jasmine rice, leftover salsa, 6 eggs, kale"
 * Returns a deduplicated, categorised list ready for bulk-add.
 *
 * Falls back to a deterministic comma/newline split when no LLM client is
 * configured, so dev/CI without GEMINI_API_KEY still produces something usable.
 */

import { PantryCategory } from '@/contracts/zod/pantry';
import { resolveClient } from '@/lib/feed-me/resolveClient';
import type { ActionResult } from '@/server/contracts';
import { ServerError } from '@/server/contracts';
import { z } from 'zod';

const ParsedItem = z.object({
  name: z.string().min(1).max(80),
  category: PantryCategory,
});
export type ParsedPantryItem = z.infer<typeof ParsedItem>;

const ParsedItems = z.object({
  items: z.array(ParsedItem).max(50),
});

const SYSTEM = `You are a kitchen-savvy assistant that turns freeform pantry notes into a clean, categorised list.

Rules:
- Strip quantities, units, packaging, and qualifiers ("2 lbs of", "half a bag of", "leftover", "frozen", "organic"). Keep the core ingredient noun.
- Normalise plurals to singular ("eggs" -> "egg", "chicken breasts" -> "chicken breast").
- Lowercase everything.
- Use these categories exactly: protein, produce, grain, dairy, pantry, other.
  - protein: meat, poultry, fish, tofu, tempeh, eggs, legumes-as-mainprotein, jerky, deli
  - produce: fruit, vegetables, fresh herbs, mushrooms
  - grain: rice, pasta, bread, oats, quinoa, tortillas, flour, cereal
  - dairy: milk, yogurt, cheese, butter, cream
  - pantry: oils, vinegars, condiments, dried spices, sauces, canned goods, broth, nuts, seeds
  - other: anything that does not cleanly fit above (drinks, sweets, supplements)
- Skip non-food items entirely (do not return them).
- Deduplicate exact matches.
- If the input is empty or contains nothing usable, return an empty array.

Return JSON exactly matching the provided schema. No prose, no markdown.`;

function userPrompt(text: string): string {
  return [
    'Parse this pantry note into structured items:',
    '',
    text.trim(),
    '',
    'Example input: "2 lbs ground beef, half a bag of jasmine rice, salsa, 6 eggs, kale, olive oil"',
    'Example output:',
    JSON.stringify(
      {
        items: [
          { name: 'ground beef', category: 'protein' },
          { name: 'jasmine rice', category: 'grain' },
          { name: 'salsa', category: 'pantry' },
          { name: 'egg', category: 'protein' },
          { name: 'kale', category: 'produce' },
          { name: 'olive oil', category: 'pantry' },
        ],
      },
      null,
      2,
    ),
  ].join('\n');
}

// Deterministic fallback when no LLM is available — splits on commas/newlines
// and tags everything as `other`. Good enough to unblock manual flow.
function fallbackParse(text: string): ParsedPantryItem[] {
  return text
    .split(/[\n,;]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 50)
    .map((name) => ({ name, category: 'other' as const }));
}

export async function parsePantryFreeform(text: string): Promise<ActionResult<ParsedPantryItem[]>> {
  const trimmed = text.trim();
  if (!trimmed) {
    return { ok: false, error: new ServerError('validation_failed', 'Enter at least one item.') };
  }
  if (trimmed.length > 2000) {
    return {
      ok: false,
      error: new ServerError('validation_failed', 'Input is too long — keep it under 2000 chars.'),
    };
  }

  // If the user explicitly asked for a fake client (tests/dev), or no key, fall back.
  if (process.env.RECOMMEND_LLM_CLIENT === 'fake' || !process.env.GEMINI_API_KEY) {
    return { ok: true, value: fallbackParse(trimmed) };
  }

  try {
    const client = resolveClient();
    const result = await client.generateStructured({
      system: SYSTEM,
      user: userPrompt(trimmed),
      schema: ParsedItems,
      modelHint: 'cheap',
      timeoutMs: 12_000,
    });

    // Dedupe by lowercase name — model can occasionally repeat.
    const seen = new Set<string>();
    const items = result.value.items.filter((i) => {
      const key = i.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return { ok: true, value: items };
  } catch (err) {
    // Any failure (timeout, schema, refusal) — fall back to deterministic split
    // rather than blocking the user. The categories will be 'other' but the
    // data is captured; user can re-categorise later.
    console.warn('[parsePantryFreeform] LLM failed, falling back to split:', err);
    return { ok: true, value: fallbackParse(trimmed) };
  }
}
