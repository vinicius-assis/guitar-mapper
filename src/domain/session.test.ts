import { describe, it, expect } from 'vitest';
import { mulberry32 } from '../test-utils';
import { positionKey } from './fretboard';
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
