import { z } from 'zod';

export const SleepQuality = z.enum(['poor', 'ok', 'great']);

export const SleepSignal = z.object({
  lastNightHours: z.number().nonnegative(),
  quality: SleepQuality.optional(),
});

export const TrainingSignal = z.object({
  yesterdayLoad: z.enum(['rest', 'light', 'hard']).optional(),
  muscleGroups: z.array(z.string()).optional(),
});

export const RecoverySignal = z.object({
  hrvMs: z.number().nonnegative().optional(),
  restingHr: z.number().nonnegative().optional(),
});

export const LabsSignal = z.object({
  fastingGlucose: z.number().nonnegative().optional(),
  recentBiomarkers: z.record(z.string(), z.number()).optional(),
});

export const HealthSignals = z.object({
  sleep: SleepSignal.optional(),
  training: TrainingSignal.optional(),
  recovery: RecoverySignal.optional(),
  labs: LabsSignal.optional(),
});
export type HealthSignals = z.infer<typeof HealthSignals>;

export const SignalSource = z.enum(['apple_health', 'eight_sleep', 'superpower']);
export type SignalSource = z.infer<typeof SignalSource>;
