import { z } from 'zod';

export const IntegrationProvider = z.enum([
  'eight_sleep',
  'apple_health',
  'superpower',
  'whoop',
  'oura',
  'garmin',
  'strava',
  'mfp',
  'cronometer',
]);
export type IntegrationProvider = z.infer<typeof IntegrationProvider>;

export const IntegrationStatus = z.enum(['connected', 'disconnected', 'error', 'expired']);
export type IntegrationStatus = z.infer<typeof IntegrationStatus>;

/**
 * Eight Sleep does not issue refresh tokens — its OAuth password grant returns
 * only an access_token + expires_in. We therefore persist the email + password
 * (encrypted at rest) so the daily sync can re-authenticate when the cached
 * token expires. Plaintext access_token + expires_at are cached opportunistically
 * to skip re-auth between syncs.
 */
export const EightSleepCredentials = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  access_token: z.string().nullable(),
  expires_at: z.string().nullable(),
});
export type EightSleepCredentials = z.infer<typeof EightSleepCredentials>;

export const EightSleepMetadata = z.object({
  providerUserId: z.string().min(1),
  email: z.string().email(),
});
export type EightSleepMetadata = z.infer<typeof EightSleepMetadata>;

/**
 * Client-safe view of a connected integration.
 * Never includes the encrypted credentials blob.
 */
export const IntegrationSummary = z.object({
  provider: IntegrationProvider,
  status: IntegrationStatus,
  connected_at: z.string(),
  last_synced_at: z.string().nullable(),
  last_error: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()),
});
export type IntegrationSummary = z.infer<typeof IntegrationSummary>;
