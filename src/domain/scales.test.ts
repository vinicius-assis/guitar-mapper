import { describe, expect, it } from 'vitest';
import { BASS, GUITAR, type Instrument } from './instruments';
import {
  SCALES,
  SCALE_GROUPS,
  SCALE_IDS,
  isScaleId,
  scaleBox,
  scaleDegreeOf,
  type ScaleBox,
  type ScaleId,
} from './scales';

const range = (b: ScaleBox) => [b.fretMin, b.fretMax];
const keys = (b: ScaleBox) => b.notes.map((n) => `${n.position.string}-${n.position.fret}`);

const ROOT: Record<string, number> = { C: 0, 'F#': 6, G: 7, Ab: 8, A: 9, E: 4, D: 2 };

describe('SCALES', () => {
  it.each([
    ['pent-minor', ['1', '♭3', '4', '5', '♭7'], 5],
    ['pent-major', ['1', '2', '3', '5', '6'], 5],
    ['blues', ['1', '♭3', '4', '♭5', '5', '♭7'], 5],
    ['major', ['1', '2', '3', '4', '5', '6', '7'], 7],
    ['minor', ['1', '2', '♭3', '4', '5', '♭6', '♭7'], 7],
    ['dorian', ['1', '2', '♭3', '4', '5', '6', '♭7'], 7],
    ['phrygian', ['1', '♭2', '♭3', '4', '5', '♭6', '♭7'], 7],
    ['lydian', ['1', '2', '3', '♯4', '5', '6', '7'], 7],
    ['mixolydian', ['1', '2', '3', '4', '5', '6', '♭7'], 7],
    ['locrian', ['1', '♭2', '♭3', '4', '♭5', '♭6', '♭7'], 7],
  ] as [ScaleId, string[], number][])('%s degrees and boxCount', (id, degrees, boxCount) => {
    expect(SCALES[id].degrees).toEqual(degrees);
    expect(SCALES[id].boxCount).toBe(boxCount);
    expect(SCALES[id].letterSteps).toHaveLength(degrees.length);
    expect(SCALES[id].semitones).toHaveLength(degrees.length);
  });

  it('groups cover every scale in order', () => {
    expect(SCALE_GROUPS.flatMap((g) => g.scales)).toEqual(SCALE_IDS);
    expect(SCALE_GROUPS.map((g) => g.label)).toEqual([
      'Pentatônicas e blues',
      'Maior e menor',
      'Modos',
    ]);
  });

  it('isScaleId', () => {
    expect(isScaleId('blues')).toBe(true);
    expect(isScaleId('Blues')).toBe(false);
    expect(isScaleId('ionian')).toBe(false);
    expect(isScaleId(3)).toBe(false);
  });
});

