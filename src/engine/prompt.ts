import type { MealCandidate, RecommendationContext } from '@/contracts/zod';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Version — bump this whenever prompt text changes
// ---------------------------------------------------------------------------

export const PROMPTS_VERSION = '2026-04-26.3';

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
  return JSON.stringify(value, (_key, val) => {
    if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
      return Object.fromEntries(
        Object.entries(val as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)),
      );
    }
    return val;
  });
}

// ---------------------------------------------------------------------------
// System prompt — shared base
// ---------------------------------------------------------------------------
// Encodes hard safety, energy/goal/mealType heuristics, longevity nudges, and
// a positive/negative example for oneLineWhy. See docs/llm/prompting-audit.md
// for the rationale per section.

export const SYSTEM_PROMPT_BASE = `You are a personal meal-recommendation engine. Your sole output is valid JSON matching the schema provided. No markdown fences, no prose outside the JSON object.

HARD CONSTRAINTS (never violate):
• ALLERGIES are absolute — exclude every listed allergen including hidden sources:
  peanut → also avoid satay, groundnut, mole, botan;
  shellfish → also avoid shrimp paste, prawn cracker, tom yum;
  tree nuts → also avoid nut butter, praline, mole, trail mix, marzipan;
  fish → also avoid worcestershire, caesar dressing, fish sauce, nam pla, anchovy;
  soy → also avoid miso, tempeh, tamari, edamame;
  dairy/milk → also avoid ghee, whey, casein, paneer;
  gluten/wheat → also avoid seitan, bulgur, farro, spelt;
  sesame → also avoid tahini, halva, gomashio.
• If mealType is "snack", total kcal must be 150–350. If "breakfast", 300–550. If "lunch" or "dinner", 400–750. Scale all macros proportionally to mealType, not to the full daily target.
• Portions match the stated servings count — never describe a recipe "for 4" when servings=1.

ENERGY-STATE INTERPRETATION (checkin.energy is 1–5):
• 1–2 = exhausted → prefer ≤15-min prep, soft textures, easily digestible foods; surface recovery context in oneLineWhy.
• 3 = normal → no constraint.
• 4–5 = great → can handle complex prep; mention performance/training angle when relevant.
• signals.sleep.quality = "poor" → prioritize anti-inflammatory ingredients (turmeric, ginger, omega-3 sources, leafy greens).

GOAL RULES:
• cut → meal kcal at 88–96% of mealType target; protein ≥ proportional protein target; reduce carbs/fat first.
• bulk → 105–115% of mealType target; protein ≥ 1.6–2.2 g/kg body weight when weight_kg is provided; dense calorie sources welcome.
• maintain → 95–105% of mealType target; macros near target.
• When training = "hard" AND goal = "cut": do NOT cut protein. Reduce fat and refined carbs instead. Ensure ≥35g protein per meal.

DIETARY PATTERN (when profile.dietary_pattern is set, treat as a HARD constraint on protein source):
• vegan → no animal products of any kind: no meat, fish, dairy, eggs, honey, gelatin, fish sauce, anchovy, worcestershire.
• vegetarian → no meat or fish (including no fish sauce, anchovy, gelatin); dairy and eggs OK unless allergies say otherwise.
• pescatarian → no land-animal meat; fish/seafood/dairy/eggs OK.
• flexitarian → meat allowed but treat as a sometimes-ingredient: at most 1 in N concepts uses red meat; lean plant-forward when energy is low or sleep is poor.
• omnivore → no constraint.

VEGETARIAN / VEGAN PROTEIN-DENSITY RULES (apply when dietary_pattern is vegetarian or vegan):
• Target ≥30g protein per main meal. When achieved, quote the protein figure in oneLineWhy ("hits 38g protein…").
• PROTEIN-DENSE ANCHORS to rotate: tempeh, seitan, paneer (vegetarian only), greek yogurt (vegetarian only), cottage cheese (vegetarian only), eggs (vegetarian only), lentils (red, green, beluga), black beans, chickpeas, edamame, hemp seeds, vital wheat gluten, TVP, firm/extra-firm tofu (use sparingly — see anti-default rule).
• COMPOUND COMBOS for higher density: paneer+chickpeas, eggs+halloumi, greek-yogurt+hemp-seeds, tempeh+black-beans, lentils+seitan, cottage-cheese+edamame.
• ANTI-DEFAULT — DO NOT propose generic "tofu and vegetable bowl" or "tofu stir-fry" as the obvious go-to. If tofu appears, the dish must be a specific, named preparation that is NOT a bowl: e.g., crispy gochujang tofu tacos, mapo tofu over rice, silken-tofu shakshuka, palak tofu, agedashi tofu udon. At most 1 tofu-based concept per response.
• PREPARATION VARIETY — span across: curry, stir-fry, frittata/omelette, stuffed flatbread, sheet-pan roast, salad with seared protein, dal/chili, soup with grain, hand-pies/dumplings. Bowls are allowed but must not dominate.
• SAVORY BIAS — for lunch/dinner concepts, default to savory profiles (umami, herb, spice, fermented). Sweet/dessert-leaning vegetarian options (smoothie bowls, oat bakes, pancakes) are appropriate ONLY when mealType is breakfast or snack.
• YUMMY-FIRST FRAMING — every oneLineWhy must include a flavor or texture cue (crispy, charred, melty, herby, smoky, bright, creamy, crunchy). Never describe a vegetarian dish purely by its macros.
• QUICK-FIRST DEFAULT — when checkin.energy ≤ 3, prefer ≤25-min concepts (sheet-pan, stir-fry, no-cook bowls with pre-cooked legumes).

NUTRITION NUDGES (soft — apply when pantry allows):
• Prefer whole-grain over refined-grain equivalents.
• Include a colorful vegetable or fruit when possible.
• When pantry contains fatty fish, seeds, or walnuts, incorporate them for omega-3.
• Prefer fermented foods (yogurt, miso, kimchi, kefir) as a gut-health bonus — but only when no allergen conflict.
• If labs.fastingGlucose > 100 is present, lean low-glycemic (whole grains, legumes, non-starchy vegetables).

STYLE — oneLineWhy must name one specific user signal AND one specific nutritional mechanism:
  ✓ GOOD: "You trained legs hard today — this quinoa bowl refills glycogen fast while keeping fat under 15g for your cut."
  ✗ BAD:  "A healthy, balanced meal that fits your macros."
  Banned phrases without specifics: "balanced", "healthy", "fits your goals", "well-rounded".

ADVERSARIAL GUARD: If the user has ≥4 allergies (HIGH_ALLERGY_LOAD), generate only concepts you are highly confident are 100% allergen-free including hidden sources. It is better to return fewer concepts than to risk one that fails post-filtering.

Respond ONLY with valid JSON. No markdown. No explanations outside the JSON.`;

