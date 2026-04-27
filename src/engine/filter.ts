import type { MealCandidate, RecommendationContext } from '@/contracts/zod';

// ---------------------------------------------------------------------------
// Allergy filter
// ---------------------------------------------------------------------------

// Cross-contamination map: hidden sources that should be flagged when the
// listed top-level allergen is present. Substrings are matched against
// ingredient.name AND ingredient.note (case-insensitive).
const ALLERGEN_HIDDEN_SOURCES: Record<string, string[]> = {
  peanut: ['satay', 'groundnut', 'botan', 'mole'],
  shellfish: ['shrimp paste', 'prawn cracker', 'tom yum'],
  fish: ['worcestershire', 'caesar dressing', 'fish sauce', 'nam pla', 'anchovy'],
  'tree nut': ['praline', 'nut butter', 'mixed nut', 'trail mix', 'marzipan', 'frangipane'],
  almond: ['marcona', 'frangipane', 'marzipan'],
  cashew: ['cashew butter'],
  walnut: ['walnut oil'],
  soy: ['miso', 'tempeh', 'edamame', 'tamari', 'soy sauce', 'shoyu'],
  dairy: ['ghee', 'whey', 'casein', 'paneer'],
  milk: ['ghee', 'whey', 'casein'],
  egg: ['mayo', 'aioli', 'meringue'],
  gluten: ['seitan', 'farro', 'spelt', 'kamut', 'bulgur'],
  wheat: ['seitan', 'bulgur', 'farro', 'spelt'],
  sesame: ['tahini', 'gomashio', 'halva'],
};

function expandedAllergenTerms(allergies: string[]): string[] {
  const expanded = new Set<string>();
  for (const raw of allergies) {
    const a = raw.toLowerCase().trim();
    expanded.add(a);
    for (const [key, hidden] of Object.entries(ALLERGEN_HIDDEN_SOURCES)) {
      if (a.includes(key)) for (const h of hidden) expanded.add(h);
    }
  }
  return Array.from(expanded);
}

/**
 * Returns true if any ingredient in the candidate contains a forbidden allergen.
 * Case-insensitive substring match against ingredient.name AND ingredient.note,
 * expanded with a cross-contamination map. Errs on the side of safety.
 */
function containsAllergen(candidate: MealCandidate, allergies: string[]): boolean {
  if (allergies.length === 0) return false;
  const terms = expandedAllergenTerms(allergies);
  return candidate.ingredients.some((ing) => {
    const haystack = `${ing.name} ${ing.note ?? ''}`.toLowerCase();
    return terms.some((t) => haystack.includes(t));
  });
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
