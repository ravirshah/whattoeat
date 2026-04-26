import { z } from 'zod';

export const Macros = z.object({
  kcal: z.number().int().nonnegative(),
  protein_g: z.number().int().nonnegative(),
  carbs_g: z.number().int().nonnegative(),
  fat_g: z.number().int().nonnegative(),
});
export type Macros = z.infer<typeof Macros>;

export const Ingredient = z.object({
  name: z.string().min(1).max(120),
  qty: z.number().nonnegative().nullable(),
  unit: z.string().max(20).nullable(),
  note: z.string().max(120).nullable().optional(),
});
export type Ingredient = z.infer<typeof Ingredient>;

export const Step = z.object({
  idx: z.number().int().min(1),
  text: z.string().min(1).max(800),
  durationMin: z.number().int().nonnegative().nullable().optional(),
});
export type Step = z.infer<typeof Step>;

export const RecipeSource = z.enum(['ai-generated', 'user-saved', 'imported']);
export type RecipeSource = z.infer<typeof RecipeSource>;

export const Recipe = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  title: z.string().min(1).max(120),
  description: z.string().max(500).nullable(),
  ingredients: z.array(Ingredient).min(1).max(50),
  steps: z.array(Step).min(1).max(40),
  macros: Macros,
  servings: z.number().int().min(1).max(20),
  total_minutes: z.number().int().min(1).max(480),
  cuisine: z.string().max(40).nullable(),
  tags: z.array(z.string().min(1).max(40)).default([]),
  source: RecipeSource,
  generated_run_id: z.string().uuid().nullable(),
  saved: z.boolean(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type Recipe = z.infer<typeof Recipe>;
