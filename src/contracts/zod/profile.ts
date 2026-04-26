import { z } from 'zod';

export const Goal = z.enum(['cut', 'maintain', 'bulk']);
export type Goal = z.infer<typeof Goal>;

export const Sex = z.enum(['male', 'female', 'other', 'prefer_not_to_say']);
export type Sex = z.infer<typeof Sex>;

export const ActivityLevel = z.enum(['sedentary', 'light', 'moderate', 'active', 'very_active']);
export type ActivityLevel = z.infer<typeof ActivityLevel>;

export const MacroTargets = z.object({
  kcal: z.number().int().positive(),
  protein_g: z.number().int().nonnegative(),
  carbs_g: z.number().int().nonnegative(),
  fat_g: z.number().int().nonnegative(),
});
export type MacroTargets = z.infer<typeof MacroTargets>;

export const Profile = z.object({
  user_id: z.string().uuid(),
  display_name: z.string().min(1).max(80).nullable(),
  goal: Goal,
  targets: MacroTargets,
  height_cm: z.number().positive().nullable(),
  weight_kg: z.number().positive().nullable(),
  birthdate: z.string().date().nullable(),
  sex: Sex.nullable(),
  activity_level: ActivityLevel.nullable(),
  allergies: z.array(z.string().min(1)).default([]),
  dislikes: z.array(z.string().min(1)).default([]),
  cuisines: z.array(z.string().min(1)).default([]),
  equipment: z.array(z.string().min(1)).default([]),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type Profile = z.infer<typeof Profile>;

export const ProfileUpdate = Profile.omit({
  user_id: true,
  created_at: true,
  updated_at: true,
}).partial();
export type ProfileUpdate = z.infer<typeof ProfileUpdate>;
