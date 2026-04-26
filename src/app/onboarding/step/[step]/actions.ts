'use server';

import { requireUser } from '@/server/auth';
import type { ActionResult } from '@/server/contracts';
import { ServerError } from '@/server/contracts';
import { upsertProfile } from '@/server/profile/repo';
import { redirect } from 'next/navigation';
import { z } from 'zod';

// ADAPTATION NOTES:
// - upsertProfile takes (userId, patch) — no supabase arg (uses Drizzle ORM directly)
// - Goal enum is 'cut' | 'maintain' | 'bulk' (not 'lose' | 'gain' | 'performance')
// - targets are in nested { kcal, protein_g, carbs_g, fat_g } shape (not flat)
// - Profile uses 'allergies' (not 'allergens')
// - bulkAddPantryItems(names) — no supabase/userId args (action handles it)
// - There is no onboarding_completed_at column — pantry seed step redirects to /home
//   which becomes the de-facto completion signal (middleware gate checks targets.kcal > 0)

// ── Step 1: Goal ─────────────────────────────────────────────────────────────

const GoalSchema = z.object({
  goal: z.enum(['cut', 'maintain', 'bulk']),
});

export async function submitGoalStep(
  _prev: ActionResult<void>,
  formData: FormData,
): Promise<ActionResult<void>> {
  const { userId } = await requireUser();
  const parsed = GoalSchema.safeParse({ goal: formData.get('goal') });

  if (!parsed.success) {
    return {
      ok: false,
      error: new ServerError('validation_failed', 'Please select a goal to continue.'),
    };
  }

  await upsertProfile(userId, { goal: parsed.data.goal });

  redirect('/onboarding/step/2');
}

// ── Step 2: Body data ─────────────────────────────────────────────────────────

const BodyDataSchema = z.object({
  height_cm: z.coerce.number().min(100).max(250),
  weight_kg: z.coerce.number().min(30).max(300),
  birthdate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter date as YYYY-MM-DD'),
  sex: z.enum(['male', 'female', 'other', 'prefer_not_to_say']),
  activity_level: z.enum(['sedentary', 'light', 'moderate', 'active', 'very_active']),
});

export async function submitBodyDataStep(
  _prev: ActionResult<void>,
  formData: FormData,
): Promise<ActionResult<void>> {
  const { userId } = await requireUser();

  const raw = {
    height_cm: formData.get('height_cm'),
    weight_kg: formData.get('weight_kg'),
    birthdate: formData.get('birthdate'),
    sex: formData.get('sex'),
    activity_level: formData.get('activity_level'),
  };

  const parsed = BodyDataSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.errors[0];
    return {
      ok: false,
      error: new ServerError('validation_failed', first?.message ?? 'Please check your inputs.'),
    };
  }

  await upsertProfile(userId, parsed.data);

  redirect('/onboarding/step/3');
}

// ── Step 3: Confirm targets ───────────────────────────────────────────────────

const ConfirmTargetsSchema = z.object({
  target_kcal: z.coerce.number().min(800).max(10000),
  target_protein_g: z.coerce.number().min(10).max(500),
  target_carbs_g: z.coerce.number().min(0).max(800),
  target_fat_g: z.coerce.number().min(10).max(500),
});

export async function submitConfirmTargetsStep(
  _prev: ActionResult<void>,
  formData: FormData,
): Promise<ActionResult<void>> {
  const { userId } = await requireUser();

  const raw = {
    target_kcal: formData.get('target_kcal'),
    target_protein_g: formData.get('target_protein_g'),
    target_carbs_g: formData.get('target_carbs_g'),
    target_fat_g: formData.get('target_fat_g'),
  };

  const parsed = ConfirmTargetsSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.errors[0];
    return {
      ok: false,
      error: new ServerError('validation_failed', first?.message ?? 'Please check your targets.'),
    };
  }

  // Persist targets in the nested MacroTargets shape
  await upsertProfile(userId, {
    targets: {
      kcal: parsed.data.target_kcal,
      protein_g: parsed.data.target_protein_g,
      carbs_g: parsed.data.target_carbs_g,
      fat_g: parsed.data.target_fat_g,
    },
  });

  redirect('/onboarding/step/4');
}

// ── Step 4: Allergens/Dietary notes ──────────────────────────────────────────

const AllergensSchema = z.object({
  allergens: z.array(z.string()).default([]),
});

export async function submitAllergensStep(
  _prev: ActionResult<void>,
  formData: FormData,
): Promise<ActionResult<void>> {
  const { userId } = await requireUser();

  const allergens = formData.getAll('allergens') as string[];
  const parsed = AllergensSchema.safeParse({ allergens });

  if (!parsed.success) {
    return {
      ok: false,
      error: new ServerError('internal', 'Something went wrong. Please try again.'),
    };
  }

  // Write to 'allergies' (the actual field name on Profile)
  await upsertProfile(userId, { allergies: parsed.data.allergens });

  redirect('/onboarding/step/5');
}

// ── Step 5: Pantry seed ───────────────────────────────────────────────────────

const PantrySeedSchema = z.object({
  pantry_text: z.string().max(2000).default(''),
});

export async function submitPantrySeedStep(
  _prev: ActionResult<void>,
  formData: FormData,
): Promise<ActionResult<void>> {
  const { userId: _userId } = await requireUser();

  const raw = { pantry_text: formData.get('pantry_text') ?? '' };
  const parsed = PantrySeedSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      ok: false,
      error: new ServerError('validation_failed', 'Input too long. Keep it under 2000 characters.'),
    };
  }

  const names = parsed.data.pantry_text
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (names.length > 0) {
    // bulkAddPantryItems handles auth internally — no userId arg needed
    const { bulkAddPantryItems } = await import('@/server/pantry');
    await bulkAddPantryItems(names);
  }

  // Redirect to home — completion is tracked by middleware gate (targets.kcal > 0)
  redirect('/home');
}
