I now have a thorough understanding of every layer. Here is the full audit report.

---

# LLM Prompting Audit — WhatToEat

## TL;DR

- **Biggest win available:** The plan prompt sends zero dietary-science heuristics to the model. Adding explicit protein-per-kg guidance, snack-vs-meal calorie scaling, and a concrete "vary cuisine" directive would immediately lift nutritional accuracy and variety with no architecture change.
- **Biggest risk:** Allergy safety relies on a post-hoc substring filter. The plan call and detail call both receive the allergy list but neither prompt treats it as a *hard-failure* instruction with worked examples; a hallucinated cross-contamination ingredient (e.g., "satay sauce" for a peanut allergy) will only be caught if the filter recognizes the term — the substring match on `ing.name` misses notes, compound words, or brand names.
- **Recommended priority order:** (1) Add allergen-negative worked example to plan + detail prompts → closes the safety gap. (2) Add nutrition-science heuristics and energy-state mapping to plan prompt → lifts accuracy. (3) Add cuisine/technique variety directive → kills chicken-rice-broccoli default. (4) Harden the rationale prompt with specificity requirements → kills generic copy.

---

## Inventory

| File | What prompt it builds | Who calls it |
|---|---|---|
| `src/engine/prompt.ts` | `buildPlanPrompt` (concept sketches), `buildDetailPrompt` (full recipe), `buildRationalePrompt` (per-meal copy) | `src/engine/recommend.ts` |
| `src/engine/recommend.ts` | Orchestrates plan → detail (parallel) → rationale; injects `modelHint` | `src/server/recommendation/actions.ts` (inferred) |
| `src/server/adapters/gemini-llm.ts` | Combines `system + user` into a single user-role message; sets `responseMimeType: application/json` and passes `responseSchema` from `zodToJsonSchema` | `src/lib/feed-me/resolveClient.ts` |
| `src/lib/feed-me/resolveClient.ts` | Returns `GeminiLlmClient` or `FakeLlmClient` based on env | `src/app/feed-me/page.tsx` (server component) |

No other files emit LLM calls. The system instruction lives entirely inside `SYSTEM_PROMPT_BASE` in `prompt.ts`; there is no `systemInstruction` field passed to the Gemini SDK — the system message is prepended to the single user-role content part.

---

## Findings by Category

### 1. Schema Conformance

**Current state:** Robust. The adapter passes a `responseSchema` derived from Zod via `zodToJsonSchema`, which forces Gemini into JSON mode. There is a one-retry loop on `GeminiSchemaError`. The system prompt ends with `"Respond ONLY with valid JSON. No markdown fences, no prose outside JSON"` which is correct.

**Specific problems:**

- The plan prompt describes the schema inline as a quoted TypeScript signature: `{ "concepts": [ { "title", "oneLineWhy", ... } ] }`. This omits types and optionality, so the model must infer them. With Gemini's `responseSchema` the Zod schema is the ground truth, but the inline description contradicts it by not showing `pantryFit` as a `number` in 0–1 range.
- The detail prompt says only `"Return a JSON object matching the DetailResponse schema exactly"` — it never names the fields or their constraints inline. Because no description of the schema is in-context, the model relies entirely on the Gemini response-schema constraint, which can produce under-specified values (e.g., `steps[].idx` starting at 0 instead of 1, which passes Zod min(1) but is semantically wrong).
- No counter-example is provided anywhere. The model has no negative example showing what NOT to produce (markdown-wrapped JSON, prose rationale outside the object, metric values as strings).

**Recommended changes:**

1. Add a compact field-level glossary to both plan and detail system prompts (one line per field, with type and range).
2. Add a 3-line counter-example block: `❌ Wrong: { "concepts": "Chicken Rice" }` — `✓ Right: { "concepts": [{ "title": "Herb Chicken Bowl", ... }] }`.
3. In the detail system prompt, explicitly state `steps[].idx starts at 1` and `pantryCoverage is a 0.0–1.0 float not a percentage`.

---

### 2. Nutritional Accuracy

**Current state:** Weak. The prompt sends macro targets as absolute gram numbers and a `goal` enum (`cut/maintain/bulk`) but provides no interpretation heuristics. The model must infer all nutrition science from training data.

