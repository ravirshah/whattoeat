import type { MealCandidate, RecommendationContext } from '@/contracts/zod';

// ---------------------------------------------------------------------------
// Allergy filter
// ---------------------------------------------------------------------------

/**
 * Returns true if any ingredient in the candidate contains a forbidden allergen.
 * Case-insensitive substring match — errs on the side of safety.
 */
function containsAllergen(candidate: MealCandidate, allergies: string[]): boolean {
  if (allergies.length === 0) return false;
  const lower = allergies.map((a) => a.toLowerCase());
  return candidate.ingredients.some((ing) =>
    lower.some((allergen) => ing.name.toLowerCase().includes(allergen)),
  );
}

// ---------------------------------------------------------------------------
// Recency filter
// ---------------------------------------------------------------------------

/**
 * Returns true if the candidate title closely matches a recently cooked title.
 * Uses lowercase exact match for now; fuzzy matching is a v2.1 enhancement.
 */
function isRecentlyCooked(candidate: MealCandidate, recentCookTitles: string[]): boolean {
  if (recentCookTitles.length === 0) return false;
  const lower = candidate.title.toLowerCase();
  return recentCookTitles.some((t) => t.toLowerCase() === lower);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface FilterResult {
  passed: MealCandidate[];
  droppedAllergen: MealCandidate[];
  droppedRecency: MealCandidate[];
}

/**
 * Filters candidates by allergy safety (hard drop) and recency (soft drop, only
 * applied when it would not eliminate all candidates).
 */
export function filterCandidates(
  candidates: MealCandidate[],
  ctx: RecommendationContext,
  recentCookTitles: string[] = [],
): FilterResult {
  const { allergies } = ctx.profile;

  const droppedAllergen: MealCandidate[] = [];
  const allergenPassed: MealCandidate[] = [];

  for (const c of candidates) {
    if (containsAllergen(c, allergies)) {
      droppedAllergen.push(c);
    } else {
      allergenPassed.push(c);
    }
  }

  // Recency is a soft filter: only drop if survivors remain afterwards.
  const droppedRecency: MealCandidate[] = [];
  const recencyPassed: MealCandidate[] = [];

  for (const c of allergenPassed) {
    if (isRecentlyCooked(c, recentCookTitles)) {
      droppedRecency.push(c);
    } else {
      recencyPassed.push(c);
    }
  }

  // If recency filter would remove everything, keep allergen-passed set intact.
  const passed = recencyPassed.length > 0 ? recencyPassed : allergenPassed;

  return {
    passed,
    droppedAllergen,
    droppedRecency: recencyPassed.length > 0 ? droppedRecency : [],
  };
}
