import { describe, expect, it } from 'vitest';
import { mapSleepDayToSignals, pickLatestUsableDay } from '../mapping';

describe('mapSleepDayToSignals', () => {
  it('maps duration + score to sleep with quality=great when score≥80', () => {
    const out = mapSleepDayToSignals({
      day: '2026-04-25',
      score: 88,
      sleepDurationSeconds: 27000, // 7.5h
      heartRate: 56.4,
    });
    expect(out.sleep).toEqual({ lastNightHours: 7.5, quality: 'great' });
    expect(out.recovery).toEqual({ restingHr: 56 });
  });

  it('maps score 60–79 → ok and <60 → poor', () => {
    const a = mapSleepDayToSignals({ day: 'x', score: 65, sleepDurationSeconds: 21600 });
    const b = mapSleepDayToSignals({ day: 'x', score: 40, sleepDurationSeconds: 21600 });
    expect(a.sleep?.quality).toBe('ok');
    expect(b.sleep?.quality).toBe('poor');
  });

  it('omits quality when score is missing', () => {
    const out = mapSleepDayToSignals({
      day: 'x',
      sleepDurationSeconds: 25200,
    });
    expect(out.sleep).toEqual({ lastNightHours: 7 });
    expect(out.recovery).toBeUndefined();
  });

  it('returns empty when duration is missing or zero', () => {
    expect(mapSleepDayToSignals({ day: 'x', score: 80 })).toEqual({});
    expect(mapSleepDayToSignals({ day: 'x', score: 80, sleepDurationSeconds: 0 })).toEqual({});
  });

  it('omits recovery when heart rate is missing or zero', () => {
    const out = mapSleepDayToSignals({
      day: 'x',
      score: 80,
      sleepDurationSeconds: 25200,
      heartRate: 0,
    });
    expect(out.recovery).toBeUndefined();
  });
});

describe('pickLatestUsableDay', () => {
  it('returns the most recent day with score + duration', () => {
    const days = [
      { day: '2026-04-23', score: 70, sleepDurationSeconds: 25000 },
      { day: '2026-04-24', score: 75, sleepDurationSeconds: 26000 },
      { day: '2026-04-25', score: 80, sleepDurationSeconds: 27000 },
    ];
    expect(pickLatestUsableDay(days)?.day).toBe('2026-04-25');
  });

  it('skips trailing incomplete days', () => {
    const days = [
      { day: '2026-04-24', score: 75, sleepDurationSeconds: 26000 },
      { day: '2026-04-25' }, // no score, no duration
    ];
    expect(pickLatestUsableDay(days)?.day).toBe('2026-04-24');
  });

  it('returns null on empty', () => {
    expect(pickLatestUsableDay([])).toBeNull();
  });
});
