import type { DetailResponse, PlanResponse, RationaleResponse } from '@/engine/prompt';
import { PlanResponseSchema, RationaleResponseSchema } from '@/engine/prompt';
import type { LlmClient, LlmGenerateArgs, LlmGenerateResult } from '@/engine/types';

// ---------------------------------------------------------------------------
// Canned LLM responses (used by FakeLlmClient)
// ---------------------------------------------------------------------------

const CANNED_PLAN: PlanResponse = {
  concepts: [
    {
      title: 'Grilled Chicken & Rice',
      oneLineWhy: 'High-protein, hits your targets cleanly.',
      cuisine: 'american',
      estMinutes: 25,
      pantryFit: 0.9,
    },
    {
      title: 'Greek Yogurt Parfait',
      oneLineWhy: 'Fast, protein-dense, no cooking required.',
      cuisine: 'mediterranean',
      estMinutes: 5,
      pantryFit: 0.85,
    },
    {
      title: 'Egg & Veggie Scramble',
      oneLineWhy: 'Versatile breakfast-or-any-time protein hit.',
      cuisine: 'american',
      estMinutes: 15,
      pantryFit: 0.8,
    },
    {
      title: 'Tuna Salad Wrap',
      oneLineWhy: 'Lean protein, pantry-friendly, 10 minutes.',
      cuisine: 'american',
      estMinutes: 10,
      pantryFit: 0.75,
    },
    {
      title: 'Oats with Almond Butter',
      oneLineWhy: 'Slow carbs + healthy fats for sustained energy.',
      cuisine: 'american',
      estMinutes: 8,
      pantryFit: 0.7,
    },
  ],
};

function makeDetail(title: string, allergenFree = true): DetailResponse {
  return {
    title,
    oneLineWhy: `${title} — great choice.`,
    ingredients: allergenFree
      ? [
          { name: 'chicken breast', qty: 200, unit: 'g', note: null },
          { name: 'white rice', qty: 150, unit: 'g', note: null },
        ]
      : [
          { name: 'peanut butter', qty: 30, unit: 'g', note: null }, // allergen
          { name: 'bread', qty: 60, unit: 'g', note: null },
        ],
    steps: [
      { idx: 1, text: 'Prepare ingredients.', durationMin: 5 },
      { idx: 2, text: 'Cook until done.', durationMin: 20 },
    ],
    estMacros: { kcal: 500, protein_g: 45, carbs_g: 50, fat_g: 10 },
    servings: 1,
    totalMinutes: 25,
    cuisine: 'american',
    tags: ['high-protein'],
    pantryCoverage: 0.9,
    missingItems: [],
  };
}

const CANNED_RATIONALE: RationaleResponse = {
  overall: 'These picks match your goal and pantry well.',
  perMeal: [
    { title: 'Grilled Chicken & Rice', rationale: 'Hits your protein target in one go.' },
    { title: 'Greek Yogurt Parfait', rationale: 'Fast and filling — good when time is short.' },
    { title: 'Egg & Veggie Scramble', rationale: 'Versatile and uses what you have.' },
  ],
};

// ---------------------------------------------------------------------------
// FakeLlmClient — returns canned responses; validates output schema
// ---------------------------------------------------------------------------

export class FakeLlmClient implements LlmClient {
  /** Override individual responses for targeted tests. */
  constructor(
    private readonly overrides: {
      plan?: PlanResponse;
      detail?: (title: string) => DetailResponse;
      rationale?: RationaleResponse;
    } = {},
  ) {}

  async generateStructured<T>(args: LlmGenerateArgs<T>): Promise<LlmGenerateResult<T>> {
    // Detect which call this is by schema shape inspection.
    const isPlan = args.schema === (PlanResponseSchema as unknown);
    const isRationale = args.schema === (RationaleResponseSchema as unknown);

    let raw: unknown;

    if (isPlan) {
      raw = this.overrides.plan ?? CANNED_PLAN;
    } else if (isRationale) {
      raw = this.overrides.rationale ?? CANNED_RATIONALE;
    } else {
      // Detail call — infer the title from the user prompt JSON.
      let title = 'Grilled Chicken & Rice';
      try {
        const parsed = JSON.parse(args.user) as { concept?: { title?: string } };
        title = parsed.concept?.title ?? title;
      } catch {
        // ignore
      }
      raw = this.overrides.detail ? this.overrides.detail(title) : makeDetail(title);
    }

    const value = args.schema.parse(raw) as T;
    return {
      value,
      tokens: { prompt: 100, completion: 50 },
      modelUsed: 'fake-llm-v1',
    };
  }
}

// ---------------------------------------------------------------------------
// AlwaysThrowsLlmClient — every call throws LlmInvalidJsonError
// ---------------------------------------------------------------------------

import { LlmInvalidJsonError } from '@/engine/errors';

export class AlwaysThrowsLlmClient implements LlmClient {
  async generateStructured<T>(_args: LlmGenerateArgs<T>): Promise<LlmGenerateResult<T>> {
    throw new LlmInvalidJsonError('Simulated parse failure');
  }
}

// ---------------------------------------------------------------------------
// FailOnceLlmClient — first call throws, subsequent calls delegate to Fake
// ---------------------------------------------------------------------------

export class FailOnceLlmClient implements LlmClient {
  private callCount = 0;
  private readonly delegate = new FakeLlmClient();

  async generateStructured<T>(args: LlmGenerateArgs<T>): Promise<LlmGenerateResult<T>> {
    this.callCount += 1;
    if (this.callCount === 1) {
      throw new LlmInvalidJsonError('Simulated first-call failure');
    }
    return this.delegate.generateStructured(args);
  }
}

// ---------------------------------------------------------------------------
// AllergenDetailFakeClient — detail calls return allergen-containing ingredients
// ---------------------------------------------------------------------------

export class AllergenDetailFakeClient extends FakeLlmClient {
  constructor() {
    super({
      detail: (title) => makeDetail(title, false),
    });
  }
}
