import type { MacroTargets, Profile } from '@/contracts/zod/profile';

const ACTIVITY_FACTORS: Record<string, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

const GOAL_ADJUSTMENTS: Record<string, number> = {
  cut: 0.8,
  maintain: 1.0,
  bulk: 1.15,
};

/**
 * Computes macro targets from a Profile using Mifflin-St Jeor BMR,
 * an activity multiplier, and a goal adjustment.
 *
 * Returns null if any required biometric field (height_cm, weight_kg,
 * birthdate) is null — the caller should prompt the user to complete
 * their profile.
 *
 * Pure function: deterministic, no I/O, safe to call in any context.
 */
export function computeTargets(profile: Profile): MacroTargets | null {
  const { height_cm, weight_kg, birthdate, sex, activity_level, goal } = profile;

  if (height_cm == null || weight_kg == null || birthdate == null) {
    return null;
  }

  // Age in whole years relative to today
  const today = new Date();
  const birth = new Date(birthdate);
  let age = today.getFullYear() - birth.getFullYear();
  const hasBirthdayPassed =
    today.getMonth() > birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate());
  if (!hasBirthdayPassed) age -= 1;

  // Mifflin-St Jeor BMR
  // Male (and conservative fallback for 'other'/'prefer_not_to_say'):
  //   BMR = 10w + 6.25h − 5a + 5
  // Female:
  //   BMR = 10w + 6.25h − 5a − 161
  const sexOffset = sex === 'female' ? -161 : 5;
  const bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age + sexOffset;

  // TDEE = BMR × activity factor
  const factor = ACTIVITY_FACTORS[activity_level ?? 'sedentary'] ?? 1.2;
  const tdee = bmr * factor;

  // Goal-adjusted calorie target
  const goalFactor = GOAL_ADJUSTMENTS[goal] ?? 1.0;
  const kcal = Math.round(tdee * goalFactor);

  // Macro split
  // Protein: 1 g per lb of body weight, capped at 250 g
  const protein_g = Math.min(Math.floor(weight_kg * 2.20462), 250);

  // Fat: 25% of kcal, converted to grams (9 kcal/g)
  const fat_g = Math.round((kcal * 0.25) / 9);

  // Carbs: remainder calories ÷ 4 kcal/g, floored at 0
  const carbKcal = kcal - protein_g * 4 - fat_g * 9;
  const carbs_g = Math.max(Math.floor(carbKcal / 4), 0);

  return { kcal, protein_g, carbs_g, fat_g };
}