describe('scaleBox windows', () => {
  const inst = { GUITAR, BASS };
  it.each([
    ['GUITAR', 'pent-minor', 'A', [[5, 8], [7, 10], [9, 13], [12, 15], [2, 5]]],
    ['GUITAR', 'pent-minor', 'E', [[12, 15], [2, 5], [4, 8], [7, 10], [9, 12]]],
    ['GUITAR', 'pent-minor', 'C', [[8, 11], [10, 13], [12, 16], [3, 6], [5, 8]]],
    ['GUITAR', 'pent-minor', 'F#', [[2, 5], [4, 7], [6, 10], [9, 12], [11, 14]]],
    ['GUITAR', 'pent-major', 'C', [[7, 10], [9, 13], [12, 15], [2, 5], [5, 8]]],
    ['GUITAR', 'pent-major', 'G', [[2, 5], [4, 8], [7, 10], [9, 12], [12, 15]]],
    ['GUITAR', 'blues', 'A', [[5, 8], [7, 10], [9, 13], [12, 15], [2, 5]]],
    ['GUITAR', 'major', 'G', [[3, 8], [5, 10], [7, 12], [8, 14], [10, 15], [12, 17], [2, 7]]],
    ['GUITAR', 'major', 'A', [[5, 10], [7, 12], [9, 14], [10, 16], [12, 17], [2, 7], [4, 9]]],
    ['GUITAR', 'major', 'Ab', [[4, 9], [6, 11], [8, 13], [9, 15], [11, 16], [1, 6], [3, 8]]],
    ['GUITAR', 'minor', 'A', [[5, 10], [7, 12], [8, 13], [10, 15], [12, 17], [1, 7], [3, 8]]],
    ['GUITAR', 'dorian', 'D', [[10, 15], [12, 17], [1, 7], [3, 8], [5, 10], [7, 12], [8, 13]]],
    ['BASS', 'pent-minor', 'A', [[5, 8], [7, 10], [9, 12], [12, 15], [2, 5]]],
    ['BASS', 'pent-minor', 'E', [[12, 15], [2, 5], [4, 7], [7, 10], [9, 12]]],
    ['BASS', 'pent-major', 'C', [[7, 10], [9, 12], [12, 15], [2, 5], [5, 8]]],
    ['BASS', 'blues', 'A', [[5, 8], [7, 10], [9, 12], [12, 15], [2, 5]]],
    ['BASS', 'major', 'C', [[8, 12], [10, 14], [12, 16], [1, 5], [3, 7], [5, 9], [7, 10]]],
    ['BASS', 'major', 'Ab', [[4, 8], [6, 10], [8, 12], [9, 13], [11, 15], [1, 5], [3, 6]]],
    ['BASS', 'minor', 'E', [[12, 16], [2, 5], [3, 7], [5, 9], [7, 11], [8, 12], [10, 14]]],
  ] as [keyof typeof inst, ScaleId, string, number[][]][])(
    '%s %s %s',
    (i, scale, root, expected) => {
      const got = expected.map((_, k) => range(scaleBox(scale, k + 1, ROOT[root], inst[i])));
      expect(got).toEqual(expected);
    },
  );
});

describe('scaleBox full boxes', () => {
  const s = (t: string) => t.split(' ');
  const n = (t: string) => t.split(' ').map(Number);
  it.each([
    [GUITAR, 'pent-minor', 9, 1, '6-5 6-8 5-5 5-7 4-5 4-7 3-5 3-7 2-5 2-8 1-5 1-8', '45 48 50 52 55 57 60 62 64 67 69 72', '0 1 2 3 4 0 1 2 3 4 0 1'],
    [GUITAR, 'pent-minor', 9, 5, '6-3 6-5 5-3 5-5 4-2 4-5 3-2 3-5 2-3 2-5 1-3 1-5', '43 45 48 50 52 55 57 60 62 64 67 69', '4 0 1 2 3 4 0 1 2 3 4 0'],
    [GUITAR, 'blues', 9, 1, '6-5 6-8 5-5 5-6 5-7 4-5 4-7 3-5 3-7 3-8 2-5 2-8 1-5 1-8', '45 48 50 51 52 55 57 60 62 63 64 67 69 72', '0 1 2 3 4 5 0 1 2 3 4 5 0 1'],
    [GUITAR, 'major', 7, 1, '6-3 6-5 6-7 5-3 5-5 5-7 4-4 4-5 4-7 3-4 3-5 3-7 2-5 2-7 2-8 1-5 1-7 1-8', '43 45 47 48 50 52 54 55 57 59 60 62 64 66 67 69 71 72', '0 1 2 3 4 5 6 0 1 2 3 4 5 6 0 1 2 3'],
    [GUITAR, 'pent-minor', 4, 1, '6-12 6-15 5-12 5-14 4-12 4-14 3-12 3-14 2-12 2-15 1-12 1-15', '52 55 57 59 62 64 67 69 71 74 76 79', '0 1 2 3 4 0 1 2 3 4 0 1'],
    [BASS, 'pent-minor', 9, 1, '4-5 4-8 3-5 3-7 2-5 2-7 1-5 1-7', '33 36 38 40 43 45 48 50', '0 1 2 3 4 0 1 2'],
    [BASS, 'blues', 9, 1, '4-5 4-8 3-5 3-6 3-7 2-5 2-7 1-5 1-7 1-8', '33 36 38 39 40 43 45 48 50 51', '0 1 2 3 4 5 0 1 2 3'],
    [BASS, 'major', 0, 1, '4-8 4-10 4-12 3-8 3-10 3-12 2-9 2-10 2-12 1-9 1-10 1-12', '36 38 40 41 43 45 47 48 50 52 53 55', '0 1 2 3 4 5 6 0 1 2 3 4'],
  ] as [Instrument, ScaleId, number, number, string, string, string][])(
    '%s %s root %i box %i',
    (inst, scale, root, box, pos, pitches, degrees) => {
      const b = scaleBox(scale, box, root, inst);
      expect(keys(b)).toEqual(s(pos));
      expect(b.notes.map((x) => x.pitch)).toEqual(n(pitches));
      expect(b.notes.map((x) => x.degree)).toEqual(n(degrees));
    },
  );
});

