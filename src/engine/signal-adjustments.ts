/**
 * Pure description of how a HealthSignals payload nudges recipe selection.
 *
 * Mirrors the rules in src/engine/prompt.ts so the UI can preview how a
 * given signal set will tilt recommendations *before* a Feed Me run is
 * spent. Keep this in lock-step with the prompt's "ENERGY-STATE" and
 * sleep/recovery rules — when the prompt grows a new signal-aware rule,
 * add the matching Adjustment here.
 *
 * No imports from outside `src/engine` or `src/contracts/zod`.
 */

import type { HealthSignals } from '@/contracts/zod';

export type AdjustmentSeverity = 'tilt' | 'prefer' | 'inform';

export interface Adjustment {
  /** Stable id; useful for tests + UI keys. */
  id: string;
  /** Headline — one short sentence the user can read. */
  title: string;
  /** Concrete change the engine will apply. */
  effect: string;
  /** Stronger signals get higher severity for UI emphasis. */
  severity: AdjustmentSeverity;
}

const SLEEP_HOURS_LOW = 5.5;
const SLEEP_HOURS_GOOD = 7.5;
const RHR_ELEVATED_BPM = 65;

/**
 * Translate a HealthSignals payload into the deterministic adjustments that
 * the prompt will apply. Returns [] when no signals are present.
 */
export function describeSignalAdjustments(signals: HealthSignals | undefined): Adjustment[] {
  if (!signals) return [];
  const out: Adjustment[] = [];

  const sleep = signals.sleep;
  if (sleep) {
    if (sleep.quality === 'poor' || sleep.lastNightHours < SLEEP_HOURS_LOW) {
      out.push({
        id: 'sleep-poor-anti-inflammatory',
        title: 'Poor sleep — anti-inflammatory ingredients',
        effect:
          'Recipes will prioritize turmeric, ginger, omega-3 sources, and leafy greens; rationale will mention recovery.',
        severity: 'tilt',
      });
      out.push({
        id: 'sleep-poor-quick-prep',
        title: 'Low energy from short sleep — fast prep',
        effect: 'Prep ≤15 min, soft textures, easily digestible foods preferred.',
        severity: 'prefer',
      });
    } else if (sleep.quality === 'great' && sleep.lastNightHours >= SLEEP_HOURS_GOOD) {
      out.push({
        id: 'sleep-great-performance',
        title: 'Well-rested — performance angle',
        effect: 'Engine can surface complex prep and training-fuel framing in rationales.',
        severity: 'inform',
      });
    } else {
      out.push({
        id: 'sleep-ok',
        title: 'Sleep neutral',
        effect: 'No sleep-driven nudges; standard goal-aligned recommendations.',
        severity: 'inform',
      });
    }
  }

  const recovery = signals.recovery;
  if (recovery?.restingHr !== undefined && recovery.restingHr >= RHR_ELEVATED_BPM) {
    out.push({
      id: 'rhr-elevated',
      title: `Resting HR elevated (${recovery.restingHr} bpm)`,
      effect: 'Recovery context may be cited; lighter, hydration-friendly meals will rank higher.',
      severity: 'prefer',
    });
  }

  const training = signals.training;
  if (training?.yesterdayLoad === 'hard') {
    out.push({
      id: 'training-hard',
      title: 'Hard training yesterday',
      effect:
        'Per-meal protein floor raised; refined carbs and fat reduced before protein on a cut.',
      severity: 'tilt',
    });
  }

  return out;
}
