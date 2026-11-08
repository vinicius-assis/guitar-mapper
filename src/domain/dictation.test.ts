import { describe, expect, it } from 'vitest';
import {
  DICTATION_LEVELS,
  buildDictationQueue,
  dictationAdvanceMs,
  dictationKey,
  dictationMelody,
  dictationNotes,
  dictationPool,
  dictationQuestion,
  dictationSequence,
  isDictationKey,
  isDictationTap,
  type DictationQuestion,
} from './dictation';
import { earRange } from './earTraining';
import { BASS, GUITAR } from './instruments';
import type { NoteIndex } from './notes';
import type { EarLevel } from './quiz';
import { SCALES, scaleDegreeOf } from './scales';

const C = (v: number) => () => v;

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickFrom<T>(items: T[], rng: () => number): T {
  return items[Math.floor(rng() * items.length)];
}

const LEVELS: EarLevel[] = ['easy', 'medium', 'hard'];

describe('levels and pools', () => {
  it('matches the level table', () => {
    expect(DICTATION_LEVELS).toEqual({
      easy: { scales: ['pent-major', 'pent-minor'], length: 4, maxStep: 2 },
      medium: { scales: ['major', 'minor'], length: 6, maxStep: 2 },
      hard: {
        scales: ['major', 'minor', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'locrian'],
        length: 8,
        maxStep: 3,
      },
    });
  });

  it('builds the pools in order', () => {
    expect(dictationPool('easy')).toHaveLength(24);
    expect(dictationPool('medium')).toHaveLength(24);
    expect(dictationPool('hard')).toHaveLength(84);
    expect(dictationPool('easy')[0]).toEqual({ scale: 'pent-major', root: 0, length: 4 });
    expect(dictationPool('hard')[83]).toEqual({ scale: 'locrian', root: 11, length: 8 });
  });
});

describe('dictationNotes', () => {
  it('lists distinct ascending pitches of the box inside the ear range', () => {
    expect(dictationNotes('pent-minor', 1, 9, GUITAR)).toEqual([45, 48, 50, 52, 55, 57, 60, 62, 64, 67, 69, 72]);
    expect(dictationNotes('pent-major', 3, 1, BASS)).toEqual([34, 37, 39, 41, 44, 46]);
    expect(dictationNotes('major', 1, 0, GUITAR)).toEqual([
      48, 50, 52, 53, 55, 57, 59, 60, 62, 64, 65, 67, 69, 71, 72, 74, 76,
    ]);
  });
});

describe('dictationMelody literals', () => {
  const lo = 0;
  const hi = 0.999999;
  it.each([
    ['pent-minor', 9, 4, 1, GUITAR, [45, 48, 45, 48], [69, 72, 69, 72]],
    ['pent-minor', 9, 4, 1, BASS, [33, 36, 33, 36], [45, 50, 48, 50]],
    ['major', 0, 6, 1, GUITAR, [48, 50, 48, 50, 48, 50], [72, 76, 74, 76, 74, 76]],
    ['dorian', 2, 8, 2, GUITAR, [62, 57, 52, 53, 52, 53, 52, 53], [74, 76, 74, 76, 74, 76, 74, 76]],
    ['pent-major', 1, 4, 3, BASS, [37, 34, 37, 34], [37, 41, 46, 44]],
  ] as const)('%s root %i length %i box %i', (scale, root, length, box, inst, low, high) => {
    const item = { scale, root: root as NoteIndex, length };
    expect(dictationMelody(item, box, inst, C(lo))).toEqual(low);
    expect(dictationMelody(item, box, inst, C(hi))).toEqual(high);
  });

  it('walks a middle draw', () => {
    expect(dictationMelody({ scale: 'pent-minor', root: 9, length: 4 }, 1, GUITAR, C(0.5))).toEqual([57, 60, 62, 64]);
  });
});

describe('dictationMelody is always safe', () => {
  const ROOTS = Array.from({ length: 12 }, (_, i) => i as NoteIndex);
  describe.each([GUITAR, BASS])('$id', (inst) => {
    describe.each(LEVELS)('%s', (level) => {
      const def = DICTATION_LEVELS[level];
      const [lo, hi] = earRange(inst);

      function check(scale: (typeof def.scales)[number], root: NoteIndex, box: number, rng: () => number) {
        const notes = dictationNotes(scale, box, root, inst);
        const m = dictationMelody({ scale, root, length: def.length }, box, inst, rng);
        expect(m).toHaveLength(def.length);
        expect(m[0] % 12).toBe(root);
        m.forEach((n, i) => {
          expect(n).toBeGreaterThanOrEqual(lo);
          expect(n).toBeLessThanOrEqual(hi);
          expect(scaleDegreeOf((n % 12) as NoteIndex, root, scale)).toBeGreaterThanOrEqual(0);
          expect(notes).toContain(n);
          if (i < m.length - 1) {
            expect(n).not.toBe(m[i + 1]);
            expect(Math.abs(notes.indexOf(n) - notes.indexOf(m[i + 1]))).toBeLessThanOrEqual(def.maxStep);
          }
        });
      }

      it('holds for extreme and middle draws on every box', () => {
        for (const scale of def.scales) {
          for (const root of ROOTS) {
            for (let box = 1; box <= SCALES[scale].boxCount; box++) {
              const notes = dictationNotes(scale, box, root, inst);
              expect(notes.length).toBeGreaterThanOrEqual(inst.id === 'guitar' ? 10 : 6);
              expect(notes.some((n) => n % 12 === root)).toBe(true);
              for (const v of [0, 0.5, 0.999999]) check(scale, root, box, C(v));
            }
          }
        }
      });

      it('holds for 50 seeded draws', () => {
        const rng = mulberry32(1);
        for (let k = 0; k < 50; k++) {
          const item = pickFrom(dictationPool(level), rng);
          const q = dictationQuestion(item, inst, rng);
          check(item.scale, item.root, q.box, () => 0);
          const notes = dictationNotes(item.scale, q.box, item.root, inst);
          expect(q.pitches).toHaveLength(def.length);
          expect(q.pitches.every((p) => notes.includes(p))).toBe(true);
          check(item.scale, item.root, q.box, rng);
        }
      });
    });
  });
});

