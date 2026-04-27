/**
 * buildContext — assembles a RecommendationContext from live data sources.
 *
 * Reads from:
 *   - src/server/pantry/repo   (T5)
 *   - src/server/profile       (T6)
 *   - src/server/checkin       (T7)
 *   - src/server/recipes       (T9 — getRecentCookTitles)
 *
 * Returns a discriminated-union result: { ok: true; value: BuildContextValue }
 * or { ok: false; error: BuildContextError }.
 *
 * NO Next.js imports. All I/O is performed through the passed deps/helpers.
 */

import type { PantryItem } from '@/contracts/zod/pantry';
import type { Profile } from '@/contracts/zod/profile';
import type { RecommendationContext } from '@/contracts/zod/recommendation';
import type { HealthSignals } from '@/contracts/zod/signals';
import type { SupabaseClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Error type local to this module
// ---------------------------------------------------------------------------

export interface BuildContextError {
  /** Machine-readable code for EmptyState variant selection. */
  code: 'PROFILE_INCOMPLETE' | 'DATA_FETCH_FAILED';
  message: string;
}

export interface BuildContextValue {
  ctx: RecommendationContext;
  /** Titles of recently cooked meals — passed to engine as recentCookTitles dep. */
  recentCookTitles: string[];
}

export type BuildContextResult =
  | { ok: true; value: BuildContextValue }
  | { ok: false; error: BuildContextError };

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export interface BuildContextOptions {
  /**
   * Number of meal candidates to request from the engine.
   * Defaults to 3 (the spec-mandated maximum surface).
   */
  candidateCount?: number;
  /**
   * Client local date string (YYYY-MM-DD) passed to getTodayCheckin() to avoid
   * UTC offset mismatches. If omitted, getTodayCheckin falls back to UTC date.
   */
  localDate?: string;
}

// ---------------------------------------------------------------------------
// Injected dependency interfaces (for testability)
// ---------------------------------------------------------------------------

export interface BuildContextDeps {
  getProfile: () => Promise<Profile | null>;
  getPantry: (supabase: SupabaseClient, userId: string) => Promise<PantryItem[]>;
  getCheckin: (localDate?: string) => Promise<unknown>;
  getCookTitles: (since: string) => Promise<string[]>;
  getSignals?: (userId: string) => Promise<Partial<HealthSignals>>;
}

// ---------------------------------------------------------------------------
// Assembler
// ---------------------------------------------------------------------------

const RECENCY_WINDOW_DAYS = 7;

export async function buildContext(
  supabase: SupabaseClient,
  userId: string,
  opts: BuildContextOptions = {},
  _deps?: Partial<BuildContextDeps>,
): Promise<BuildContextResult> {
  const candidateCount = opts.candidateCount ?? 3;

  try {
    // Resolve all deps — use injected versions when provided (for tests).
    const { getMyProfile } = await import('@/server/profile/actions');
    const { listForUser } = await import('@/server/pantry/repo');
    const { getTodayCheckin } = await import('@/server/checkin/actions');
    const { getRecentCookTitles } = await import('@/server/recipes/actions');
    const { getSignalsForUser } = await import('@/server/integrations/sync');

    const getProfile = _deps?.getProfile ?? (() => getMyProfile());
    const getPantry = _deps?.getPantry ?? ((s, uid) => listForUser(s, uid));
    const getCheckin = _deps?.getCheckin ?? ((date?: string) => getTodayCheckin(date));
    const getCookTitles = _deps?.getCookTitles ?? ((since: string) => getRecentCookTitles(since));
    const getSignals =
      _deps?.getSignals ??
      ((uid: string) =>
        getSignalsForUser(uid, {
          from: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
          to: new Date().toISOString().slice(0, 10),
        }));

    // Fetch all data sources in parallel for minimum latency.
    // Signals are best-effort: we swallow errors so a downed integration never
    // blocks a recommendation.
    const since = new Date(Date.now() - RECENCY_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const [profile, pantryAll, checkinRaw, recentCookTitles, signals] = await Promise.all([
      getProfile(),
      getPantry(supabase, userId),
      getCheckin(opts.localDate),
      getCookTitles(since),
      getSignals(userId).catch(() => ({}) as Partial<HealthSignals>),
    ]);

    // Profile is mandatory — without it the engine cannot produce safe output.
    if (!profile) {
      return {
        ok: false,
        error: {
          code: 'PROFILE_INCOMPLETE',
          message:
            'Your profile is incomplete. Please fill in your goals, weight, and height before using Feed Me.',
        },
      };
    }

    // Targets may be null if biometric fields are missing.
    if (!profile.targets) {
      return {
        ok: false,
        error: {
          code: 'PROFILE_INCOMPLETE',
          message:
            'Your macro targets could not be calculated. Please complete your height, weight, and birthdate in Profile.',
        },
      };
    }

    // Only forward pantry items that are currently available.
    const pantry = pantryAll.filter((p) => p.available);

    const ctx: RecommendationContext = {
      profile,
      pantry,
      // checkin is optional in the contract; forward null as undefined
      checkin: (checkinRaw as RecommendationContext['checkin']) ?? undefined,
      // signals is optional; only include when at least one provider returned data
      ...(signals && Object.keys(signals).length > 0
        ? { signals: signals as RecommendationContext['signals'] }
        : {}),
      request: {
        mealType: 'any',
        candidateCount,
      },
    };

    return { ok: true, value: { ctx, recentCookTitles } };
  } catch (err) {
    return {
      ok: false,
      error: {
        code: 'DATA_FETCH_FAILED',
        message:
          err instanceof Error
            ? `Context assembly failed: ${err.message}`
            : 'An unexpected error occurred while preparing your recommendations.',
      },
    };
  }
}