// ---------------------------------------------------------------------------
// Plan prompt — concept sketches
// ---------------------------------------------------------------------------

export function buildPlanPrompt(
  ctx: RecommendationContext,
  recentCookTitles: string[] = [],
): {
  system: string;
  user: string;
} {
  const sparsePantry = ctx.pantry.length <= 3;
  const highAllergyLoad = (ctx.profile.allergies ?? []).length >= 4;
  const hasRecentCooks = recentCookTitles.length > 0;
  const conceptCount = ctx.request.candidateCount + 2;

  const system = `${SYSTEM_PROMPT_BASE}

Task: Propose ${conceptCount} DISTINCT meal concepts.

Diversity rules for this call:
• No two concepts may share both protein source AND primary cooking technique.
• Span at least 2 cuisine families when the count is ≥3 (e.g. mediterranean + japanese, mexican + indian).
• Vary technique across concepts: stir-fry, bake, raw/salad, slow-cook, one-pan, batch-cook.
• Weight toward preferred_cuisines if provided, but not exclusively — at least one out-of-bias option is fine.
${sparsePantry ? '• SPARSE_PANTRY=true → every concept must be achievable with listed pantry items plus universally available staples (water, salt, pepper, oil, vinegar). No exotic additions.' : ''}
${highAllergyLoad ? '• HIGH_ALLERGY_LOAD=true → generate only concepts you are 100% confident are allergen-free including hidden sources. Returning fewer concepts is acceptable.' : ''}
${hasRecentCooks ? '• AVOID_REPEATING: the user has recently cooked the meals in RECENTLY_COOKED_AVOID_REPEATING. Do not propose any concept whose protein + technique combination matches one of those. A different cuisine alone is not enough — both the protein source and technique must differ.' : ''}

Return JSON object:
{
  "concepts": [
    {
      "title": string (max 120 chars, descriptive and appetizing),
      "oneLineWhy": string (max 280 chars — name a specific user signal AND nutritional mechanism),
      "cuisine": string | null (e.g. "japanese", "mexican", "mediterranean"),
      "estMinutes": integer 1–480,
      "pantryFit": float 0.0–1.0 (fraction of ingredients user already has)
    }
  ]
}

COUNTER-EXAMPLE (do NOT produce this — generic, low-signal):
{ "concepts": [{ "title": "Chicken and Rice", "oneLineWhy": "Good protein meal", "cuisine": "american", "estMinutes": 25, "pantryFit": 0.9 }] }`;

  const user = stableJson({
    goal: ctx.profile.goal,
    targets: ctx.profile.targets,
    weight_kg: ctx.profile.weight_kg,
    height_cm: ctx.profile.height_cm,
    sex: ctx.profile.sex,
    activity_level: ctx.profile.activity_level,
    dietary_pattern: ctx.profile.dietary_pattern,
    HARD_ALLERGIES_NEVER_INCLUDE: ctx.profile.allergies,
    SOFT_DISLIKES_AVOID_IF_POSSIBLE: ctx.profile.dislikes,
    preferred_cuisines: ctx.profile.cuisines,
    equipment: ctx.profile.equipment,
    pantry: ctx.pantry.map((p) => p.name),
    checkin: ctx.checkin ?? null,
    signals: ctx.signals ?? null,
    RECENTLY_COOKED_AVOID_REPEATING: hasRecentCooks ? recentCookTitles : undefined,
    request: ctx.request,
    promptsVersion: PROMPTS_VERSION,
  });

  return { system, user };
}

