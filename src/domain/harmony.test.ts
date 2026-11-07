import { describe, expect, it } from 'vitest';
import {
  QUALITY_SYMBOL,
  chordPitches,
  chordRootClass,
  degreeNumeral,
  degreeQuality,
  fieldsOf,
  harmonyKeys,
  keySignatureCount,
  romanNumeral,
  spellChord,
  type HarmonyField,
} from './harmony';
import { BASS, GUITAR } from './instruments';
import { EAR_RANGE } from './earTraining';
import { ACCIDENTALS, type Accidentals } from './notes';
import { spellingLabel } from './spelling';

const sym = (f: HarmonyField, k: number, d: number, s: boolean, acc: Accidentals) => {
  const c = spellChord(f, k, d, s, acc);
  return spellingLabel(c.root, 'cifra') + QUALITY_SYMBOL[c.quality];
};
const row = (f: HarmonyField, k: number, s: boolean, acc: Accidentals) =>
  [1, 2, 3, 4, 5, 6, 7].map((d) => sym(f, k, d, s, acc)).join(' ');

const MAJOR_TRIADS = ['C Dm Em F G Am B°', 'Db Ebm Fm Gb Ab Bbm C°', 'D Em F#m G A Bm C#°', 'Eb Fm Gm Ab Bb Cm D°', 'E F#m G#m A B C#m D#°', 'F Gm Am Bb C Dm E°', 'F# G#m A#m B C# D#m E#°', 'G Am Bm C D Em F#°', 'Ab Bbm Cm Db Eb Fm G°', 'A Bm C#m D E F#m G#°', 'Bb Cm Dm Eb F Gm A°', 'B C#m D#m E F# G#m A#°'];
const MAJOR_SEVENTHS = ['C7M Dm7 Em7 F7M G7 Am7 Bm7(b5)', 'Db7M Ebm7 Fm7 Gb7M Ab7 Bbm7 Cm7(b5)', 'D7M Em7 F#m7 G7M A7 Bm7 C#m7(b5)', 'Eb7M Fm7 Gm7 Ab7M Bb7 Cm7 Dm7(b5)', 'E7M F#m7 G#m7 A7M B7 C#m7 D#m7(b5)', 'F7M Gm7 Am7 Bb7M C7 Dm7 Em7(b5)', 'F#7M G#m7 A#m7 B7M C#7 D#m7 E#m7(b5)', 'G7M Am7 Bm7 C7M D7 Em7 F#m7(b5)', 'Ab7M Bbm7 Cm7 Db7M Eb7 Fm7 Gm7(b5)', 'A7M Bm7 C#m7 D7M E7 F#m7 G#m7(b5)', 'Bb7M Cm7 Dm7 Eb7M F7 Gm7 Am7(b5)', 'B7M C#m7 D#m7 E7M F#7 G#m7 A#m7(b5)'];
const MINOR_TRIADS = ['Cm D° Eb Fm Gm Ab Bb', 'C#m D#° E F#m G#m A B', 'Dm E° F Gm Am Bb C', 'Ebm F° Gb Abm Bbm Cb Db', 'Em F#° G Am Bm C D', 'Fm G° Ab Bbm Cm Db Eb', 'F#m G#° A Bm C#m D E', 'Gm A° Bb Cm Dm Eb F', 'G#m A#° B C#m D#m E F#', 'Am B° C Dm Em F G', 'Bbm C° Db Ebm Fm Gb Ab', 'Bm C#° D Em F#m G A'];
const MINOR_SEVENTHS = ['Cm7 Dm7(b5) Eb7M Fm7 Gm7 Ab7M Bb7', 'C#m7 D#m7(b5) E7M F#m7 G#m7 A7M B7', 'Dm7 Em7(b5) F7M Gm7 Am7 Bb7M C7', 'Ebm7 Fm7(b5) Gb7M Abm7 Bbm7 Cb7M Db7', 'Em7 F#m7(b5) G7M Am7 Bm7 C7M D7', 'Fm7 Gm7(b5) Ab7M Bbm7 Cm7 Db7M Eb7', 'F#m7 G#m7(b5) A7M Bm7 C#m7 D7M E7', 'Gm7 Am7(b5) Bb7M Cm7 Dm7 Eb7M F7', 'G#m7 A#m7(b5) B7M C#m7 D#m7 E7M F#7', 'Am7 Bm7(b5) C7M Dm7 Em7 F7M G7', 'Bbm7 Cm7(b5) Db7M Ebm7 Fm7 Gb7M Ab7', 'Bm7 C#m7(b5) D7M Em7 F#m7 G7M A7'];
const SHARP: Record<HarmonyField, Record<number, string>> = {
  major: { 1: 'C# D#m E#m F# G# A#m B#°', 3: 'Eb Fm Gm Ab Bb Cm D°', 6: 'F# G#m A#m B C# D#m E#°', 8: 'Ab Bbm Cm Db Eb Fm G°', 10: 'Bb Cm Dm Eb F Gm A°' },
  minor: { 1: 'C#m D#° E F#m G#m A B', 3: 'D#m E#° F# G#m A#m B C#', 6: 'F#m G#° A Bm C#m D E', 8: 'G#m A#° B C#m D#m E F#', 10: 'A#m B#° C# D#m E#m F# G#' },
};
const FLAT: Record<HarmonyField, Record<number, string>> = {
  major: { 1: 'Db Ebm Fm Gb Ab Bbm C°', 3: 'Eb Fm Gm Ab Bb Cm D°', 6: 'Gb Abm Bbm Cb Db Ebm F°', 8: 'Ab Bbm Cm Db Eb Fm G°', 10: 'Bb Cm Dm Eb F Gm A°' },
  minor: { 1: 'C#m D#° E F#m G#m A B', 3: 'Ebm F° Gb Abm Bbm Cb Db', 6: 'F#m G#° A Bm C#m D E', 8: 'Abm Bb° Cb Dbm Ebm Fb Gb', 10: 'Bbm C° Db Ebm Fm Gb Ab' },
};
const DEGREES = [1, 2, 3, 4, 5, 6, 7];
const KEYS = Array.from({ length: 12 }, (_, i) => i);
const FIELDS: HarmonyField[] = ['major', 'minor'];

