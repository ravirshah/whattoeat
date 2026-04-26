import { z } from 'zod';

export const TrainingLevel = z.enum(['none', 'light', 'hard']);
export type TrainingLevel = z.infer<typeof TrainingLevel>;

export const HungerLevel = z.enum(['low', 'normal', 'high']);
export type HungerLevel = z.infer<typeof HungerLevel>;

export const Checkin = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  date: z.string().date(),
  energy: z.number().int().min(1).max(5),
  training: TrainingLevel,
  hunger: HungerLevel,
  note: z.string().max(500).nullable(),
  created_at: z.string().datetime(),
});
export type Checkin = z.infer<typeof Checkin>;

export const CheckinUpsert = z.object({
  date: z.string().date(),
  energy: z.number().int().min(1).max(5),
  training: TrainingLevel,
  hunger: HungerLevel,
  note: z.string().max(500).nullable().optional(),
});
export type CheckinUpsert = z.infer<typeof CheckinUpsert>;
