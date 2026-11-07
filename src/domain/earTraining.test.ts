import { describe, expect, it } from 'vitest';
import {
  EAR_DIRECTIONS,
  EAR_INTERVALS,
  EAR_RANGE,
  buildDegreeQueue,
  buildEarIntervalQueue,
  degreeKey,
  degreePool,
  degreeSequence,
  degreeTarget,
  degreeTonicMidi,
  earInterval,
  earIntervalKey,
  earIntervalPitches,
  earIntervalPool,
  earIntervalSequence,
  earRange,
  isDegreeKey,
  isEarIntervalKey,
  shuffled,
  type DegreeQuestion,
  type EarIntervalItem,
} from './earTraining';
import { BASS, GUITAR } from './instruments';
import { INTERVALS, instrumentRange } from './intervals';
import type { EarLevel } from './quiz';
import type { NoteIndex } from './notes';
import { mulberry32 } from '../test-utils';

const LEVELS: EarLevel[] = ['easy', 'medium', 'hard'];
const RNGS = [0, 0.5, 0.999];
const rngOf = (v: number) => () => v;

describe('EAR_INTERVALS', () => {
  it('has 13 entries indexed by semitones', () => {
    expect(EAR_INTERVALS).toHaveLength(13);
    expect(EAR_INTERVALS[0].label).toBe('Uníssono');
    expect(EAR_INTERVALS[6].label).toBe('Trítono');
    expect(EAR_INTERVALS[12].label).toBe('8ª J');
    expect(earInterval(4).name).toBe('terça maior');
    expect(EAR_INTERVALS.map((e) => e.semitones)).toEqual([...Array(13).keys()]);
    expect(INTERVALS).toHaveLength(11);
  });
  it('lists the direction settings', () => {
    expect(EAR_DIRECTIONS).toEqual(['up', 'down', 'both']);
  });
});

describe('EAR_RANGE', () => {
  it('sits inside the playable range', () => {
    for (const inst of [GUITAR, BASS]) {
      const [lo, hi] = instrumentRange(inst);
      const [a, b] = earRange(inst);
      expect(a).toBeGreaterThanOrEqual(lo);
      expect(b).toBeLessThanOrEqual(hi);
    }
    expect(earRange(BASS)).toEqual([33, 60]);
    expect(EAR_RANGE.guitar).toEqual([45, 76]);
  });
});

describe('pools', () => {
  it.each([
    ['easy', 36, 36, 72],
    ['medium', 84, 84, 168],
    ['hard', 156, 156, 300],
  ] as const)('%s interval pool sizes', (level, up, down, both) => {
    expect(earIntervalPool(level, 'up')).toHaveLength(up);
    expect(earIntervalPool(level, 'down')).toHaveLength(down);
    expect(earIntervalPool(level, 'both')).toHaveLength(both);
  });
  it.each([
    ['easy', 36],
    ['medium', 60],
    ['hard', 84],
  ] as const)('%s degree pool size', (level, n) => {
    expect(degreePool(level)).toHaveLength(n);
  });
  it('orders items', () => {
    expect(earIntervalPool('easy', 'up').slice(0, 4)).toEqual([
      { root: 0, semitones: 4, direction: 'up' },
      { root: 0, semitones: 7, direction: 'up' },
      { root: 0, semitones: 12, direction: 'up' },
      { root: 1, semitones: 4, direction: 'up' },
    ]);
    expect(earIntervalPool('easy', 'both').slice(0, 3)).toEqual([
      { root: 0, semitones: 4, direction: 'up' },
      { root: 0, semitones: 4, direction: 'down' },
      { root: 0, semitones: 7, direction: 'up' },
    ]);
    expect(earIntervalPool('hard', 'down')[0]).toEqual({ root: 0, semitones: 0, direction: 'up' });
    expect(degreePool('easy').slice(0, 4)).toEqual([
      { tonic: 0, degree: 1 },
      { tonic: 0, degree: 3 },
      { tonic: 0, degree: 5 },
      { tonic: 1, degree: 1 },
    ]);
  });
  it('has unique keys that validate', () => {
    for (const level of LEVELS) {
      for (const dir of ['up', 'down', 'both'] as const) {
        const keys = earIntervalPool(level, dir).map(earIntervalKey);
        expect(new Set(keys).size).toBe(keys.length);
        keys.forEach((k) => expect(isEarIntervalKey(k)).toBe(true));
      }
      const dk = degreePool(level).map(degreeKey);
      expect(new Set(dk).size).toBe(dk.length);
      dk.forEach((k) => expect(isDegreeKey(k)).toBe(true));
    }
  });
});

