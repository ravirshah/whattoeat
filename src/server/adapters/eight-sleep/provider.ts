import 'server-only';
import type { HealthSignals } from '@/contracts/zod';
import { type EightSleepCredentials, EightSleepMetadata } from '@/contracts/zod/integrations';
import type { IntegrationRow } from '@/db/schema/integrations';
import type { DateRange, SignalProvider } from '@/engine/ports/signal-provider';
import { ensureAccessToken } from './auth';
import { type EightSleepClient, EightSleepError } from './client';
import { mapSleepDayToSignals, pickLatestUsableDay } from './mapping';

export interface EightSleepProviderDeps {
  client: EightSleepClient;

  loadRow: (userId: string) => Promise<IntegrationRow | null>;
  saveCredentials: (userId: string, sealed: Buffer) => Promise<void>;
  insertSnapshot: (input: {
    userId: string;
    observedAt: Date;
    payload: unknown;
  }) => Promise<void>;
  markSuccess: (userId: string) => Promise<void>;
  markError: (userId: string, message: string) => Promise<void>;

  open: (blob: Buffer) => EightSleepCredentials;
  seal: (creds: EightSleepCredentials) => Buffer;

  now?: () => Date;
  timezone?: string;
}

export class EightSleepSignalProvider implements SignalProvider {
  readonly source = 'eight_sleep' as const;

  constructor(private readonly deps: EightSleepProviderDeps) {}

  async getSignals(userId: string, range: DateRange): Promise<Partial<HealthSignals>> {
    const row = await this.deps.loadRow(userId);
    if (!row || row.status !== 'connected') return {};

    const tz = this.deps.timezone ?? process.env.DEFAULT_TIMEZONE ?? 'America/New_York';
    const now = this.deps.now?.() ?? new Date();

    try {
      const creds = this.deps.open(Buffer.from(row.credentials));
      const meta = EightSleepMetadata.parse(row.metadata);

      // First attempt — use cached token if fresh, else log in.
      let auth = await ensureAccessToken(this.deps.client, creds, now);
      if (auth.updatedCreds) {
        await this.deps.saveCredentials(userId, this.deps.seal(auth.updatedCreds));
      }

      let days: Awaited<ReturnType<typeof this.deps.client.getTrends>>;
      try {
        days = await this.deps.client.getTrends(auth.token, meta.providerUserId, {
          from: range.from,
          to: range.to,
          timezone: tz,
        });
      } catch (e) {
        if (e instanceof EightSleepError && e.code === 'unauthorized') {
          // Cached token was rejected despite the safety margin — re-auth and retry once.
          auth = await ensureAccessToken(this.deps.client, creds, now, true);
          if (auth.updatedCreds) {
            await this.deps.saveCredentials(userId, this.deps.seal(auth.updatedCreds));
          }
          days = await this.deps.client.getTrends(auth.token, meta.providerUserId, {
            from: range.from,
            to: range.to,
            timezone: tz,
          });
        } else {
          throw e;
        }
      }

      const latest = pickLatestUsableDay(days);
      if (!latest) {
        await this.deps.markSuccess(userId);
        return {};
      }

      await this.deps.insertSnapshot({
        userId,
        observedAt: parseSleepDayObservedAt(latest.day),
        payload: latest,
      });
      await this.deps.markSuccess(userId);
      return mapSleepDayToSignals(latest);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      await this.deps.markError(userId, message).catch(() => {});
      throw e;
    }
  }
}

/**
 * Eight Sleep `day` strings are the local-night start date (YYYY-MM-DD).
 * Treat them as UTC midnight — the signal_snapshots.observed_at field is
 * informational, and the day boundary is what matters for ordering.
 */
function parseSleepDayObservedAt(day: string): Date {
  const t = Date.parse(`${day}T00:00:00Z`);
  return Number.isFinite(t) ? new Date(t) : new Date();
}