**Specific problems:**

- The prompt never tells the model *how* to scale a meal's macros relative to the targets. A snack should hit ~25% of daily targets; a dinner ~35–40%. Without this, the model often returns meals sized for a full day's calories regardless of `mealType`.
- No protein-per-kg guidance is in-context. For `goal=bulk` the prompt does not state that protein priority should be 1.6–2.2g/kg body weight (ISSN 2017, Stokes et al.). The profile includes `weight_kg` but the prompt builder discards it — `weight_kg` is never included in the serialized context sent to either call. Same for `height_cm`, `birthdate`, `sex`, `activity_level`. The model cannot derive relative targets without these.
- `goal=cut + training=hard` is a nutritionally complex state (maintain protein, cut carbs/fat, prioritize intra-workout carbs). The prompt gives the model both signals but no rule for reconciling them.
- The `checkin.energy` field (1–5 scale) is sent as a raw integer with no unit or interpretation. The model does not know whether 1 = exhausted or 1 = peak.
- `dislikes` is included in the plan call but treated identically to `allergies` in the prompt — both are unlabeled arrays. The model may treat dislikes as allergies (and refuse a whole food group) or treat allergies as dislikes (and include them anyway).

**Recommended changes:**

1. Add a context-interpretation block to the system prompt:
   - `energy` scale: `1=exhausted, 3=normal, 5=great; lower energy → simpler prep, easily digestible foods`
   - `goal` rules: `cut → aim for 85–95% of kcal target; bulk → 105–115%; maintain → 95–105%`
   - `mealType` calorie fraction: `breakfast ~25%, lunch ~30%, dinner ~35%, snack ~10–15%`
2. Include `weight_kg` in the serialized context for both plan and detail calls so the model can compute protein-per-kg.
3. Separate `allergies` and `dislikes` with explicit labels: `"HARD ALLERGIES — never include, not even traces"` vs `"SOFT DISLIKES — avoid unless no reasonable substitute exists"`.
4. Add a hard constraint: `"When training=hard, ensure ≥35g protein per meal regardless of kcal target."`

---

### 3. Tastiness and Variety

**Current state:** Poor. The canned fake fixtures demonstrate the failure mode the prompt will produce in practice: `Grilled Chicken & Rice`, `Tuna Salad Wrap`, `Oats with Almond Butter`, `Egg & Veggie Scramble` — all American, all generic, all mono-technique. The prompt contains no instruction whatsoever about variety.

**Specific problems:**

