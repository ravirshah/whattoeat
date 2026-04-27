import { z } from 'zod';

/**
 * Eight Sleep API response schemas.
 * Field names are taken verbatim from the wire format (see steipete/eightctl
 * internal/client/eightsleep.go for the reference Go structs).
 */

export const EightSleepTokenResponse = z.object({
  access_token: z.string().min(1),
  expires_in: z.number().int().positive().default(3600),
  userId: z.string().min(1).optional(),
});
export type EightSleepTokenResponse = z.infer<typeof EightSleepTokenResponse>;

export const EightSleepUserMeResponse = z.object({
  user: z.object({
    userId: z.string().min(1),
    email: z.string().optional(),
    currentDevice: z.object({ id: z.string().optional() }).optional(),
  }),
});
export type EightSleepUserMeResponse = z.infer<typeof EightSleepUserMeResponse>;

export const EightSleepStage = z.object({
  stage: z.string(),
  duration: z.number(),
});

export const EightSleepDay = z.object({
  day: z.string(),
  score: z.number().nullable().optional(),
  tnt: z.number().nullable().optional(),
  respiratoryRate: z.number().nullable().optional(),
  heartRate: z.number().nullable().optional(),
  latencyAsleepSeconds: z.number().nullable().optional(),
  latencyOutSeconds: z.number().nullable().optional(),
  sleepDurationSeconds: z.number().nullable().optional(),
  stages: z.array(EightSleepStage).optional(),
  sleepQualityScore: z
    .object({
      hrv: z.object({ score: z.number().nullable().optional() }).optional(),
      respiratoryRate: z.object({ score: z.number().nullable().optional() }).optional(),
    })
    .optional(),
});
export type EightSleepDay = z.infer<typeof EightSleepDay>;

export const EightSleepTrendsResponse = z.object({
  days: z.array(EightSleepDay).default([]),
});
export type EightSleepTrendsResponse = z.infer<typeof EightSleepTrendsResponse>;