describe('chord spelling tables', () => {
  it.each(KEYS)('key %i matches the reference tables with auto', (k) => {
    expect(row('major', k, false, 'auto')).toBe(MAJOR_TRIADS[k]);
    expect(row('major', k, true, 'auto')).toBe(MAJOR_SEVENTHS[k]);
    expect(row('minor', k, false, 'auto')).toBe(MINOR_TRIADS[k]);
    expect(row('minor', k, true, 'auto')).toBe(MINOR_SEVENTHS[k]);
  });

  it.each([0, 2, 4, 5, 7, 9, 11])('natural key %i ignores the accidentals setting', (k) => {
    for (const f of FIELDS)
      for (const s of [false, true])
        for (const acc of ['sharp', 'flat'] as const)
          expect(row(f, k, s, acc)).toBe(row(f, k, s, 'auto'));
  });

  it.each([1, 3, 6, 8, 10])('black key %i honours sharp and flat', (k) => {
    for (const f of FIELDS) {
      expect(row(f, k, false, 'sharp')).toBe(SHARP[f][k]);
      expect(row(f, k, false, 'flat')).toBe(FLAT[f][k]);
    }
  });

  it('spells Bb in F major for every setting', () => {
    for (const acc of ACCIDENTALS) expect(sym('major', 5, 4, false, acc)).toBe('Bb');
  });

  it('spells the chord tones', () => {
    const names = (f: HarmonyField, k: number, d: number, s: boolean) =>
      spellChord(f, k, d, s, 'auto').tones.map((t) => spellingLabel(t, 'cifra'));
    expect(names('major', 5, 4, true)).toEqual(['Bb', 'D', 'F', 'A']);
    expect(names('major', 2, 7, false)).toEqual(['C#', 'E', 'G']);
  });
});

