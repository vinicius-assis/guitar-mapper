import { describe, it, expect } from 'vitest';
import { sequence, mulberry32 } from '../test-utils';
import type { Position } from './fretboard';
import {
  BOX_INTERVALS_MS,
  applyAnswer,
  masteryOf,
  pickNext,
  type ProgressMap,
  type PositionProgress,
} from './scheduler';

const NOW = 1_000_000;
const pos = (string: number, fret: number): Position => ({ string, fret });
const progress = (over: Partial<PositionProgress>): PositionProgress => ({
  box: 1,
  correct: 0,
  wrong: 0,
  lastReview: 0,
  nextReview: 0,
  ...over,
});

describe('applyAnswer', () => {
  it('moves an unseen position to box 2 on a correct answer', () => {
    const next = applyAnswer(undefined, true, NOW);
    expect(next).toEqual({
      box: 2,
      correct: 1,
      wrong: 0,
      lastReview: NOW,
      nextReview: NOW + BOX_INTERVALS_MS[2],
    });
  });

  it('keeps an unseen position in box 1 on a wrong answer and makes it due now', () => {
    const next = applyAnswer(undefined, false, NOW);
    expect(next.box).toBe(1);
    expect(next.wrong).toBe(1);
    expect(next.nextReview).toBe(NOW);
  });

  it('caps at box 5', () => {
    expect(applyAnswer(progress({ box: 5 }), true, NOW).box).toBe(5);
  });

  it('drops back to box 1 on a wrong answer and accumulates counters', () => {
    const next = applyAnswer(progress({ box: 4, correct: 3, wrong: 1 }), false, NOW);
    expect(next.box).toBe(1);
    expect(next.correct).toBe(3);
    expect(next.wrong).toBe(2);
  });
});

describe('masteryOf', () => {
  it('maps boxes to mastery levels', () => {
    expect(masteryOf(undefined)).toBe('unseen');
    expect(masteryOf(progress({ box: 1 }))).toBe('wrong');
    expect(masteryOf(progress({ box: 2 }))).toBe('learning');
    expect(masteryOf(progress({ box: 3 }))).toBe('learning');
    expect(masteryOf(progress({ box: 4 }))).toBe('mastered');
    expect(masteryOf(progress({ box: 5 }))).toBe('mastered');
  });
});

describe('pickNext', () => {
  const due = pos(1, 0);
  const fresh = pos(1, 1);
  const rest = pos(1, 2);
  const candidates = [due, fresh, rest];
  const map: ProgressMap = {
    '1-0': progress({ box: 1, nextReview: NOW - 1 }),
    '1-2': progress({ box: 4, nextReview: NOW + 1_000_000 }),
  };

  it('throws when there are no candidates', () => {
    expect(() => pickNext([], {}, NOW, Math.random)).toThrow();
  });

  it('returns the only candidate even if it should be avoided', () => {
    expect(pickNext([due], map, NOW, Math.random, '1-0')).toBe(due);
  });

  it('never returns the avoided key when there is another candidate', () => {
    const rng = mulberry32(42);
    for (let i = 0; i < 200; i++) {
      expect(pickNext([due, fresh], map, NOW, rng, '1-0')).toBe(fresh);
    }
  });

  it('picks from due / new / rest buckets by weight 0.5 / 0.3 / 0.2', () => {
    expect(pickNext(candidates, map, NOW, sequence(0, 0))).toBe(due);
    expect(pickNext(candidates, map, NOW, sequence(0.6, 0))).toBe(fresh);
    expect(pickNext(candidates, map, NOW, sequence(0.9, 0))).toBe(rest);
  });

  it('works when only one bucket has items', () => {
    expect(pickNext([fresh], {}, NOW, sequence(0.99, 0.99))).toBe(fresh);
  });
});
