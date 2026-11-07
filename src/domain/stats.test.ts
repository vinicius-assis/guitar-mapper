import { describe, expect, it } from 'vitest';
import {
  addSessionToStats,
  averageResponseMs,
  currentStreak,
  dayKey,
  daysStudiedThisWeek,
  type StatsMap,
} from './stats';

const day = { sessions: 1, answered: 1, correct: 1, ms: 1000 };
const studied = (...keys: string[]): StatsMap => Object.fromEntries(keys.map((k) => [k, { ...day }]));

describe('dayKey', () => {
  it('uses the local date', () => {
    expect(dayKey(new Date(2026, 10, 7, 23, 59))).toBe('2026-11-07');
    expect(dayKey(new Date(2026, 0, 1, 0, 0))).toBe('2026-01-01');
  });
});

describe('addSessionToStats', () => {
  const now = new Date(2026, 10, 7, 12);
  const results = [
    { correct: true, ms: 1000 },
    { correct: true, ms: 2000 },
    { correct: false, ms: 3000 },
  ];

  it('returns the same object when there are no results', () => {
    const stats = {};
    expect(addSessionToStats(stats, [], now)).toBe(stats);
  });

  it('creates and accumulates the day entry', () => {
    const first = addSessionToStats({}, results, now);
    expect(first).toEqual({ '2026-11-07': { sessions: 1, answered: 3, correct: 2, ms: 6000 } });
    const second = addSessionToStats(first, results, now);
    expect(second['2026-11-07'].sessions).toBe(2);
    expect(second['2026-11-07'].answered).toBe(6);
  });

  it('drops keys older than 400 days and keeps newer ones', () => {
    const out = addSessionToStats(studied('2025-01-01', '2025-10-10'), results, now);
    expect(out['2025-01-01']).toBeUndefined();
    expect(out['2025-10-10']).toBeDefined();
  });
});

describe('currentStreak', () => {
  const today = new Date(2026, 10, 7, 9);
  it('is 0 when empty', () => expect(currentStreak({}, today)).toBe(0));
  it('counts days ending today', () => {
    expect(currentStreak(studied('2026-11-05', '2026-11-06', '2026-11-07'), today)).toBe(3);
  });
  it('does not reset before today ends', () => {
    expect(currentStreak(studied('2026-11-05', '2026-11-06'), today)).toBe(2);
  });
  it('stops at a gap', () => {
    expect(currentStreak(studied('2026-11-04', '2026-11-06'), today)).toBe(1);
  });
  it('is 0 when yesterday was not studied and today neither', () => {
    expect(currentStreak(studied('2026-11-05'), today)).toBe(0);
  });
  it('crosses month and year boundaries', () => {
    expect(currentStreak(studied('2026-12-30', '2026-12-31', '2027-01-01'), new Date(2027, 0, 1, 10))).toBe(3);
  });
  it('is unaffected by DST changes', () => {
    expect(currentStreak(studied('2026-10-17', '2026-10-18', '2026-10-19'), new Date(2026, 9, 19, 0, 30))).toBe(3);
    expect(currentStreak(studied('2026-03-07', '2026-03-08', '2026-03-09'), new Date(2026, 2, 9, 0, 30))).toBe(3);
    expect(currentStreak(studied('2026-11-01', '2026-11-02', '2026-11-03'), new Date(2026, 10, 3, 23, 30))).toBe(3);
  });
});

describe('daysStudiedThisWeek', () => {
  it('counts Monday to Sunday only', () => {
    const stats = studied('2026-11-01', '2026-11-02', '2026-11-04');
    expect(daysStudiedThisWeek(stats, new Date(2026, 10, 4, 12))).toBe(2);
  });
  it('treats Sunday as the last day of the week', () => {
    const stats = studied('2026-11-02', '2026-11-05', '2026-11-08');
    expect(daysStudiedThisWeek(stats, new Date(2026, 10, 8, 12))).toBe(3);
  });
  it('ignores entries with zero sessions', () => {
    const stats: StatsMap = { '2026-11-03': { sessions: 0, answered: 0, correct: 0, ms: 0 } };
    expect(daysStudiedThisWeek(stats, new Date(2026, 10, 4))).toBe(0);
  });
});

describe('averageResponseMs', () => {
  const today = new Date(2026, 10, 7, 12);
  it('is null without data', () => expect(averageResponseMs({}, today)).toBeNull());
  it('averages the 7 days ending today', () => {
    const stats: StatsMap = {
      '2026-11-07': { sessions: 1, answered: 2, correct: 2, ms: 3000 },
      '2026-11-01': { sessions: 1, answered: 2, correct: 2, ms: 5000 },
    };
    expect(averageResponseMs(stats, today)).toBe(2000);
  });
  it('excludes day 7 days ago', () => {
    const stats: StatsMap = {
      '2026-11-07': { sessions: 1, answered: 2, correct: 2, ms: 3000 },
      '2026-10-31': { sessions: 1, answered: 2, correct: 2, ms: 99000 },
    };
    expect(averageResponseMs(stats, today)).toBe(1500);
  });
});
