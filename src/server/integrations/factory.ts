import 'server-only';
import { EightSleepCredentials } from '@/contracts/zod/integrations';
import { db } from '@/db/client';
import { signal_snapshots } from '@/db/schema/signal-snapshots';
import { EightSleepClient } from '@/server/adapters/eight-sleep/client';
import { EightSleepSignalProvider } from '@/server/adapters/eight-sleep/provider';
import { openCredentials, sealCredentials } from './credentials';
import { getIntegrationRow, markSyncError, markSyncSuccess, updateCredentials } from './repo';

/**
 * Build the production-wired Eight Sleep provider. Tests should construct
 * EightSleepSignalProvider directly with mocked deps instead of using this.
 */
export function createEightSleepProvider(opts?: {
  client?: EightSleepClient;
  timezone?: string;
}): EightSleepSignalProvider {
  const client = opts?.client ?? new EightSleepClient();
  return new EightSleepSignalProvider({
    client,
    timezone: opts?.timezone,
    loadRow: (userId) => getIntegrationRow(userId, 'eight_sleep'),
    saveCredentials: (userId, sealed) => updateCredentials(userId, 'eight_sleep', sealed),
    insertSnapshot: async ({ userId, observedAt, payload }) => {
      await db.insert(signal_snapshots).values({
        user_id: userId,
        source: 'eight_sleep',
        kind: 'sleep_day',
        payload: payload as Record<string, unknown>,
        observed_at: observedAt,
      });
    },
    markSuccess: (userId) => markSyncSuccess(userId, 'eight_sleep'),
    markError: (userId, msg) => markSyncError(userId, 'eight_sleep', msg, 'error'),
    open: (blob) => openCredentials(blob, EightSleepCredentials),
    seal: (creds) => sealCredentials(creds),
  });
}
