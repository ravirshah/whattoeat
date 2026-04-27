import type { EightSleepCredentials } from '@/contracts/zod/integrations';
import type { EightSleepClient } from './client';

export interface EnsureTokenResult {
  /** Access token to send in Authorization header. */
  token: string;
  /**
   * If non-null, persist these credentials back to the integrations row.
   * Either a fresh login completed or a 401-driven re-auth happened.
   */
  updatedCreds: EightSleepCredentials | null;
  /** Eight Sleep userId, populated by the auth response when freshly logged in. */
  userId: string | null;
}

/**
 * Returns an access token, freshly authenticating (and producing updated creds)
 * if the cached one is missing or has passed its safety-margin expiry.
 *
 * `forceReauth=true` skips the cache check, used to recover from a 401 when the
 * cached token is reported valid but the server rejects it.
 */
export async function ensureAccessToken(
  client: EightSleepClient,
  creds: EightSleepCredentials,
  now: Date = new Date(),
  forceReauth = false,
): Promise<EnsureTokenResult> {
  if (!forceReauth && creds.access_token && creds.expires_at) {
    const exp = new Date(creds.expires_at).getTime();
    if (Number.isFinite(exp) && exp > now.getTime()) {
      return { token: creds.access_token, updatedCreds: null, userId: null };
    }
  }
  const fresh = await client.authenticate(creds.email, creds.password);
  return {
    token: fresh.access_token,
    updatedCreds: {
      ...creds,
      access_token: fresh.access_token,
      expires_at: fresh.expires_at,
    },
    userId: fresh.userId,
  };
}
