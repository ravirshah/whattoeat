'use server';

import type { MealCandidate } from '@/contracts/zod/recommendation';
import { filterCandidates } from '@/engine/filter';
import { DetailResponseSchema } from '@/engine/prompt';
import { buildModifyPrompt } from '@/engine/prompt';
import { resolveClient } from '@/lib/feed-me/resolveClient';
import { requireUser } from '@/server/auth/index';
import { ServerError } from '@/server/contracts';
import type { ActionResult } from '@/server/contracts';
import { getRecommendationRun } from '@/server/recommendation/repo';
import { z } from 'zod';

const ModifyInputSchema = z.object({
  runId: z.string().uuid(),
  candidateIndex: z.number().int().min(0).max(4),
  instruction: z.string().min(1).max(500),
  priorTweaks: z.array(z.string().max(500)).max(10).default([]),
});

export async function modifyRecipe(
  input: z.input<typeof ModifyInputSchema>,
): Promise<ActionResult<MealCandidate>> {
  const parsed = ModifyInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: new ServerError(
        'validation_failed',
        parsed.error.issues[0]?.message ?? 'Invalid input',
      ),
    };
  }
  const { runId, candidateIndex, instruction, priorTweaks } = parsed.data;

  let userId: string;
  try {
    const user = await requireUser();
    userId = user.userId;
  } catch {
    return { ok: false, error: new ServerError('unauthorized', 'Not authenticated') };
  }

  const run = await getRecommendationRun(runId, userId);
  if (!run) {
    return { ok: false, error: new ServerError('not_found', 'Recommendation run not found') };
  }

  const original = run.candidates[candidateIndex];
  if (!original) {
    return { ok: false, error: new ServerError('not_found', 'Candidate index out of range') };
  }

  const { system, user: userMsg } = buildModifyPrompt(original, instruction, priorTweaks, {
    profile: run.context.profile,
  });

  const llm = resolveClient();
  const result = await llm.generateStructured({
    system,
    user: userMsg,
    schema: DetailResponseSchema,
    modelHint: 'strong',
    timeoutMs: 30_000,
  });

  const detail = result.value;

  const candidate: MealCandidate = {
    title: detail.title,
    oneLineWhy: detail.oneLineWhy,
    ingredients: detail.ingredients,
    steps: detail.steps,
    estMacros: detail.estMacros,
    servings: detail.servings,
    totalMinutes: detail.totalMinutes,
    cuisine: detail.cuisine,
    tags: detail.tags ?? [],
    pantryCoverage: detail.pantryCoverage,
    missingItems: detail.missingItems ?? [],
  };

  const filterResult = filterCandidates([candidate], run.context);

  if (filterResult.droppedAllergen.length > 0) {
    return {
      ok: false,
      error: new ServerError(
        'engine_safety',
        'ALLERGEN_REINTRODUCED: The modification introduced a forbidden ingredient. Try a different instruction.',
      ),
    };
  }

  const originalKcal = original.estMacros.kcal;
  const isExplicitKcalChange =
    /\b(kcal|calori|lighter|heavier|low.?carb|high.?cal|half the carb)/i.test(instruction);

  if (!isExplicitKcalChange && originalKcal > 0) {
    const ratio = candidate.estMacros.kcal / originalKcal;
    if (ratio < 0.8 || ratio > 1.2) {
      return {
        ok: false,
        error: new ServerError(
          'engine_failed',
          `Calorie drift too large (${candidate.estMacros.kcal} vs original ${originalKcal} kcal). Retry or be more specific.`,
        ),
      };
    }
  }

  return { ok: true, value: candidate };
}