- The plan prompt contains no directive to vary cuisine, cooking technique, or flavor profile across the `N` concept sketches. When the model sees `pantry: ["chicken breast", "white rice", "eggs"]` with no other instruction, its prior for "healthy high-protein meal" collapses to a narrow mode.
- The `cuisines` field on the profile (user's preferred cuisines) is excluded from both plan and detail calls. The builder serializes it in neither `buildPlanPrompt` nor `buildDetailPrompt`. That is a missed signal.
- There is no instruction to minimize concept-concept similarity. If concept 1 is a chicken bowl, concept 2 should not also be a chicken bowl.

**Recommended changes:**

1. Add to the plan system prompt: `"Ensure no two concepts share both protein source and primary cooking technique. Vary: stir-fry, bake, raw/salad, slow-cook, one-pan, batch-cook. Include at least one non-Western cuisine unless the user has explicitly excluded all."`
2. Include `cuisines` in the plan call's serialized context, labeled: `"preferred cuisines — weight toward these but not exclusively"`.
3. Add a diversity soft-constraint: `"If candidateCount ≥ 3, span at least 2 distinct cuisine families."`

---

### 4. Longevity and Science

**Current state:** Absent. The prompts contain no longevity-oriented heuristics. There is nothing nudging the model toward fiber, omega-3s, fermented foods, or colorful produce.

**Specific problems:**

- No instruction to favor minimally-processed ingredients. The model freely suggests "white bread" or "instant noodles" without penalty.
- No fiber mention. 30g/day is the USDA/ISSN reference target; no meal-level guidance is provided.
- Omega-3 sources (salmon, sardines, walnuts, flaxseed) have no preference weighting.
- The `HealthSignals` schema has `labs.fastingGlucose` and `labs.recentBiomarkers` — useful for glycemic guidance — but the plan prompt never interprets them, so they are wasted tokens.
- The sleep signal (`signals.sleep.lastNightHours`, `quality`) is sent raw. The model does not know to prioritize anti-inflammatory, easily-digestible foods when sleep was poor (a defensible evidence-based heuristic per Attia/Patrick).

**Recommended changes:**

1. Add a "longevity nudge" block to the system prompt (2–3 lines): prioritize colorful produce, whole grains, fermented foods, and fatty fish when plausible given the pantry. Not mandatory — a soft preference.
2. Map `signals.sleep.quality=poor` → prefer anti-inflammatory, easily digestible options and note this in `oneLineWhy`.
3. Map `labs.fastingGlucose > 100` → reduce refined carb options, prefer low-glycemic index.
4. Add ingredient-quality soft rule: prefer whole-grain over refined-grain equivalents when both are plausible.

---

### 5. Behavioral / Tone

**Current state:** Undefined quality. The `oneLineWhy` field is the primary user-facing copy, constrained to 280 chars. The system prompt says `"sharp, personal, and reads like advice from a knowledgeable friend who cooks"` — which is a good intention — but gives no worked example. The canned fakes show what the model will tend toward: `"High-protein, hits your targets cleanly"` and `"Fast and filling — good when time is short"` — both bland and generic.

**Specific problems:**

- `"sharp, personal, and reads like advice from a knowledgeable friend"` is aspirational but unanchored. Without a positive example the model defaults to nutritionist-generic.
- The rationale prompt asks for `"one sharp sentence per meal"` but the fallback rationale when the call fails is `"These picks suit your current goals and pantry"` — exactly the generic output we want to avoid, and it's hardcoded.
- `oneLineWhy` in the rationale's `perMeal` is structurally separate from the `oneLineWhy` on the detail response. The UI currently only shows the detail's `oneLineWhy`. The rationale's `perMeal[].rationale` is collected but only its `overall` field survives into `RecommendationResult.rationale`. The per-meal rationale is discarded — a waste of an LLM call.
- The `overall` rationale goes into a single string field and is shown as a block of text. The 500-char limit is generous enough for useful copy but the prompt gives no structure guide, so the model writes generic summaries.

**Recommended changes:**

1. Add a positive example of a good `oneLineWhy` to the system prompt: `"You trained legs hard today and need glycogen repletion — this bowl hits 65g carbs fast without spiking blood sugar."` Contrast with bad: `"A healthy, balanced meal that fits your macros."` (too generic).
2. Wire `perMeal[].rationale` from the rationale response into the `MealCandidate`'s `oneLineWhy`, overriding the detail-call version (which is less context-aware). Or: use the rationale call to populate a separate `contextRationale` field on the candidate.
3. Replace the hardcoded fallback rationale string with a template that inserts at least `goal` and `mealType`: e.g., `"These ${mealType} options are calibrated for your ${goal} goal today."`.

---

### 6. Edge Cases

**Current state:** Partially handled by the engine layer (filter, score), not by the prompts.

**Specific problems:**

- **Bare pantry (2 items):** The plan prompt sends `pantry: ["eggs", "salt"]` with no additional instruction. The model will still try to generate `candidateCount + 2` concepts, most of which will have `pantryFit < 0.3`. No prompt guidance tells the model to explicitly acknowledge the constraint and generate hyper-pantry-aligned options. The scoring will eventually prefer the eggs concept, but the model wastes tokens generating 6 impossible concepts.
- **Snack mealType:** There is no instruction in the plan prompt about calorie sizing for snacks. A model seeing `targets: { kcal: 2000 }` and `mealType: snack` must infer "200–300kcal" from background knowledge. It often doesn't, producing 700kcal "snacks."
- **Hard cut + hard training:** As noted in §2, the prompt sends conflicting signals without a resolution rule. The model may produce meals that are under-protein to fit the cut's calorie ceiling.
- **6 allergies:** The filter handles this post-hoc, but if the plan call generates all allergen-positive concepts (plausible with 6 restrictions), every detail call runs and fails the filter, producing `EngineNoCandidatesError`. The prompt should tell the model to treat high-allergy profiles with extra conservatism in concept generation.

**Recommended changes:**

1. When `pantry.length ≤ 3`, add to the user payload: `"SPARSE_PANTRY=true — generate concepts entirely achievable with listed items plus basic universally-available pantry staples (water, salt, pepper, oil)."`
2. Add mealType-calorie hint: map `mealType` to approximate fraction of daily kcal (see §2).
3. When `allergies.length ≥ 4`, add: `"HIGH_ALLERGY_LOAD — treat every concept as potentially rejected; generate only concepts you are confident contain zero listed allergens and zero cross-contamination risk."`

---

### 7. Adversarial Robustness

**Current state:** Single defense layer. The `filterCandidates` function does a case-insensitive substring match on `ingredient.name`. This is the only safety net after the prompt's soft instruction `"Respect all allergies absolutely."`.

**Specific problems:**

- **Bypass via ingredient notes:** The `ingredient.note` field (up to 120 chars) is not checked by `containsAllergen`. A model could output `{ name: "rice noodles", note: "toss with peanut sauce" }` and pass the filter.
- **Bypass via hidden sources:** "Worcestershire sauce" contains anchovies (fish allergy). "Satay" implies peanut. "Miso" contains soy. The substring match on `ingredient.name` catches `peanut` but not these indirect sources.
- **Bypass via compound names:** `"almond-crusted chicken"` — the substring match catches `almond` because it's in the name. But `"marcona" (a type of almond)` would pass. This is a model-side failure the prompt should prevent with more explicit guidance.
- **Vegan + bulking + nut allergy:** This combination shrinks the viable protein-source space to legumes, seeds, and tofu. Without explicit guidance the model may hallucinate "protein blend" containing whey or "granola" containing tree nuts.

**Recommended changes:**

1. Extend `containsAllergen` to check `ingredient.note` strings in addition to `ingredient.name`.
2. Add to the system prompt a cross-contamination map: `"Allergen cross-reference: 'peanut' implies avoiding satay, groundnut, botan; 'shellfish' implies avoiding shrimp paste, prawn cracker, tom yum base; 'fish' implies avoiding worcestershire, caesar dressing, fish sauce, nam pla."` (Keep it ≤8 common cases; the model's training data will extrapolate.)
3. When `allergies` includes any tree-nut or peanut, add: `"Do not use 'nut butter', 'mixed nuts', 'trail mix', or any dish whose name commonly implies nuts (e.g., satay, praline, mole)."`

---

## Concrete Rewrite — The Recommendation Prompt

The following is a complete drop-in replacement for the three builders in `src/engine/prompt.ts`. Annotations explain the rationale for each section.

```ts
// ─── SYSTEM BASE ────────────────────────────────────────────────────────────
// WHY: One tightly-scoped role prevents the model from shifting into "recipe
//      blogger" or "nutrition coach essayist" mode. Concrete negative examples
//      anchor style expectations.
export const SYSTEM_PROMPT_BASE = `\
You are a personal meal-recommendation engine. Your sole output is valid JSON
matching the schema provided. No markdown fences, no prose outside the JSON object.

HARD CONSTRAINTS (never violate):
• ALLERGIES are absolute — exclude every listed allergen including hidden sources:
  peanut → also avoid satay, groundnut, botan;
  shellfish → also avoid shrimp paste, prawn crackers, fish sauce labeled "seafood";
  tree nuts → also avoid nut butters, praline, mole, trail mix;
  fish → also avoid worcestershire, caesar dressing, nam pla.
• If mealType is "snack", total kcal must be 150–350. If "breakfast", 300–550.
  If "lunch" or "dinner", 400–750. Scale all macros proportionally.
• Portions are for the stated servings count. Do not describe a recipe "for 4"
  when servings=1.

ENERGY-STATE INTERPRETATION:
• checkin.energy 1–2 = exhausted → prefer ≤15-min prep, soft textures, easily
  digestible foods; note recovery context in oneLineWhy.
• checkin.energy 4–5 = great → can handle complex prep; mention performance angle.
• signals.sleep.quality = "poor" → prioritize anti-inflammatory ingredients
  (turmeric, ginger, omega-3 sources, leafy greens).

GOAL RULES:
• cut   → target 88–96% of daily kcal; protein ≥ target_g; carbs/fat reduced.
• bulk  → target 105–115% of daily kcal; protein ≥ target_g; dense calorie sources.
• maintain → 95–105% of daily kcal; all macros near target.
• When training = "hard" AND goal = "cut": do not cut protein. Reduce fat and
  refined carbs instead.

NUTRITION NUDGES (soft — apply when pantry allows):
• Prefer whole-grain over refined-grain equivalents.
• Include a colorful vegetable or fruit when possible.
• When pantry contains fatty fish, seeds, or walnuts, incorporate for omega-3s.
• Prefer fermented foods (yogurt, miso, kimchi, kefir) as a bonus for gut health.

STYLE — oneLineWhy:
  ✓ GOOD: "You hit legs hard today — this quinoa bowl refills glycogen fast while
    keeping fat under 15g for your cut."
  ✗ BAD:  "A healthy, balanced meal that fits your macros."
  The sentence must name at least one specific user signal (goal, training, energy,
  sleep, or pantry item) and one specific nutritional mechanism.

ADVERSARIAL GUARD: If the user profile has ≥ 4 allergies, generate only concepts
you are highly confident are allergen-free — it is better to return fewer concepts
than to include one that requires post-filtering.

Respond ONLY with valid JSON. No markdown. No explanations outside the JSON.`;

// ─── PLAN PROMPT ────────────────────────────────────────────────────────────
// WHY: Sparse-pantry flag and cuisine-diversity mandate prevent generic outputs.
//      Including weight_kg enables the model to reason about protein-per-kg.
//      Separating allergies from dislikes prevents over-refusal.
export function buildPlanPrompt(ctx: RecommendationContext): { system: string; user: string } {
  const sparsePantry = ctx.pantry.length <= 3;
  const highAllergyLoad = (ctx.profile.allergies ?? []).length >= 4;

  const system = `${SYSTEM_PROMPT_BASE}

Task: Propose ${ctx.request.candidateCount + 2} DISTINCT meal concepts.
Rules for this call:
• No two concepts may share both protein source AND primary cooking technique.
• Span at least 2 cuisine families when candidateCount ≥ 3.
• Do not include any concept whose primary ingredient is in ALLERGIES.
${sparsePantry ? '• SPARSE_PANTRY: every concept must be achievable with listed pantry items plus only universally available staples (water, salt, pepper, oil, vinegar).' : ''}
${highAllergyLoad ? '• HIGH_ALLERGY_LOAD: generate only concepts you are confident are 100% allergen-free.' : ''}

Return JSON object:
{
  "concepts": [
    {
      "title": string (max 120 chars, descriptive and appetizing),
      "oneLineWhy": string (max 280 chars — must name a specific user signal AND nutritional mechanism),
      "cuisine": string | null (e.g. "japanese", "mexican", "mediterranean"),
      "estMinutes": integer 1–480,
      "pantryFit": float 0.0–1.0 (fraction of ingredients user already has)
    }
  ]
}

COUNTER-EXAMPLE (do not produce this):
{ "concepts": [{ "title": "Chicken and Rice", "oneLineWhy": "Good protein meal", "cuisine": "american", "estMinutes": 25, "pantryFit": 0.9 }] }
That title is generic, the oneLineWhy is meaningless, and 1 concept of the same protein/technique as chicken-based would violate diversity.`;

  const user = stableJson({
    // Goal and targets sent together so model sees the relationship
    goal: ctx.profile.goal,
    targets: ctx.profile.targets,
    weight_kg: ctx.profile.weight_kg,   // needed for protein-per-kg reasoning
    activity_level: ctx.profile.activity_level,
    // Allergies labeled separately from dislikes — model must treat them differently
    HARD_ALLERGIES_NEVER_INCLUDE: ctx.profile.allergies,
    SOFT_DISLIKES_AVOID_IF_POSSIBLE: ctx.profile.dislikes,
    preferred_cuisines: ctx.profile.cuisines,
    equipment: ctx.profile.equipment,
    pantry: ctx.pantry.map((p) => p.name),
    checkin: ctx.checkin ?? null,
    signals: ctx.signals ?? null,
    request: ctx.request,
    promptsVersion: PROMPTS_VERSION,
  });

  return { system, user };
}

// ─── DETAIL PROMPT ──────────────────────────────────────────────────────────
// WHY: Explicit field descriptions prevent under-specified values. Allergen
//      reminder is repeated because the detail call is where hallucination risk
//      is highest (model is generating ingredient lists, not just titles).
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
  "missingItems": string[] (ingredients not in the user's pantry)
}

ALLERGEN REMINDER: The following ingredients and all their hidden forms are FORBIDDEN.
Allergies: ${JSON.stringify(ctx.profile.allergies)}
Check every ingredient name AND every note field. If a step would normally use a
forbidden ingredient, substitute explicitly (e.g., "coconut aminos instead of soy sauce").`;

  const user = stableJson({
    concept,
    goal: ctx.profile.goal,
    targets: ctx.profile.targets,
    weight_kg: ctx.profile.weight_kg,
    HARD_ALLERGIES_NEVER_INCLUDE: ctx.profile.allergies,
    equipment: ctx.profile.equipment,
    pantry: ctx.pantry.map((p) => p.name),
    request: ctx.request,
    promptsVersion: PROMPTS_VERSION,
  });

  return { system, user };
}

// ─── RATIONALE PROMPT ───────────────────────────────────────────────────────
// WHY: Requiring per-meal rationale to name a specific signal prevents generic
//      copy. Including checkin + signals gives the model the context it needs
//      to write copy that feels personal.
export function buildRationalePrompt(
  titles: string[],
  ctx: RecommendationContext,
): { system: string; user: string } {
  const system = `${SYSTEM_PROMPT_BASE}

Task: Write coaching copy for the chosen meals.

Return:
{
  "overall": string (max 500 chars — 2 sentences max; name the user's current
    energy state and goal; do NOT use "balanced" or "healthy" without specifics),
  "perMeal": [
    {
      "title": string,
      "rationale": string (max 280 chars — must name one specific user signal
        [energy/training/sleep/pantry item] and one nutritional mechanism;
        different signal for each meal)
    }
  ]
}

STYLE RULE: Every rationale sentence must be different — vary which signal is
cited (energy for one, sleep for another, pantry for another).`;

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
```

---

## Suggested Prompt-Quality Tests

These are spec-style assertions that can become Vitest cases in the engine test suite.

```ts
// 1. ALLERGY SAFETY — ingredient.note must also be checked
// Given: allergies=['peanut'], model returns ingredient with note="toss in peanut sauce"
// Expected: filterCandidates drops the candidate
// Current gap: containsAllergen only checks ing.name, not ing.note

// 2. SNACK CALORIE SCALING
// Given: mealType='snack', targets.kcal=2000
// Expected: every surviving candidate.estMacros.kcal <= 400
// Current gap: no constraint in prompt; model often returns 600-900kcal "snacks"

// 3. CUISINE DIVERSITY
// Given: candidateCount=3, pantry has chicken + rice + broccoli
// Expected: plan response concepts span at least 2 distinct cuisine values
// Current gap: prompt has no diversity directive; model collapses to american

// 4. HIGH-ALLERGY LOAD — no hallucinated cross-contaminant
// Given: allergies=['peanut','almond','cashew','walnut','hazelnut','pistachio']
// Expected: no candidate ingredient.name contains any listed term OR
//           known hidden forms (satay, mole, praline, nut butter)
// Current gap: prompt has no cross-contamination vocabulary

// 5. RATIONALE SPECIFICITY
// Given: any valid ctx with checkin.energy=1 and signals.sleep.quality='poor'
// Expected: rationale.overall references either energy level OR sleep quality
//           (not a generic "these meals fit your goals" string)
// Current gap: no style enforcement; fallback is a hardcoded generic string
```