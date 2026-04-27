'use server';

import {
  type EightSleepCredentials,
  EightSleepMetadata,
  IntegrationProvider,
  type IntegrationSummary,
} from '@/contracts/zod/integrations';
import { type Adjustment, describeSignalAdjustments } from '@/engine/signal-adjustments';
import { EightSleepClient, EightSleepError } from '@/server/adapters/eight-sleep/client';
import { requireUser } from '@/server/auth';
import { type ActionResult, ServerError } from '@/server/contracts';
import { z } from 'zod';
import { sealCredentials } from './credentials';
import { deleteIntegration, listIntegrationsByUser, upsertIntegration } from './repo';
import { getLatestSnapshot, runProviderSync } from './sync';

const ConnectEightSleepInput = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password is required'),
});

/**
 * Authenticate against Eight Sleep with the user-supplied credentials, then
 * persist the encrypted credential blob so the daily sync can re-auth without
 * re-prompting. Returns a sanitised IntegrationSummary (never the credentials).
 */
export async function connectEightSleep(
  rawInput: unknown,
): Promise<ActionResult<IntegrationSummary>> {
  try {
    const { userId } = await requireUser();
    const input = ConnectEightSleepInput.parse(rawInput);

    const client = new EightSleepClient();
    let auth: Awaited<ReturnType<typeof client.authenticate>>;
    try {
      auth = await client.authenticate(input.email, input.password);
    } catch (e) {
      if (e instanceof EightSleepError) {
        const code =
          e.code === 'auth' ? 'forbidden' : e.code === 'rate_limited' ? 'rate_limited' : 'internal';
        throw new ServerError(code, mapEightSleepErrorMessage(e), e);
      }
      throw e;
    }

    // /users/me confirms the credentials and yields the canonical providerUserId.
    let me: Awaited<ReturnType<typeof client.getMe>>;
    try {
      me = await client.getMe(auth.access_token);
    } catch (e) {
      if (e instanceof EightSleepError) {
        throw new ServerError('internal', mapEightSleepErrorMessage(e), e);
      }
      throw e;
    }

    const providerUserId = auth.userId ?? me.userId;
    const creds: EightSleepCredentials = {
      email: input.email,
      password: input.password,
      access_token: auth.access_token,
      expires_at: auth.expires_at,
    };
    const metadata = EightSleepMetadata.parse({
      providerUserId,
      email: input.email,
    });

    const summary = await upsertIntegration({
      user_id: userId,
      provider: 'eight_sleep',
      credentials: sealCredentials(creds),
      metadata,
    });
    return { ok: true, value: summary };
  } catch (err) {
    if (err instanceof ServerError) return { ok: false, error: err };
    if (err instanceof z.ZodError) {
      return {
        ok: false,
        error: new ServerError('validation_failed', err.errors[0]?.message ?? 'Invalid input', err),
      };
    }
    return {
      ok: false,
      error: new ServerError(
        'internal',
        err instanceof Error ? err.message : 'Failed to connect Eight Sleep',
        err,
      ),
    };
  }
}

const DisconnectInput = z.object({ provider: IntegrationProvider });

export async function disconnectIntegration(rawInput: unknown): Promise<ActionResult<void>> {
  try {
    const { userId } = await requireUser();
    const { provider } = DisconnectInput.parse(rawInput);
    await deleteIntegration(userId, provider);
    return { ok: true, value: undefined };
  } catch (err) {
    if (err instanceof ServerError) return { ok: false, error: err };
    if (err instanceof z.ZodError) {
      return {
        ok: false,
        error: new ServerError('validation_failed', 'Invalid provider', err),
      };
    }
    return {
      ok: false,
      error: new ServerError(
        'internal',
        err instanceof Error ? err.message : 'Failed to disconnect',
        err,
      ),
    };
  }
}

const ProviderInput = z.object({ provider: IntegrationProvider });

export interface ProviderDebug {
  observed_at: string;
  created_at: string;
  raw: unknown;
  mapped: Partial<import('@/contracts/zod').HealthSignals>;
  adjustments: Adjustment[];
}

/**
 * Returns the latest stored snapshot for (current user, provider) along with
 * its mapped HealthSignals and the deterministic adjustments those signals
 * will apply when Feed Me runs. Lets the user preview "what is the engine
 * actually going to do with my Eight Sleep data?" before spending an LLM call.
 */
export async function getProviderDebug(
  rawInput: unknown,
): Promise<ActionResult<ProviderDebug | null>> {
  try {
    const { userId } = await requireUser();
    const { provider } = ProviderInput.parse(rawInput);
    const latest = await getLatestSnapshot(userId, provider);
    if (!latest) return { ok: true, value: null };
    const adjustments = describeSignalAdjustments(
      latest.mapped as import('@/contracts/zod').HealthSignals,
    );
    return { ok: true, value: { ...latest, adjustments } };
  } catch (err) {
    if (err instanceof ServerError) return { ok: false, error: err };
    if (err instanceof z.ZodError) {
      return {
        ok: false,
        error: new ServerError('validation_failed', 'Invalid provider', err),
      };
    }
    return {
      ok: false,
      error: new ServerError(
        'internal',
        err instanceof Error ? err.message : 'Failed to load debug',
        err,
      ),
    };
  }
}

/**
 * Trigger an on-demand sync for the given provider. Useful when the user
 * wants to refresh the debug view without waiting for the daily cron.
 */
export async function syncProviderNow(rawInput: unknown): Promise<ActionResult<void>> {
  try {
    const { userId } = await requireUser();
    const { provider } = ProviderInput.parse(rawInput);
    const today = new Date();
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const result = await runProviderSync(userId, provider, {
      from: yesterday.toISOString().slice(0, 10),
      to: today.toISOString().slice(0, 10),
    });
    if (!result.ok) {
      return {
        ok: false,
        error: new ServerError('internal', result.error ?? 'Sync failed'),
      };
    }
    return { ok: true, value: undefined };
  } catch (err) {
    if (err instanceof ServerError) return { ok: false, error: err };
    if (err instanceof z.ZodError) {
      return {
        ok: false,
        error: new ServerError('validation_failed', 'Invalid provider', err),
      };
    }
    return {
      ok: false,
      error: new ServerError(
        'internal',
        err instanceof Error ? err.message : 'Failed to sync',
        err,
      ),
    };
  }
}

export async function listMyIntegrations(): Promise<ActionResult<IntegrationSummary[]>> {
  try {
    const { userId } = await requireUser();
    const rows = await listIntegrationsByUser(userId);
    return { ok: true, value: rows };
  } catch (err) {
    if (err instanceof ServerError) return { ok: false, error: err };
    return {
      ok: false,
      error: new ServerError(
        'internal',
        err instanceof Error ? err.message : 'Failed to list integrations',
        err,
      ),
    };
  }
}

function mapEightSleepErrorMessage(e: EightSleepError): string {
  switch (e.code) {
    case 'auth':
      return 'Eight Sleep rejected those credentials. Double-check email + password.';
    case 'rate_limited':
      return 'Eight Sleep rate limited the connection attempt. Wait a minute and try again.';
    case 'unauthorized':
      return 'Eight Sleep token was rejected.';
    case 'parse':
      return 'Eight Sleep returned an unexpected response.';
    default:
      return e.message;
  }
}