describe('keys', () => {
  it('builds keys', () => {
    expect(earIntervalKey({ root: 3, semitones: 7, direction: 'down' })).toBe('earint:3:7:down');
    expect(degreeKey({ tonic: 11, degree: 7 })).toBe('func:11:7');
  });
  it.each(['earint:0:0:up', 'earint:11:12:down', 'earint:3:7:up'])('accepts %s', (k) => {
    expect(isEarIntervalKey(k)).toBe(true);
  });
  it.each([
    'earint:12:4:up',
    'earint:0:13:up',
    'earint:0:0:down',
    'earint:01:4:up',
    'earint:0:4:sobe',
    'earint:0:4',
    'interval:0:3M',
  ])('rejects %s', (k) => {
    expect(isEarIntervalKey(k)).toBe(false);
  });
  it.each(['func:0:1', 'func:11:7'])('accepts %s', (k) => {
    expect(isDegreeKey(k)).toBe(true);
  });
  it.each(['func:12:1', 'func:0:0', 'func:0:8', 'func:00:1', 'func:-1:3', 'func:0:1:x'])(
    'rejects %s',
    (k) => {
      expect(isDegreeKey(k)).toBe(false);
    },
  );
});

describe('pitch drawing', () => {
  it.each([
    [GUITAR, 0, 4, 'up', [48, 52], [72, 76]],
    [GUITAR, 9, 7, 'down', [57, 50], [69, 62]],
    [GUITAR, 4, 12, 'up', [52, 64], [64, 76]],
    [BASS, 0, 12, 'up', [36, 48], [48, 60]],
    [BASS, 4, 12, 'down', [52, 40], [52, 40]],
    [BASS, 7, 0, 'up', [43, 43], [55, 55]],
    [BASS, 9, 7, 'up', [33, 40], [45, 52]],
  ] as const)('earIntervalPitches %#', (inst, root, s, dir, low, high) => {
    const item: EarIntervalItem = { root, semitones: s, direction: dir };
    expect(earIntervalPitches(item, inst, rngOf(0))).toEqual(low);
    expect(earIntervalPitches(item, inst, rngOf(0.999))).toEqual(high);
  });
  it.each([
    [GUITAR, 0, 48, 60],
    [GUITAR, 9, 45, 57],
    [BASS, 0, 36, 48],
    [BASS, 2, 38, 38],
    [BASS, 9, 33, 45],
  ] as const)('degreeTonicMidi %#', (inst, tonic, low, high) => {
    expect(degreeTonicMidi(tonic, inst, rngOf(0))).toBe(low);
    expect(degreeTonicMidi(tonic, inst, rngOf(0.999))).toBe(high);
  });
});