describe('dictationQuestion', () => {
  it('draws the box in 1..boxCount', () => {
    const major = { scale: 'major' as const, root: 0 as NoteIndex, length: 8 };
    expect(dictationQuestion(major, GUITAR, C(0)).box).toBe(1);
    expect(dictationQuestion(major, GUITAR, C(0.999999)).box).toBe(7);
    expect(dictationQuestion({ scale: 'pent-minor', root: 0, length: 4 }, GUITAR, C(0.999999)).box).toBe(5);
  });

  it('builds a queue with every item once, inside the range', () => {
    const queue = buildDictationQueue(dictationPool('easy'), BASS, mulberry32(7));
    expect(queue).toHaveLength(24);
    expect(new Set(queue.map(dictationKey)).size).toBe(24);
    for (const q of queue) for (const p of q.pitches) expect(p >= 33 && p <= 60).toBe(true);
  });
});

describe('sound', () => {
  const base = { scale: 'pent-minor' as const, root: 9 as NoteIndex, length: 4, box: 1 };
  it('spaces notes by 600 ms', () => {
    expect(dictationSequence({ ...base, pitches: [57, 60, 62, 64] })).toEqual([
      { midi: 57, atMs: 0 },
      { midi: 60, atMs: 600 },
      { midi: 62, atMs: 1200 },
      { midi: 64, atMs: 1800 },
    ]);
  });

  it('advances only after the last note rang', () => {
    expect(dictationAdvanceMs(4)).toBe(2800);
    expect(dictationAdvanceMs(6)).toBe(4000);
    expect(dictationAdvanceMs(8)).toBe(5200);
    for (const n of [4, 6, 8]) {
      const seq = dictationSequence({ ...base, length: n, pitches: Array(n).fill(57) });
      expect(dictationAdvanceMs(n)).toBeGreaterThan(seq[seq.length - 1].atMs);
    }
  });
});

describe('isDictationTap', () => {
  const q: DictationQuestion = {
    scale: 'major',
    root: 0,
    length: 6,
    box: 1,
    pitches: [60, 64, 65, 69, 72, 71],
  };
  it('compares the exact pitch, whatever the string', () => {
    expect(isDictationTap(q, 4, { string: 1, fret: 8 }, GUITAR)).toBe(true);
    expect(isDictationTap(q, 4, { string: 2, fret: 13 }, GUITAR)).toBe(true);
    expect(isDictationTap(q, 4, { string: 3, fret: 5 }, GUITAR)).toBe(false);
    expect(isDictationTap(q, 0, { string: 4, fret: 10 }, GUITAR)).toBe(true);
    expect(isDictationTap(q, 0, { string: 2, fret: 1 }, GUITAR)).toBe(true);
    expect(isDictationTap(q, 0, { string: 5, fret: 3 }, GUITAR)).toBe(false);
  });
});

describe('keys', () => {
  it('formats the key', () => {
    expect(dictationKey({ scale: 'pent-minor', root: 9, length: 4 })).toBe('dict:pent-minor:9:4');
  });

  it.each(['dict:pent-minor:9:4', 'dict:major:0:6', 'dict:major:0:8', 'dict:locrian:11:8'])('accepts %s', (k) => {
    expect(isDictationKey(k)).toBe(true);
  });

  it.each([
    'dict:pent-minor:9:6',
    'dict:dorian:0:6',
    'dict:blues:0:4',
    'dict:major:12:6',
    'dict:major:01:6',
    'dict:major:0:5',
    'dict:major:0',
    'dictation:major:0:6',
  ])('rejects %s', (k) => {
    expect(isDictationKey(k)).toBe(false);
  });

  it('accepts every pool key, all distinct', () => {
    const keys = LEVELS.flatMap((l) => dictationPool(l).map(dictationKey));
    expect(keys).toHaveLength(132);
    expect(new Set(keys).size).toBe(132);
    expect(keys.every(isDictationKey)).toBe(true);
  });
});
