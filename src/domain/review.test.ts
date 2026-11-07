import { describe, expect, it, vi } from 'vitest';
import { SESSION_SIZE, selectForReview } from './review';
import type { ProgressMap } from './scheduler';
import { mulberry32 } from '../test-utils';

const NOW = 1_000_000;
const ids = (prefix: string, n: number) => Array.from({ length: n }, (_, i) => `${prefix}${i}`);
const entry = (nextReview: number) => ({
  box: 2 as const,
  correct: 1,
  wrong: 0,
  lastReview: 0,
  nextReview,
});

function build(due: number, fresh: number, rest: number) {
  const dueIds = ids('d', due);
  const freshIds = ids('n', fresh);
  const restIds = ids('r', rest);
  const progress: ProgressMap = {};
  for (const k of dueIds) progress[k] = entry(NOW - 1);
  for (const k of restIds) progress[k] = entry(NOW + 1);
  return { items: [...restIds, ...freshIds, ...dueIds], progress };
}

function run(due: number, fresh: number, rest: number, limit = SESSION_SIZE, seed = 7) {
  const { items, progress } = build(due, fresh, rest);
  const out = selectForReview(items, {
    keyOf: (x) => x,
    progress,
    now: NOW,
    rng: mulberry32(seed),
    limit,
  });
  const count = (p: string) => out.filter((k) => k.startsWith(p)).length;
  return { out, items, progress, d: count('d'), n: count('n'), r: count('r') };
}

describe('selectForReview', () => {
  it('SESSION_SIZE is 20', () => {
    expect(SESSION_SIZE).toBe(20);
  });

  it('handles 0 and 1 items', () => {
    const opts = { keyOf: (x: string) => x, progress: {}, now: NOW, rng: mulberry32(7), limit: 20 };
    expect(selectForReview([], opts)).toEqual([]);
    expect(selectForReview(['a1'], opts)).toEqual(['a1']);
  });

  it('returns all items in order without consuming rng when items <= limit', () => {
    const items = ids('a', 20);
    const rng = vi.fn(() => 0.5);
    const out = selectForReview(items, {
      keyOf: (x) => x,
      progress: {},
      now: NOW,
      rng,
      limit: 20,
    });
    expect(out).toEqual(items);
    expect(rng).not.toHaveBeenCalled();
  });

  it('50 all-new items: 20 distinct from the input', () => {
    const { out, items } = run(0, 50, 0);
    expect(out).toHaveLength(20);
    expect(new Set(out).size).toBe(20);
    for (const k of out) expect(items).toContain(k);
  });

  it('respects quotas 10/6/4', () => {
    const { out, d, n, r } = run(30, 10, 10);
    expect(out).toHaveLength(20);
    expect([d, n, r]).toEqual([10, 6, 4]);
  });

  it('redistributes leftover quota to new first', () => {
    const { out, d, n, r } = run(3, 40, 7);
    expect(out).toHaveLength(20);
    expect([d, n, r]).toEqual([3, 13, 4]);
  });

  it('due items get their quota even with many rest items', () => {
    const { out, d, r } = run(25, 0, 30);
    expect(out).toHaveLength(20);
    expect(d).toBe(10 + 6); // quota + fresh leftover goes to due first
    expect(r).toBe(4);
  });

  it('is deterministic and never repeats', () => {
    const a = run(30, 10, 10, 20, 42);
    const b = run(30, 10, 10, 20, 42);
    expect(a.out).toEqual(b.out);
    expect(new Set(a.out).size).toBe(a.out.length);
  });

  it('limit smaller than rounded quotas returns distinct items', () => {
    const { out } = run(4, 3, 3, 4);
    expect(out).toHaveLength(4);
    expect(new Set(out).size).toBe(4);
  });
});
