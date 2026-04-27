import 'server-only';
import type { HealthSignals } from '@/contracts/zod';
import type { IntegrationProvider } from '@/contracts/zod/integrations';
import { db } from '@/db/client';
import { signal_snapshots } from '@/db/schema/signal-snapshots';
import type { DateRange } from '@/engine/ports/signal-provider';
import { mapSleepDayToSignals } from '@/server/adapters/eight-sleep/mapping';
import type { EightSleepDay } from '@/server/adapters/eight-sleep/schema';
import { and, desc, eq } from 'drizzle-orm';
import { getProvider } from './registry';
import { listAllConnected, listIntegrationsByUser } from './repo';

const STALE_HOURS = 18;

export interface SyncResult {
  user_id: string;
  provider: IntegrationProvider;
  ok: boolean;
  error?: string;
}

/**
 * Run the provider's live `getSignals` for a single (user, provider). Errors
 * are caught and reported per-row; the function never throws upstream so a
 * cron iteration can continue past one bad integration.
 */
export async function runProviderSync(
  userId: string,
  provider: IntegrationProvider,
  range: DateRange,
): Promise<SyncResult> {
  const adapter = getProvider(provider);
  if (!adapter) {
    return { user_id: userId, provider, ok: false, error: 'No adapter registered for provider' };
  }
  try {
    await adapter.getSignals(userId, range);
    return { user_id: userId, provider, ok: true };
  } catch (e) {
    return {
      user_id: userId,
      provider,
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

/**
 * Sync every (user, provider) pair currently in the connected state.
 * Used by the daily cron.
 */
export async function syncAllConnected(range: DateRange): Promise<SyncResult[]> {
  const rows = await listAllConnected();
  const out: SyncResult[] = [];
  for (const row of rows) {
    out.push(await runProviderSync(row.user_id, row.provider as IntegrationProvider, range));
  }
  return out;
}

/**
 * Read the most recent snapshot row for a (user, source) pair and map its
 * payload back to HealthSignals. Falls back to a live sync if the snapshot
 * is older than STALE_HOURS or absent.
 */
async function readSignalsFromCacheOrSync(
  userId: string,
  provider: IntegrationProvider,
  range: DateRange,
): Promise<Partial<HealthSignals>> {
  const cacheCutoff = new Date(Date.now() - STALE_HOURS * 60 * 60 * 1000);
  const cached = await db
    .select()
    .from(signal_snapshots)
    .where(and(eq(signal_snapshots.user_id, userId), eq(signal_snapshots.source, provider)))
    .orderBy(desc(signal_snapshots.observed_at))
    .limit(1);
  const latest = cached[0];

  if (latest && latest.created_at > cacheCutoff) {
    return mapSnapshotPayload(provider, latest.payload);
  }

  // No fresh snapshot — trigger a live pull. Best-effort: if it fails we still
  // try to return whatever cached data we have.
  const adapter = getProvider(provider);
  if (adapter) {
    try {
      const fresh = await adapter.getSignals(userId, range);
      if (Object.keys(fresh).length > 0) return fresh;
    } catch {
      // swallow — fall through to stale cache below
    }
  }
  if (latest) return mapSnapshotPayload(provider, latest.payload);
  return {};
}

function mapSnapshotPayload(
  provider: IntegrationProvider,
  payload: unknown,
): Partial<HealthSignals> {
  if (provider === 'eight_sleep') {
    return mapSleepDayToSignals(payload as EightSleepDay);
  }
  return {};
}

export interface LatestSnapshot {
  observed_at: string;
  created_at: string;
  raw: unknown;
  mapped: Partial<HealthSignals>;
}

/**
 * Read the most recent snapshot for (user, provider) and return both the
 * raw provider payload and the mapped HealthSignals. Returns null when no
 * snapshot exists yet — caller can prompt a manual sync.
 */
export async function getLatestSnapshot(
  userId: string,
  provider: IntegrationProvider,
): Promise<LatestSnapshot | null> {
  const rows = await db
    .select()
    .from(signal_snapshots)
    .where(and(eq(signal_snapshots.user_id, userId), eq(signal_snapshots.source, provider)))
    .orderBy(desc(signal_snapshots.observed_at))
    .limit(1);
  const latest = rows[0];
  if (!latest) return null;
  return {
    observed_at: latest.observed_at.toISOString(),
    created_at: latest.created_at.toISOString(),
    raw: latest.payload,
    mapped: mapSnapshotPayload(provider, latest.payload),
  };
}

/**
 * Fan out across the user's connected integrations and merge their signals
 * into a single HealthSignals object. Errors per provider are swallowed so
 * one failing integration never breaks a recommendation request.
 */
export async function getSignalsForUser(
  userId: string,
  range: DateRange,
): Promise<Partial<HealthSignals>> {
  const integrations = await listIntegrationsByUser(userId);
  const connected = integrations.filter((i) => i.status === 'connected');
  if (connected.length === 0) return {};

  const merged: Partial<HealthSignals> = {};
  for (const integration of connected) {
    try {
      const partial = await readSignalsFromCacheOrSync(userId, integration.provider, range);
      mergeSignals(merged, partial);
    } catch {
      // Per-provider failure — keep going.
    }
  }
  return merged;
}

function mergeSignals(into: Partial<HealthSignals>, from: Partial<HealthSignals>): void {
  if (from.sleep) into.sleep = { ...into.sleep, ...from.sleep };
  if (from.recovery) into.recovery = { ...into.recovery, ...from.recovery };
  if (from.training) into.training = { ...into.training, ...from.training };
  if (from.labs) into.labs = { ...into.labs, ...from.labs };
}
