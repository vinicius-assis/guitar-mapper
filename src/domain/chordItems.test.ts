import { describe, it, expect } from 'vitest';
import { CHORD_SHAPES, chordFamily } from './chords';
import {
  CHORD_KIND_SETTINGS,
  CHORD_SHAPE_SETTINGS,
  buildChordNameQueue,
  buildChordPlayQueue,
  chordNameKey,
  chordPlayKey,
  chordPool,
  isChordNameKey,
  isChordPlayKey,
} from './chordItems';

function mulberry(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('chordPool', () => {
  it.each([
    ['open', 'triads', 8],
    ['open', 'sevenths', 11],
    ['open', 'both', 19],
    ['barre', 'triads', 48],
    ['barre', 'sevenths', 72],
    ['barre', 'both', 120],
    ['all', 'triads', 56],
    ['all', 'sevenths', 83],
    ['all', 'both', 139],
  ] as const)('%s / %s has %i items', (shapes, kinds, size) => {
    expect(chordPool(shapes, kinds)).toHaveLength(size);
  });

  it('is ordered', () => {
    expect(chordPool('open', 'triads')[0]).toEqual({ shape: 'c', root: 0 });
    expect(chordPool('barre', 'triads')[0]).toEqual({ shape: 'e-maj', root: 0 });
    expect(chordPool('barre', 'triads')[12]).toEqual({ shape: 'e-min', root: 0 });
  });
});

describe('keys', () => {
  it('builds the keys', () => {
    expect(chordNameKey({ shape: 'am7', root: 9 })).toBe('chordname:am7:9');
    expect(chordPlayKey({ shape: 'a-m7b5', root: 11 })).toBe('chordplay:a-m7b5:11');
  });

  it.each(['chordname:c:0', 'chordname:bm7b5:11'])('name validator accepts %s', (k) => {
    expect(isChordNameKey(k)).toBe(true);
  });
  it.each(['chordplay:e-maj:0', 'chordplay:a-maj7:10'])('play validator accepts %s', (k) => {
    expect(isChordPlayKey(k)).toBe(true);
  });
  it.each([
    'chordname:c:2',
    'chordname:e-maj:12',
    'chordname:e-maj:01',
    'chordname:f:5',
    'chordplay:E-maj:0',
    'chordname:c',
    'chord:c:0',
    'chordplay:am:9:1',
  ])('rejects %s', (k) => {
    expect(isChordNameKey(k) || isChordPlayKey(k)).toBe(false);
  });

  it('every pool key is valid and unique', () => {
    for (const s of CHORD_SHAPE_SETTINGS) {
      for (const k of CHORD_KIND_SETTINGS) {
        const pool = chordPool(s, k);
        const names = pool.map(chordNameKey);
        const plays = pool.map(chordPlayKey);
        expect(names.every(isChordNameKey)).toBe(true);
        expect(plays.every(isChordPlayKey)).toBe(true);
        expect(new Set(names).size).toBe(pool.length);
        expect(new Set(plays).size).toBe(pool.length);
      }
    }
  });
});

describe('queues', () => {
  const rngs: [string, () => number][] = [
    ['seeded', mulberry(42)],
    ['zero', () => 0],
    ['max', () => 0.999],
  ];

  it.each(rngs)('name queue (%s) keeps the items and builds valid options', (_n, rng) => {
    const pool = chordPool('all', 'both');
    const queue = buildChordNameQueue(pool, rng);
    expect(queue.map(chordNameKey).sort()).toEqual(pool.map(chordNameKey).sort());
    for (const q of queue) {
      const quality = CHORD_SHAPES[q.shape].quality;
      expect(q.options).toHaveLength(4);
      expect(new Set(q.options.map((o) => `${o.root}:${o.quality}`)).size).toBe(4);
      expect(q.options.filter((o) => o.root === q.root && o.quality === quality)).toHaveLength(1);
      expect(q.options.every((o) => chordFamily(quality).includes(o.quality))).toBe(true);
      expect(q.options.some((o) => o.root === q.root && o.quality !== quality)).toBe(true);
      expect(q.options.some((o) => o.root !== q.root && o.quality === quality)).toBe(true);
    }
  });

  it('play queue is a permutation', () => {
    const pool = chordPool('open', 'both');
    const q = buildChordPlayQueue(pool, Math.random);
    expect(q.map(chordPlayKey).sort()).toEqual(pool.map(chordPlayKey).sort());
  });
});
