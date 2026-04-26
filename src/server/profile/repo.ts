import type { Profile, ProfileUpdate } from '@/contracts/zod/profile';
import { db } from '@/db/client';
import { profiles } from '@/db/schema/profiles';
import { eq } from 'drizzle-orm';

/** Maps a Drizzle profile row to the contract Profile shape. */
function rowToProfile(row: typeof profiles.$inferSelect): Profile {
  return {
    user_id: row.user_id,
    display_name: row.display_name ?? null,
    goal: row.goal as Profile['goal'],
    targets: {
      kcal: row.target_kcal,
      protein_g: row.target_protein_g,
      carbs_g: row.target_carbs_g,
      fat_g: row.target_fat_g,
    },
    height_cm: row.height_cm != null ? Number(row.height_cm) : null,
    weight_kg: row.weight_kg != null ? Number(row.weight_kg) : null,
    birthdate: row.birthdate ?? null,
    sex: (row.sex as Profile['sex']) ?? null,
    activity_level: (row.activity_level as Profile['activity_level']) ?? null,
    allergies: (row.allergies as string[]) ?? [],
    dislikes: (row.dislikes as string[]) ?? [],
    cuisines: (row.cuisines as string[]) ?? [],
    equipment: (row.equipment as string[]) ?? [],
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}

/**
 * Fetches the profile for a given userId.
 * Returns null if no profile row exists yet (triggers onboarding).
 */
export async function getProfileByUserId(userId: string): Promise<Profile | null> {
  const rows = await db.select().from(profiles).where(eq(profiles.user_id, userId));
  if (rows.length === 0) return null;
  const row = rows[0];
  if (!row) return null;
  // target_kcal === 0 is the onboarding-pending sentinel written by the auth trigger
  if (row.target_kcal === 0) return null;
  return rowToProfile(row);
}

/**
 * Upserts a profile row. On conflict (same user_id) updates only the
 * provided fields. Always sets updated_at via the DB trigger.
 */
export async function upsertProfile(userId: string, patch: ProfileUpdate): Promise<Profile> {
  const { targets, ...rest } = patch;

  const values = {
    user_id: userId,
    ...(rest.display_name !== undefined && { display_name: rest.display_name }),
    ...(rest.goal !== undefined && { goal: rest.goal }),
    ...(targets?.kcal !== undefined && { target_kcal: targets.kcal }),
    ...(targets?.protein_g !== undefined && { target_protein_g: targets.protein_g }),
    ...(targets?.carbs_g !== undefined && { target_carbs_g: targets.carbs_g }),
    ...(targets?.fat_g !== undefined && { target_fat_g: targets.fat_g }),
    ...(rest.height_cm !== undefined && { height_cm: rest.height_cm?.toString() }),
    ...(rest.weight_kg !== undefined && { weight_kg: rest.weight_kg?.toString() }),
    ...(rest.birthdate !== undefined && { birthdate: rest.birthdate }),
    ...(rest.sex !== undefined && { sex: rest.sex }),
    ...(rest.activity_level !== undefined && { activity_level: rest.activity_level }),
    ...(rest.allergies !== undefined && { allergies: rest.allergies }),
    ...(rest.dislikes !== undefined && { dislikes: rest.dislikes }),
    ...(rest.cuisines !== undefined && { cuisines: rest.cuisines }),
    ...(rest.equipment !== undefined && { equipment: rest.equipment }),
  };

  const insertDefaults = {
    goal: 'maintain' as const,
    target_kcal: 2000,
    target_protein_g: 150,
    target_carbs_g: 220,
    target_fat_g: 55,
  };
  const rows = await db
    .insert(profiles)
    .values({
      ...insertDefaults,
      ...values,
      user_id: userId,
    })
    .onConflictDoUpdate({
      target: profiles.user_id,
      set: values,
    })
    .returning();

  const upserted = rows[0];
  if (!upserted) throw new Error('upsertProfile: no row returned');
  return rowToProfile(upserted);
}
