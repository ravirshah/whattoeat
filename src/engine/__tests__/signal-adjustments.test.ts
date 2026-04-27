import { describe, expect, test } from 'vitest';
import { describeSignalAdjustments } from '../signal-adjustments';

describe('describeSignalAdjustments', () => {
  test('returns [] when no signals provided', () => {
    expect(describeSignalAdjustments(undefined)).toEqual([]);
    expect(describeSignalAdjustments({})).toEqual([]);
  });

  test('poor sleep quality emits anti-inflammatory + quick-prep adjustments', () => {
    const out = describeSignalAdjustments({
      sleep: { lastNightHours: 4.5, quality: 'poor' },
    });
    const ids = out.map((a) => a.id);
    expect(ids).toContain('sleep-poor-anti-inflammatory');
    expect(ids).toContain('sleep-poor-quick-prep');
  });

  test('short sleep without quality label still triggers poor-sleep rules', () => {
    const out = describeSignalAdjustments({
      sleep: { lastNightHours: 4.8 },
    });
    expect(out.some((a) => a.id === 'sleep-poor-anti-inflammatory')).toBe(true);
  });

  test('great sleep emits performance-angle adjustment', () => {
    const out = describeSignalAdjustments({
      sleep: { lastNightHours: 8.1, quality: 'great' },
    });
    expect(out.some((a) => a.id === 'sleep-great-performance')).toBe(true);
  });

  test('elevated resting HR adds recovery adjustment', () => {
    const out = describeSignalAdjustments({
      sleep: { lastNightHours: 7, quality: 'ok' },
      recovery: { restingHr: 70 },
    });
    expect(out.some((a) => a.id === 'rhr-elevated')).toBe(true);
  });

  test('hard training yesterday flips protein adjustment', () => {
    const out = describeSignalAdjustments({
      training: { yesterdayLoad: 'hard' },
    });
    expect(out.some((a) => a.id === 'training-hard')).toBe(true);
  });
});