describe('scaleBox invariants', () => {
  for (const inst of [GUITAR, BASS]) {
    for (const id of SCALE_IDS) {
      const def = SCALES[id];
      it(`${inst.id} ${id}`, () => {
        for (let box = 1; box <= def.boxCount; box++) {
          let ref: string[] | null = null;
          for (let root = 0; root < 12; root++) {
            const b = scaleBox(id, box, root, inst);
            const frets = b.notes.map((x) => x.position.fret);
            const ctx = `${id} box ${box} root ${root}`;
            expect(Math.min(...frets), ctx).toBe(b.fretMin);
            expect(Math.max(...frets), ctx).toBe(b.fretMax);
            expect(b.fretMin, ctx).toBeGreaterThanOrEqual(1);
            expect(b.fretMax, ctx).toBeLessThanOrEqual(24);
            const pitches = b.notes.map((x) => x.pitch);
            expect(new Set(pitches).size, ctx).toBe(pitches.length);
            for (const x of b.notes) {
              expect(x.pitch, ctx).toBe(inst.openMidi[x.position.string - 1] + x.position.fret);
              expect((((x.pitch - root) % 12) + 12) % 12, ctx).toBe(def.semitones[x.degree]);
            }
            const degs = new Set(b.notes.map((x) => x.degree));
            // Blues: the blue note is only added when it falls inside the pentatonic window;
            // on bass box 5 the 4-fret window does not contain it, so it may be absent there.
            const blueMissing = def.blueNote !== undefined && !degs.has(def.blueNote);
            if (blueMissing) {
              expect(inst.id, ctx).toBe('bass');
              expect(box, ctx).toBe(5);
            }
            expect(degs.size, ctx).toBe(def.semitones.length - (blueMissing ? 1 : 0));
            expect(degs.has(0), ctx).toBe(true);
            if (!def.base) expect(b.notes.length, ctx).toBe(inst.stringCount * def.notesPerString);
            const have = new Set(pitches);
            for (let string = 1; string <= inst.stringCount; string++) {
              for (let fret = b.fretMin; fret <= b.fretMax; fret++) {
                const pitch = inst.openMidi[string - 1] + fret;
                if (scaleDegreeOf(pitch % 12, root, id) >= 0) {
                  expect(have.has(pitch), `${ctx} ${string}-${fret}`).toBe(true);
                }
              }
            }
            const shape = b.notes.map(
              (x) => `${x.position.string}:${x.position.fret - b.fretMin}:${x.degree}`,
            );
            if (root === 0) ref = shape;
            else expect(shape, ctx).toEqual(ref);
          }
        }
      });
    }
  }
});

describe('scaleDegreeOf', () => {
  it('finds the index or -1', () => {
    expect(scaleDegreeOf(0, 9, 'pent-minor')).toBe(1);
    expect(scaleDegreeOf(3, 9, 'blues')).toBe(3);
    expect(scaleDegreeOf(1, 9, 'pent-minor')).toBe(-1);
  });
});
