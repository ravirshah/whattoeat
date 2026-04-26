import type { MealCandidate, RecommendationContext } from '@/contracts/zod';

// ---------------------------------------------------------------------------
// Weights — must sum to 1
// ---------------------------------------------------------------------------

export const SCORE_WEIGHTS = {
  pantry: 0.4,
  macros: 0.35,
  time: 0.25,
} as const satisfies Record<string, number>;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** 0-1 score for how close the candidate macros are to the target. */
function macroAlignmentScore(candidate: MealCandidate, ctx: RecommendationContext): number {
  const { targets } = ctx.profile;
  const { estMacros } = candidate;

  // Weighted divergence: kcal counts most, then protein, then carbs/fat equally.
  const fields: Array<{ actual: number; target: number; weight: number }> = [
    { actual: estMacros.kcal, target: targets.kcal, weight: 0.5 },
    { actual: estMacros.protein_g, target: targets.protein_g, weight: 0.3 },
    { actual: estMacros.carbs_g, target: targets.carbs_g, weight: 0.1 },
    { actual: estMacros.fat_g, target: targets.fat_g, weight: 0.1 },
  ];

  let divergence = 0;
  for (const { actual, target, weight } of fields) {
    if (target === 0) continue;
    const ratio = Math.abs(actual - target) / target;
    // Cap per-field divergence at 1 (100% off = worst)
    divergence += weight * Math.min(ratio, 1);
  }

  return Math.max(0, 1 - divergence);
}

/** 0-1 score for time fit: 1 if within budget, degrades linearly over budget. */
function timeScore(candidate: MealCandidate, ctx: RecommendationContext): number {
  const budget = ctx.request.timeBudgetMin;
  if (budget == null) {
    // No constraint — give everyone a neutral mid score so it doesn't distort ranking.
    return 0.5;
  }
  if (candidate.totalMinutes <= budget) return 1;
  // Over budget: penalty grows linearly; 2× over budget → score 0.
  const overRatio = (candidate.totalMinutes - budget) / budget;
  return Math.max(0, 1 - overRatio);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns a 0-1 score for a candidate given the recommendation context.
 * Higher is better. Callers sort descending.
 */
export function scoreCandidate(candidate: MealCandidate, ctx: RecommendationContext): number {
  const pantryScore = candidate.pantryCoverage; // already 0-1
  const macroScore = macroAlignmentScore(candidate, ctx);
  const tScore = timeScore(candidate, ctx);

  const raw =
    SCORE_WEIGHTS.pantry * pantryScore +
    SCORE_WEIGHTS.macros * macroScore +
    SCORE_WEIGHTS.time * tScore;

  // Clamp to [0, 1] to guard against floating-point drift.
  return Math.max(0, Math.min(1, raw));
}
