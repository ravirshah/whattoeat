import type { RecommendationContext } from '@/contracts/zod';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Version — bump this whenever prompt text changes
// ---------------------------------------------------------------------------

export const PROMPTS_VERSION = '2026-04-26.1';

// ---------------------------------------------------------------------------
// LLM output schemas (used by FakeLlmClient in tests + GeminiLlmClient in prod)
// ---------------------------------------------------------------------------

/** One concept sketch produced by the plan call. */
export const ConceptSchema = z.object({
  title: z.string().min(1).max(120),
  oneLineWhy: z.string().min(1).max(280),
  cuisine: z.string().max(40).nullable(),
  estMinutes: z.number().int().min(1).max(480),
  pantryFit: z.number().min(0).max(1),
});
export type Concept = z.infer<typeof ConceptSchema>;

export const PlanResponseSchema = z.object({
  concepts: z.array(ConceptSchema).min(1).max(10),
});
export type PlanResponse = z.infer<typeof PlanResponseSchema>;

/** Full recipe produced by the detail call for one concept. */
export const DetailResponseSchema = z.object({
  title: z.string().min(1).max(120),
  oneLineWhy: z.string().min(1).max(280),
  ingredients: z
    .array(
      z.object({
        name: z.string().min(1).max(120),
        qty: z.number().nonnegative().nullable(),
        unit: z.string().max(20).nullable(),
        note: z.string().max(120).nullable().optional(),
      }),
    )
    .min(1)
    .max(50),
  steps: z
    .array(
      z.object({
        idx: z.number().int().min(1),
        text: z.string().min(1).max(800),
        durationMin: z.number().int().nonnegative().nullable().optional(),
      }),
    )
    .min(1)
    .max(40),
  estMacros: z.object({
    kcal: z.number().int().nonnegative(),
    protein_g: z.number().int().nonnegative(),
    carbs_g: z.number().int().nonnegative(),
    fat_g: z.number().int().nonnegative(),
  }),
  servings: z.number().int().min(1).max(20),
  totalMinutes: z.number().int().min(1).max(480),
  cuisine: z.string().max(40).nullable(),
  tags: z.array(z.string().min(1).max(40)).default([]),
  pantryCoverage: z.number().min(0).max(1),
  missingItems: z.array(z.string()).default([]),
});
export type DetailResponse = z.infer<typeof DetailResponseSchema>;

/** Rationale batch — one sentence per final pick + an overall summary. */
export const RationaleResponseSchema = z.object({
  overall: z.string().min(1).max(500),
  perMeal: z
    .array(
      z.object({
        title: z.string().min(1).max(120),
        rationale: z.string().min(1).max(280),
      }),
    )
    .min(1)
    .max(5),
});
export type RationaleResponse = z.infer<typeof RationaleResponseSchema>;

// ---------------------------------------------------------------------------
// Prompt builders
// ---------------------------------------------------------------------------

/** Serialise context deterministically (sorted keys) for cache-eligibility. */
function stableJson(value: unknown): string {
  return JSON.stringify(value, Object.keys(value as object).sort() as never);
}

export const SYSTEM_PROMPT_BASE = `You are a personal meal-recommendation engine.
You produce structured JSON matching the exact schema provided.
Rules:
- Respect all allergies absolutely — never include a forbidden ingredient even as a substitute.
- Honour the user's goal (cut = calorie deficit, maintain = at targets, bulk = surplus).
- Use only ingredients that are plausibly available or easy to obtain; prefer pantry items.
- Portions are for the stated servings count.
- oneLineWhy is sharp, personal, and reads like advice from a knowledgeable friend who cooks.
- Respond ONLY with valid JSON. No markdown fences, no prose outside JSON.`;

export function buildPlanPrompt(ctx: RecommendationContext): {
  system: string;
  user: string;
} {
  const system = `${SYSTEM_PROMPT_BASE}

Task: Given the user's context, propose ${ctx.request.candidateCount + 2} distinct meal concepts.
Return a JSON object: { "concepts": [ { "title", "oneLineWhy", "cuisine", "estMinutes", "pantryFit" } ] }
pantryFit is a 0-1 float estimating what fraction of ingredients the user already has.`;

  const user = stableJson({
    goal: ctx.profile.goal,
    targets: ctx.profile.targets,
    allergies: ctx.profile.allergies,
    dislikes: ctx.profile.dislikes,
    equipment: ctx.profile.equipment,
    pantry: ctx.pantry.map((p) => p.name),
    checkin: ctx.checkin ?? null,
    signals: ctx.signals ?? null,
    request: ctx.request,
    promptsVersion: PROMPTS_VERSION,
  });

  return { system, user };
}

export function buildDetailPrompt(
  concept: Concept,
  ctx: RecommendationContext,
): { system: string; user: string } {
  const system = `${SYSTEM_PROMPT_BASE}

Task: Expand the given meal concept into a full recipe.
Return a JSON object matching the DetailResponse schema exactly.`;

  const user = stableJson({
    concept,
    goal: ctx.profile.goal,
    targets: ctx.profile.targets,
    allergies: ctx.profile.allergies,
    equipment: ctx.profile.equipment,
    pantry: ctx.pantry.map((p) => p.name),
    request: ctx.request,
    promptsVersion: PROMPTS_VERSION,
  });

  return { system, user };
}

export function buildRationalePrompt(
  titles: string[],
  ctx: RecommendationContext,
): { system: string; user: string } {
  const system = `${SYSTEM_PROMPT_BASE}

Task: For the given list of chosen meals, write a brief overall rationale and one sharp sentence per meal explaining why it suits the user right now.
Return: { "overall": string, "perMeal": [{ "title": string, "rationale": string }] }`;

  const user = stableJson({
    chosenMeals: titles,
    goal: ctx.profile.goal,
    checkin: ctx.checkin ?? null,
    signals: ctx.signals ?? null,
    promptsVersion: PROMPTS_VERSION,
  });

  return { system, user };
}