describe('sequences', () => {
  it('degreeSequence', () => {
    expect(degreeSequence({ tonic: 0, degree: 5, tonicMidi: 48 }, 'easy')).toEqual([
      { midi: 48, atMs: 0 },
      { midi: 52, atMs: 400 },
      { midi: 55, atMs: 800 },
      { midi: 55, atMs: 1800 },
    ]);
    expect(degreeSequence({ tonic: 0, degree: 7, tonicMidi: 45 }, 'medium')).toEqual([
      { midi: 45, atMs: 0 },
      { midi: 49, atMs: 400 },
      { midi: 52, atMs: 800 },
      { midi: 56, atMs: 1800 },
    ]);
    expect(degreeSequence({ tonic: 0, degree: 3, tonicMidi: 48 }, 'hard')).toEqual([
      { midi: 48, atMs: 0 },
      { midi: 52, atMs: 1000 },
    ]);
    expect(degreeSequence({ tonic: 2, degree: 7, tonicMidi: 38 }, 'hard')).toEqual([
      { midi: 38, atMs: 0 },
      { midi: 49, atMs: 1000 },
    ]);
  });
  it('degreeTarget', () => {
    expect(degreeTarget({ tonic: 0, degree: 5, tonicMidi: 48 })).toBe(55);
  });
  it('earIntervalSequence', () => {
    expect(
      earIntervalSequence({ root: 9, semitones: 7, direction: 'down', pitches: [57, 50] }),
    ).toEqual([
      { midi: 57, atMs: 0 },
      { midi: 50, atMs: 900 },
    ]);
  });
});

describe('range safety (exhaustive)', () => {
  for (const inst of [GUITAR, BASS]) {
    it(`keeps every pitch in range for ${inst.id}`, () => {
      const [lo, hi] = earRange(inst);
      for (const v of RNGS) {
        const rng = rngOf(v);
        for (const level of LEVELS) {
          for (const item of earIntervalPool(level, 'both')) {
            const [a, b] = earIntervalPitches(item, inst, rng);
            expect(a).toBeGreaterThanOrEqual(lo);
            expect(a).toBeLessThanOrEqual(hi);
            expect(b).toBeGreaterThanOrEqual(lo);
            expect(b).toBeLessThanOrEqual(hi);
            expect(a % 12).toBe(item.root);
            expect(b - a).toBe(item.direction === 'up' ? item.semitones : -item.semitones);
          }
        }
        for (const item of degreePool('hard')) {
          const tonicMidi = degreeTonicMidi(item.tonic as NoteIndex, inst, rng);
          expect(tonicMidi % 12).toBe(item.tonic);
          const q: DegreeQuestion = { ...item, tonicMidi };
          for (const level of LEVELS) {
            for (const step of degreeSequence(q, level)) {
              expect(step.midi).toBeGreaterThanOrEqual(lo);
              expect(step.midi).toBeLessThanOrEqual(hi);
            }
          }
        }
      }
    });
  }
});

describe('queues', () => {
  it('shuffled keeps the items', () => {
    const out = shuffled([1, 2, 3, 4, 5], mulberry32(1));
    expect([...out].sort()).toEqual([1, 2, 3, 4, 5]);
  });
  it('buildEarIntervalQueue', () => {
    const pool = earIntervalPool('medium', 'both');
    const q = buildEarIntervalQueue(pool, GUITAR, mulberry32(3));
    expect(q).toHaveLength(pool.length);
    expect(new Set(q.map(earIntervalKey))).toEqual(new Set(pool.map(earIntervalKey)));
    const [lo, hi] = earRange(GUITAR);
    for (const x of q) {
      expect(x.pitches[0] % 12).toBe(x.root);
      expect(x.pitches[1] - x.pitches[0]).toBe(x.direction === 'up' ? x.semitones : -x.semitones);
      for (const p of x.pitches) {
        expect(p).toBeGreaterThanOrEqual(lo);
        expect(p).toBeLessThanOrEqual(hi);
      }
    }
  });
  it('buildDegreeQueue', () => {
    const pool = degreePool('hard');
    const q = buildDegreeQueue(pool, BASS, mulberry32(3));
    expect(q).toHaveLength(pool.length);
    expect(new Set(q.map(degreeKey))).toEqual(new Set(pool.map(degreeKey)));
    const [lo, hi] = earRange(BASS);
    for (const x of q) {
      expect(x.tonicMidi % 12).toBe(x.tonic);
      expect(x.tonicMidi).toBeGreaterThanOrEqual(lo);
      expect(x.tonicMidi + 11).toBeLessThanOrEqual(hi);
    }
  });
});
