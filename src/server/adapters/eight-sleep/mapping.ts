import type { HealthSignals } from '@/contracts/zod';
import type { EightSleepDay } from './schema';

/**
 * Map an Eight Sleep daily aggregate to our HealthSignals subset.
 * - score (0–100) → sleep.quality (≥80 great, ≥60 ok, else poor)
 * - sleepDurationSeconds → sleep.lastNightHours (rounded to 0.01h)
 * - heartRate (avg HR during sleep) → recovery.restingHr (close proxy)
 *
 * HRV is intentionally not mapped: trends.sleepQualityScore.hrv.score is a
 * normalized 0–100 quality score, not raw RMSSD ms. We can populate
 * recovery.hrvMs once we pull the per-interval timeseries.
 */
export function mapSleepDayToSignals(day: EightSleepDay): Partial<HealthSignals> {
  const out: Partial<HealthSignals> = {};

  if (typeof day.sleepDurationSeconds === 'number' && day.sleepDurationSeconds > 0) {
    const hours = day.sleepDurationSeconds / 3600;
    let quality: 'poor' | 'ok' | 'great' | undefined;
    if (typeof day.score === 'number') {
      if (day.score >= 80) quality = 'great';
      else if (day.score >= 60) quality = 'ok';
      else quality = 'poor';
    }
    out.sleep = {
      lastNightHours: Math.round(hours * 100) / 100,
      ...(quality ? { quality } : {}),
    };
  }

  if (typeof day.heartRate === 'number' && day.heartRate > 0) {
    out.recovery = { restingHr: Math.round(day.heartRate) };
  }

  return out;
}

/**
 * From a list of trend days (oldest→newest), return the most recent one that
 * has a usable sleep score. Returns null when none qualify.
 */
export function pickLatestUsableDay(days: EightSleepDay[]): EightSleepDay | null {
  for (let i = days.length - 1; i >= 0; i--) {
    const d = days[i];
    if (!d) continue;
    if (
      typeof d.sleepDurationSeconds === 'number' &&
      d.sleepDurationSeconds > 0 &&
      typeof d.score === 'number'
    ) {
      return d;
    }
  }
  return null;
}
