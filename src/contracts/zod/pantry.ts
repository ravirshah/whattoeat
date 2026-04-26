import { z } from 'zod';

export const PantryCategory = z.enum([
  'protein',
  'produce',
  'grain',
  'dairy',
  'pantry',
  'other',
]);
export type PantryCategory = z.infer<typeof PantryCategory>;

export const PantryItem = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  name: z.string().min(1).max(80),
  display_name: z.string().min(1).max(120),
  category: PantryCategory,
  available: z.boolean(),
  added_at: z.string().datetime(),
});
export type PantryItem = z.infer<typeof PantryItem>;

export const PantryItemCreate = z.object({
  display_name: z.string().min(1).max(120),
});
export type PantryItemCreate = z.infer<typeof PantryItemCreate>;

export const PantryItemUpdate = z.object({
  available: z.boolean().optional(),
  category: PantryCategory.optional(),
  display_name: z.string().min(1).max(120).optional(),
});
export type PantryItemUpdate = z.infer<typeof PantryItemUpdate>;
