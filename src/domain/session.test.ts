import { describe, it, expect } from 'vitest';
import { mulberry32 } from '../test-utils';
import { noteAt, positionKey, positionsInFilter } from './fretboard';
import { pitchOf } from './pitch';
import {
  HISTORY_LIMIT,
  addToHistory,
  buildQueue,
  makeHistoryEntry,
  summarize,
  type HistoryEntry,
} from './session';

const POSITIONS = [1, 2, 3, 4, 5].map((fret) => ({ string: 6, fret }));

describe('buildQueue', () => {
  it('contains every position exactly once', () => {
    const queue = buildQueue(POSITIONS, mulberry32(1));
    expect(queue.map(positionKey).sort()).toEqual(POSITIONS.map(positionKey).sort());
  });

  it('is shuffled: different seeds give different orders', () => {
    const orders = new Set(
      [1, 2, 3, 4, 5, 6].map((seed) => buildQueue(POSITIONS, mulberry32(seed)).map(positionKey).join()),
    );
    expect(orders.size).toBeGreaterThan(1);
  });

  it('does not change the input array', () => {
    const copy = [...POSITIONS];
    buildQueue(POSITIONS, mulberry32(3));
    expect(POSITIONS).toEqual(copy);
  });

  it('puts the forced position first, once, even when outside the list', () => {
    const inside = buildQueue(POSITIONS, mulberry32(2), { string: 6, fret: 3 });
    expect(inside[0]).toEqual({ string: 6, fret: 3 });
    expect(inside).toHaveLength(5);
    const outside = buildQueue(POSITIONS, mulberry32(2), { string: 1, fret: 20 });
    expect(outside[0]).toEqual({ string: 1, fret: 20 });
    expect(outside).toHaveLength(6);
  });

  it('is empty for no positions', () => {
    expect(buildQueue([], mulberry32(1))).toEqual([]);
  });
});

describe('summarize', () => {
  it('counts hits, percentage and average time', () => {
    const s = summarize([
      { correct: true, ms: 2000 },
      { correct: false, ms: 4000 },
      { correct: true, ms: 3000 },
    ]);
    expect(s).toEqual({ total: 3, correct: 2, percent: 67, averageMs: 3000 });
  });

  it('is all zeros for an empty session', () => {
    expect(summarize([])).toEqual({ total: 0, correct: 0, percent: 0, averageMs: 0 });
  });
});

describe('history', () => {
  const entry = (at: number): HistoryEntry => ({
    mode: 'flashcard',
    at,
    total: 4,
    correct: 3,
    averageMs: 1500,
  });

  it('makeHistoryEntry stores mode, time, score and average', () => {
    expect(makeHistoryEntry('flashcard', 99, [{ correct: true, ms: 1000 }, { correct: false, ms: 2000 }])).toEqual({
      mode: 'flashcard',
      at: 99,
      total: 2,
      correct: 1,
      averageMs: 1500,
    });
  });

  it('makeHistoryEntry is null for a session with no answers', () => {
    expect(makeHistoryEntry('flashcard', 99, [])).toBeNull();
  });

  it('addToHistory puts the newest first and keeps only the last 20', () => {
    let history: HistoryEntry[] = [];
    for (let i = 1; i <= HISTORY_LIMIT + 3; i++) history = addToHistory(history, entry(i));
    expect(history).toHaveLength(HISTORY_LIMIT);
    expect(history[0].at).toBe(HISTORY_LIMIT + 3);
    expect(history[HISTORY_LIMIT - 1].at).toBe(4);
  });
});

describe('buildQueue avoidSameNote', () => {
  const positions = [
    { string: 6, fret: 12 }, // E
    { string: 6, fret: 24 }, // E
    { string: 1, fret: 12 }, // E
    { string: 1, fret: 24 }, // E
    { string: 5, fret: 3 }, // C
    { string: 4, fret: 5 }, // G
    { string: 3, fret: 2 }, // A
    { string: 2, fret: 3 }, // D
  ]; // E aparece 4 vezes em 8: ainda dá para separar todas

  it('keeps every position once and never puts the same note twice in a row when it can', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const queue = buildQueue(positions, mulberry32(seed), null, { avoidSameNote: true });
      expect(queue.map(positionKey).sort()).toEqual(positions.map(positionKey).sort());
      for (let i = 1; i < queue.length; i++) {
        expect(noteAt(queue[i])).not.toBe(noteAt(queue[i - 1]));
      }
    }
  });

  it('still returns everything when only one note is possible', () => {
    const same = [
      { string: 6, fret: 12 },
      { string: 6, fret: 24 },
      { string: 1, fret: 12 },
    ];
    expect(buildQueue(same, mulberry32(1), null, { avoidSameNote: true })).toHaveLength(3);
  });

  it('does not change the default behaviour', () => {
    const a = buildQueue(positions, mulberry32(5));
    const b = buildQueue(positions, mulberry32(5), null, { avoidSameNote: false });
    expect(a).toEqual(b);
  });
});

describe('history level', () => {
  it('stores the level only for ear sessions (default easy)', () => {
    const results = [{ correct: true, ms: 1000 }];
    expect(makeHistoryEntry('ear', 1, results, 'hard')?.level).toBe('hard');
    expect(makeHistoryEntry('ear', 1, results)?.level).toBe('easy');
    expect(makeHistoryEntry('flashcard', 1, results, 'hard')).not.toHaveProperty('level');
  });
});

describe('buildQueue uniquePitch (Ouvido)', () => {
  const focus = positionsInFilter({
    strings: [1, 2, 3, 4, 5, 6],
    fretMin: 1,
    fretMax: 12,
    naturalsOnly: false,
  }); // 72 posições, 36 sons

  it('asks each sound once: no two questions share a pitch', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const queue = buildQueue(focus, mulberry32(seed), null, { uniquePitch: true });
      expect(queue).toHaveLength(36);
      expect(new Set(queue.map(pitchOf)).size).toBe(36);
    }
  });

  it('a forced position opens the queue and its sound is not asked again', () => {
    const forced = { string: 6, fret: 12 }; // E3 também existe nas cordas 5 e 4
    const queue = buildQueue(focus, mulberry32(3), forced, { uniquePitch: true });
    expect(queue[0]).toEqual(forced);
    expect(queue).toHaveLength(36);
    expect(queue.filter((p) => pitchOf(p) === pitchOf(forced))).toHaveLength(1);
  });

  it('combines with avoidSameNote', () => {
    const queue = buildQueue(focus, mulberry32(4), null, { uniquePitch: true, avoidSameNote: true });
    for (let i = 1; i < queue.length; i++) expect(noteAt(queue[i])).not.toBe(noteAt(queue[i - 1]));
  });

  it('is off by default', () => {
    expect(buildQueue(focus, mulberry32(1))).toHaveLength(72);
  });
});
