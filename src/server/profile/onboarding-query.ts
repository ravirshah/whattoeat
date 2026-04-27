'use server';

import type { Profile } from '@/contracts/zod/profile';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Fetches the superset of profile columns needed across onboarding layout,
 * step page, and middleware. Centralising this query means schema changes
 * only need a single update.
 *
 * Returns a `Partial<Profile>` shaped for onboarding checks, or null if
 * no profile row exists yet.
 */
export async function getPartialProfileForOnboarding(
  userId: string,
  supabase: SupabaseClient,
): Promise<Partial<Profile> | null> {
  const { data: profileRow } = await supabase
    .from('profiles')
    .select(
      'goal, height_cm, weight_kg, birthdate, sex, activity_level, target_kcal, target_protein_g, target_carbs_g, target_fat_g, allergies',
    )
    .eq('user_id', userId)
    .maybeSingle();

  if (!profileRow) return null;

  return {
    goal: profileRow.goal as Profile['goal'],
    height_cm: profileRow.height_cm ? Number(profileRow.height_cm) : null,
    weight_kg: profileRow.weight_kg ? Number(profileRow.weight_kg) : null,
    birthdate: profileRow.birthdate ?? null,
    sex: (profileRow.sex as Profile['sex']) ?? null,
    activity_level: (profileRow.activity_level as Profile['activity_level']) ?? null,
    targets: {
      kcal: profileRow.target_kcal ?? 0,
      protein_g: profileRow.target_protein_g ?? 0,
      carbs_g: profileRow.target_carbs_g ?? 0,
      fat_g: profileRow.target_fat_g ?? 0,
    },
    allergies: (profileRow.allergies as string[]) ?? [],
  };
}