describe('qualities and numerals', () => {
  it('derives qualities', () => {
    const q = (f: HarmonyField, s: boolean) => DEGREES.map((d) => degreeQuality(f, d, s));
    expect(q('major', false)).toEqual(['major', 'minor', 'minor', 'major', 'major', 'minor', 'dim']);
    expect(q('major', true)).toEqual(['maj7', 'min7', 'min7', 'maj7', 'dom7', 'min7', 'half-dim']);
    expect(q('minor', false)).toEqual(['minor', 'dim', 'major', 'minor', 'minor', 'major', 'major']);
    expect(q('minor', true)).toEqual(['min7', 'half-dim', 'maj7', 'min7', 'min7', 'maj7', 'dom7']);
  });

  it('builds roman numerals', () => {
    expect(DEGREES.map((d) => romanNumeral('major', d))).toEqual(['I', 'II', 'III', 'IV', 'V', 'VI', 'VII']);
    expect(DEGREES.map((d) => romanNumeral('minor', d))).toEqual(['I', 'II', '♭III', 'IV', 'V', '♭VI', '♭VII']);
  });

  it('builds full numerals', () => {
    const n = (f: HarmonyField, s: boolean) => DEGREES.map((d) => degreeNumeral(f, d, s));
    expect(n('major', false)).toEqual(['I', 'IIm', 'IIIm', 'IV', 'V', 'VIm', 'VII°']);
    expect(n('major', true)).toEqual(['I7M', 'IIm7', 'IIIm7', 'IV7M', 'V7', 'VIm7', 'VIIm7(♭5)']);
    expect(n('minor', false)).toEqual(['Im', 'II°', '♭III', 'IVm', 'Vm', '♭VI', '♭VII']);
    expect(n('minor', true)).toEqual(['Im7', 'IIm7(♭5)', '♭III7M', 'IVm7', 'Vm7', '♭VI7M', '♭VII7']);
  });
});

describe('chord invariants', () => {
  const OFFSETS = { maj7: [0, 4, 7, 11], dom7: [0, 4, 7, 10], min7: [0, 3, 7, 10], 'half-dim': [0, 3, 6, 10], major: [0, 4, 7], minor: [0, 3, 7], dim: [0, 3, 6] } as const;
  const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  const PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

  it('has consistent size, pitch classes, signs and thirds', () => {
    for (const f of FIELDS)
      for (const k of KEYS)
        for (const d of DEGREES)
          for (const s of [false, true])
            for (const acc of ACCIDENTALS) {
              const c = spellChord(f, k, d, s, acc);
              expect(c.tones.length).toBe(s ? 4 : 3);
              const root = chordRootClass(f, k, d);
              c.tones.forEach((t, i) => {
                expect(t.accidental).toBeGreaterThanOrEqual(-1);
                expect(t.accidental).toBeLessThanOrEqual(1);
                const pc = (PC[t.letter] + t.accidental + 12) % 12;
                expect(pc).toBe((root + OFFSETS[c.quality][i]) % 12);
                if (i > 0)
                  expect(LETTERS.indexOf(t.letter)).toBe(
                    (LETTERS.indexOf(c.tones[i - 1].letter) + 2) % 7,
                  );
              });
            }
  });
});

describe('key signatures and key lists', () => {
  it('counts accidentals', () => {
    expect(KEYS.map((k) => keySignatureCount('major', k))).toEqual([0, 5, 2, 3, 4, 1, 6, 1, 4, 3, 2, 5]);
    expect(KEYS.map((k) => keySignatureCount('minor', k))).toEqual([3, 4, 1, 6, 1, 4, 3, 2, 5, 0, 5, 2]);
  });

  it('lists keys by level', () => {
    expect(harmonyKeys('major', 'easy')).toEqual([0, 5, 7]);
    expect(harmonyKeys('major', 'medium')).toEqual([0, 2, 3, 5, 7, 9, 10]);
    expect(harmonyKeys('minor', 'easy')).toEqual([2, 4, 9]);
    expect(harmonyKeys('minor', 'medium')).toEqual([0, 2, 4, 6, 7, 9, 11]);
    expect(harmonyKeys('major', 'all')).toEqual(KEYS);
  });

  it('expands field settings', () => {
    expect(fieldsOf('both')).toEqual(['major', 'minor']);
    expect(fieldsOf('minor')).toEqual(['minor']);
  });
});

describe('chordPitches', () => {
  it('places chords from the bottom of the range', () => {
    expect(chordPitches('major', 5, 4, true, GUITAR)).toEqual([46, 50, 53, 57]);
    expect(chordPitches('major', 5, 4, true, BASS)).toEqual([34, 38, 41, 45]);
    expect(chordPitches('major', 2, 4, false, GUITAR)).toEqual([55, 59, 62]);
  });

  it('stays in range and ascends', () => {
    for (const inst of [GUITAR, BASS])
      for (const f of FIELDS)
        for (const k of KEYS)
          for (const d of DEGREES)
            for (const s of [false, true]) {
              const p = chordPitches(f, k, d, s, inst);
              const [lo, hi] = EAR_RANGE[inst.id];
              p.forEach((n, i) => {
                expect(n).toBeGreaterThanOrEqual(lo);
                expect(n).toBeLessThanOrEqual(hi);
                if (i > 0) expect(n).toBeGreaterThan(p[i - 1]);
              });
            }
  });
});