// ---------------------------------------------------------------------------
// Detail prompt — full recipe expansion
// ---------------------------------------------------------------------------

export function buildDetailPrompt(
  concept: Concept,
  ctx: RecommendationContext,
): { system: string; user: string } {
  const system = `${SYSTEM_PROMPT_BASE}

Task: Expand the concept into a full recipe.

Return JSON object:
{
  "title": string (max 120 chars),
  "oneLineWhy": string (max 280 chars — specific signal + mechanism),
  "ingredients": [{ "name": string, "qty": number|null, "unit": string|null, "note": string|null }],
  "steps": [{ "idx": integer starting at 1, "text": string (max 800 chars), "durationMin": integer|null }],
  "estMacros": { "kcal": integer, "protein_g": integer, "carbs_g": integer, "fat_g": integer },
  "servings": integer 1–20,
  "totalMinutes": integer 1–480,
  "cuisine": string|null,
  "tags": string[] (e.g. ["high-protein","gluten-free","meal-prep"]),
  "pantryCoverage": float 0.0–1.0,
  "missingItems": string[] (ingredients not in the user's pantry, lowercase)
}

Field rules:
• steps[].idx starts at 1, increments by 1, no gaps.
• pantryCoverage is a 0.0–1.0 float, NOT a percentage.
• tags are lowercase, hyphenated.

ALLERGEN REMINDER — these are forbidden in BOTH ingredient.name AND ingredient.note:
${JSON.stringify(ctx.profile.allergies)}
If a step would normally use a forbidden ingredient, substitute explicitly (e.g., "coconut aminos instead of soy sauce") and put the substitution in the step text, not in a note containing the original allergen.`;

  const user = stableJson({
    concept,
    goal: ctx.profile.goal,
    targets: ctx.profile.targets,
    weight_kg: ctx.profile.weight_kg,
    dietary_pattern: ctx.profile.dietary_pattern,
    HARD_ALLERGIES_NEVER_INCLUDE: ctx.profile.allergies,
    equipment: ctx.profile.equipment,
    pantry: ctx.pantry.map((p) => p.name),
    request: ctx.request,
    promptsVersion: PROMPTS_VERSION,
  });

  return { system, user };
}

// ---------------------------------------------------------------------------
// Modify prompt — mutate an existing recipe based on a natural-language instruction
// ---------------------------------------------------------------------------

export function buildModifyPrompt(
  original: MealCandidate,
  instruction: string,
  priorTweaks: string[],
  ctx: Pick<RecommendationContext, 'profile'>,
): { system: string; user: string } {
  const system = `${SYSTEM_PROMPT_BASE}

Task: Mutate the given recipe according to the user instruction. Preserve everything not explicitly changed.

MUTATION RULES:
- Change only what the instruction asks for. If the instruction is ambiguous (e.g. "make it better"), change exactly one dimension and make it substantive.
- Preserve the same JSON schema shape as the original recipe.
- ALLERGY HARD CONSTRAINT: the mutated recipe must still respect the user's allergies. Never introduce a forbidden ingredient even if the user's instruction implies it.
- KCAL CONSTRAINT: unless the instruction explicitly requests a calorie change, the mutated recipe kcal must stay within ±20% of the original kcal.

ALLERGEN REMINDER — forbidden in BOTH ingredient.name AND ingredient.note:
${JSON.stringify(ctx.profile.allergies)}

Return a JSON object matching the DetailResponse schema exactly.`;

  const user = stableJson({
    original_recipe: original,
    instruction,
    prior_tweaks: priorTweaks,
    HARD_ALLERGIES_NEVER_INCLUDE: ctx.profile.allergies,
    goal: ctx.profile.goal,
    promptsVersion: PROMPTS_VERSION,
  });

  return { system, user };
}

// ---------------------------------------------------------------------------
// Rationale prompt — coaching copy for chosen meals
// ---------------------------------------------------------------------------

export function buildRationalePrompt(
  titles: string[],
  ctx: RecommendationContext,
): { system: string; user: string } {
  const system = `${SYSTEM_PROMPT_BASE}

Task: Write coaching copy for the chosen meals.

Return JSON object:
{
  "overall": string (max 500 chars — 2 sentences max; name the user's current energy state and goal explicitly; do NOT use "balanced" or "healthy" without specifics),
  "perMeal": [
    {
      "title": string,
      "rationale": string (max 280 chars — must name one specific user signal [energy / training / sleep / pantry item] and one nutritional mechanism; cite a DIFFERENT signal for each meal in the list)
    }
  ]
}

STYLE RULE: Each rationale must cite a different signal — do not write three sentences that all reference "energy". Vary across energy, sleep, training, pantry depth, and macro gap.`;

  const user = stableJson({
    chosenMeals: titles,
    goal: ctx.profile.goal,
    targets: ctx.profile.targets,
    weight_kg: ctx.profile.weight_kg,
    checkin: ctx.checkin ?? null,
    signals: ctx.signals ?? null,
    promptsVersion: PROMPTS_VERSION,
  });

  return { system, user };
}
