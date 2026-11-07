import { describe, expect, it } from 'vitest';
import {
  CHORD_QUALITIES,
  CHORD_SHAPES,
  CHORD_SHAPE_IDS,
  TRIAD_FAMILY,
  barreFret,
  chordFamily,
  chordSemitones,
  chordVoicing,
  functionLabel,
  isChordShapeId,
  isTriad,
  shapeRoots,
  spellChordTones,
  voicingPitches,
  type ChordShapeId,
  type Voicing,
} from './chords';
import { QUALITY_SYMBOL, SEVENTH_QUALITIES, chordRootClass, degreeQuality, spellChord, type ChordQuality } from './harmony';
import { spellingLabel, type Spelling } from './spelling';
import type { Accidentals, NoteIndex } from './notes';

const fmt = (v: Voicing) =>
  [6, 5, 4, 3, 2, 1]
    .map((s) => {
      const n = v.notes.find((n) => n.position.string === s);
      return n ? String(n.position.fret) : 'x';
    })
    .join('-');
const sym = (r: number, q: ChordQuality, acc: Accidentals) =>
  spellingLabel(spellChordTones(r as NoteIndex, q, acc)[0], 'cifra') + QUALITY_SYMBOL[q];
const ROOTS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as NoteIndex[];
const NATURAL: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const pcOf = (s: Spelling) => (((NATURAL[s.letter] + s.accidental) % 12) + 12) % 12;

const OPEN: Record<string, string> = { c: 'x-3-2-0-1-0', a: 'x-0-2-2-2-0', g: '3-2-0-0-0-3', e: '0-2-2-1-0-0', d: 'x-x-0-2-3-2', am: 'x-0-2-2-1-0', em: '0-2-2-0-0-0', dm: 'x-x-0-2-3-1', g7: '3-2-0-0-0-1', c7: 'x-3-2-3-1-0', d7: 'x-x-0-2-1-2', a7: 'x-0-2-0-2-0', e7: '0-2-0-1-0-0', am7: 'x-0-2-0-1-0', em7: '0-2-0-0-0-0', dm7: 'x-x-0-2-1-1', cmaj7: 'x-3-2-0-0-0', fmaj7: 'x-x-3-2-1-0', bm7b5: 'x-2-3-2-3-x' };
const OPEN_NAME: Record<string, string> = { c: 'C', a: 'A', g: 'G', e: 'E', d: 'D', am: 'Am', em: 'Em', dm: 'Dm', g7: 'G7', c7: 'C7', d7: 'D7', a7: 'A7', e7: 'E7', am7: 'Am7', em7: 'Em7', dm7: 'Dm7', cmaj7: 'C7M', fmaj7: 'F7M', bm7b5: 'Bm7(b5)' };
/** Índice = fundamental 0..11. */
const MOVABLE: Record<string, string[]> = {
  'e-maj': ['8-10-10-9-8-8', '9-11-11-10-9-9', '10-12-12-11-10-10', '11-13-13-12-11-11', '12-14-14-13-12-12', '1-3-3-2-1-1', '2-4-4-3-2-2', '3-5-5-4-3-3', '4-6-6-5-4-4', '5-7-7-6-5-5', '6-8-8-7-6-6', '7-9-9-8-7-7'],
  'e-min': ['8-10-10-8-8-8', '9-11-11-9-9-9', '10-12-12-10-10-10', '11-13-13-11-11-11', '12-14-14-12-12-12', '1-3-3-1-1-1', '2-4-4-2-2-2', '3-5-5-3-3-3', '4-6-6-4-4-4', '5-7-7-5-5-5', '6-8-8-6-6-6', '7-9-9-7-7-7'],
  'e-7': ['8-10-8-9-8-8', '9-11-9-10-9-9', '10-12-10-11-10-10', '11-13-11-12-11-11', '12-14-12-13-12-12', '1-3-1-2-1-1', '2-4-2-3-2-2', '3-5-3-4-3-3', '4-6-4-5-4-4', '5-7-5-6-5-5', '6-8-6-7-6-6', '7-9-7-8-7-7'],
  'e-m7': ['8-10-8-8-8-8', '9-11-9-9-9-9', '10-12-10-10-10-10', '11-13-11-11-11-11', '12-14-12-12-12-12', '1-3-1-1-1-1', '2-4-2-2-2-2', '3-5-3-3-3-3', '4-6-4-4-4-4', '5-7-5-5-5-5', '6-8-6-6-6-6', '7-9-7-7-7-7'],
  'a-maj': ['x-3-5-5-5-3', 'x-4-6-6-6-4', 'x-5-7-7-7-5', 'x-6-8-8-8-6', 'x-7-9-9-9-7', 'x-8-10-10-10-8', 'x-9-11-11-11-9', 'x-10-12-12-12-10', 'x-11-13-13-13-11', 'x-12-14-14-14-12', 'x-1-3-3-3-1', 'x-2-4-4-4-2'],
  'a-min': ['x-3-5-5-4-3', 'x-4-6-6-5-4', 'x-5-7-7-6-5', 'x-6-8-8-7-6', 'x-7-9-9-8-7', 'x-8-10-10-9-8', 'x-9-11-11-10-9', 'x-10-12-12-11-10', 'x-11-13-13-12-11', 'x-12-14-14-13-12', 'x-1-3-3-2-1', 'x-2-4-4-3-2'],
  'a-7': ['x-3-5-3-5-3', 'x-4-6-4-6-4', 'x-5-7-5-7-5', 'x-6-8-6-8-6', 'x-7-9-7-9-7', 'x-8-10-8-10-8', 'x-9-11-9-11-9', 'x-10-12-10-12-10', 'x-11-13-11-13-11', 'x-12-14-12-14-12', 'x-1-3-1-3-1', 'x-2-4-2-4-2'],
  'a-m7': ['x-3-5-3-4-3', 'x-4-6-4-5-4', 'x-5-7-5-6-5', 'x-6-8-6-7-6', 'x-7-9-7-8-7', 'x-8-10-8-9-8', 'x-9-11-9-10-9', 'x-10-12-10-11-10', 'x-11-13-11-12-11', 'x-12-14-12-13-12', 'x-1-3-1-2-1', 'x-2-4-2-3-2'],
  'a-maj7': ['x-3-5-4-5-3', 'x-4-6-5-6-4', 'x-5-7-6-7-5', 'x-6-8-7-8-6', 'x-7-9-8-9-7', 'x-8-10-9-10-8', 'x-9-11-10-11-9', 'x-10-12-11-12-10', 'x-11-13-12-13-11', 'x-12-14-13-14-12', 'x-1-3-2-3-1', 'x-2-4-3-4-2'],
  'a-m7b5': ['x-3-4-3-4-x', 'x-4-5-4-5-x', 'x-5-6-5-6-x', 'x-6-7-6-7-x', 'x-7-8-7-8-x', 'x-8-9-8-9-x', 'x-9-10-9-10-x', 'x-10-11-10-11-x', 'x-11-12-11-12-x', 'x-12-13-12-13-x', 'x-1-2-1-2-x', 'x-2-3-2-3-x'],
};
/** Nomes em cifra por fundamental 0..11, por ajuste e qualidade. */
const SYMBOLS: Record<string, Record<string, string>> = {
  auto: { major: 'C Db D Eb E F F# G Ab A Bb B', minor: 'Cm C#m Dm Ebm Em Fm F#m Gm G#m Am Bbm Bm', dom7: 'C7 Db7 D7 Eb7 E7 F7 F#7 G7 Ab7 A7 Bb7 B7', min7: 'Cm7 C#m7 Dm7 Ebm7 Em7 Fm7 F#m7 Gm7 G#m7 Am7 Bbm7 Bm7', maj7: 'C7M Db7M D7M Eb7M E7M F7M Gb7M G7M Ab7M A7M Bb7M B7M', 'half-dim': 'Cm7(b5) C#m7(b5) Dm7(b5) D#m7(b5) Em7(b5) Fm7(b5) F#m7(b5) Gm7(b5) G#m7(b5) Am7(b5) A#m7(b5) Bm7(b5)' },
  sharp: { major: 'C C# D Eb E F F# G G# A Bb B', minor: 'Cm C#m Dm D#m Em Fm F#m Gm G#m Am A#m Bm', dom7: 'C7 C#7 D7 Eb7 E7 F7 F#7 G7 G#7 A7 Bb7 B7', min7: 'Cm7 C#m7 Dm7 D#m7 Em7 Fm7 F#m7 Gm7 G#m7 Am7 A#m7 Bm7', maj7: 'C7M C#7M D7M Eb7M E7M F7M F#7M G7M Ab7M A7M Bb7M B7M', 'half-dim': 'Cm7(b5) C#m7(b5) Dm7(b5) D#m7(b5) Em7(b5) Fm7(b5) F#m7(b5) Gm7(b5) G#m7(b5) Am7(b5) A#m7(b5) Bm7(b5)' },
  flat: { major: 'C Db D Eb E F Gb G Ab A Bb B', minor: 'Cm Dbm Dm Ebm Em Fm F#m Gm Abm Am Bbm Bm', dom7: 'C7 Db7 D7 Eb7 E7 F7 Gb7 G7 Ab7 A7 Bb7 B7', min7: 'Cm7 Dbm7 Dm7 Ebm7 Em7 Fm7 F#m7 Gm7 Abm7 Am7 Bbm7 Bm7', maj7: 'C7M Db7M D7M Eb7M E7M F7M Gb7M G7M Ab7M A7M Bb7M B7M', 'half-dim': 'Cm7(b5) C#m7(b5) Dm7(b5) D#m7(b5) Em7(b5) Fm7(b5) F#m7(b5) Gm7(b5) G#m7(b5) Am7(b5) Bbm7(b5) Bm7(b5)' },
};

const OPEN_IDS = CHORD_SHAPE_IDS.filter((id) => CHORD_SHAPES[id].form === 'open');
const MOVABLE_IDS = CHORD_SHAPE_IDS.filter((id) => CHORD_SHAPES[id].form !== 'open');

describe('qualities', () => {
  it('lists the six qualities and families', () => {
    expect(CHORD_QUALITIES).toEqual(['major', 'minor', 'maj7', 'dom7', 'min7', 'half-dim']);
    expect(TRIAD_FAMILY).toEqual(['major', 'minor']);
    expect(chordFamily('minor')).toBe(TRIAD_FAMILY);
    expect(chordFamily('dom7')).toBe(SEVENTH_QUALITIES);
    expect(isTriad('major')).toBe(true);
    expect(isTriad('half-dim')).toBe(false);
  });

  it('has the semitone table', () => {
    expect(chordSemitones('major')).toEqual([0, 4, 7]);
    expect(chordSemitones('minor')).toEqual([0, 3, 7]);
    expect(chordSemitones('dom7')).toEqual([0, 4, 7, 10]);
    expect(chordSemitones('min7')).toEqual([0, 3, 7, 10]);
    expect(chordSemitones('maj7')).toEqual([0, 4, 7, 11]);
    expect(chordSemitones('half-dim')).toEqual([0, 3, 6, 10]);
  });

  it('labels functions', () => {
    expect([0, 3, 4, 6, 7, 10, 11].map(functionLabel)).toEqual(['1', '♭3', '3', '♭5', '5', '♭7', '7']);
  });
});

describe('spellChordTones', () => {
  const cifra = (r: number, q: ChordQuality, acc: Accidentals) =>
    spellChordTones(r as NoteIndex, q, acc).map((s) => spellingLabel(s, 'cifra'));
  it('spells known chords', () => {
    expect(cifra(1, 'major', 'sharp')).toEqual(['C#', 'E#', 'G#']);
    expect(cifra(1, 'minor', 'flat')).toEqual(['Db', 'Fb', 'Ab']);
    expect(cifra(1, 'minor', 'auto')).toEqual(['C#', 'E', 'G#']);
    expect(cifra(10, 'dom7', 'auto')).toEqual(['Bb', 'D', 'F', 'Ab']);
    expect(cifra(3, 'min7', 'sharp')).toEqual(['D#', 'F#', 'A#', 'C#']);
  });

  const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  it.each(CHORD_QUALITIES.flatMap((q) => (['auto', 'sharp', 'flat'] as const).map((acc) => [q, acc] as const)))(
    '%s/%s: signs within one, letters step by two',
    (q, acc) => {
      for (const r of ROOTS) {
        const tones = spellChordTones(r, q, acc);
        expect(tones).toHaveLength(chordSemitones(q).length);
        tones.forEach((t, i) => {
          expect(Math.abs(t.accidental)).toBeLessThanOrEqual(1);
          expect(LETTERS.indexOf(t.letter)).toBe((LETTERS.indexOf(tones[0].letter) + 2 * i) % 7);
          expect(pcOf(t)).toBe((r + chordSemitones(q)[i]) % 12);
        });
      }
    },
  );

  it.each(CHORD_QUALITIES.flatMap((q) => (['auto', 'sharp', 'flat'] as const).map((acc) => [q, acc] as const)))(
    'names %s/%s for all roots',
    (q, acc) => {
      expect(ROOTS.map((r) => sym(r, q, acc)).join(' ')).toBe(SYMBOLS[acc][q]);
    },
  );
});

describe('shape table', () => {
  it('has 29 ids in order', () => {
    expect(CHORD_SHAPE_IDS).toHaveLength(29);
    expect(CHORD_SHAPE_IDS.join(' ')).toBe(
      'c a g e d am em dm g7 c7 d7 a7 e7 am7 em7 dm7 cmaj7 fmaj7 bm7b5 e-maj e-min e-7 e-m7 a-maj a-min a-7 a-m7 a-maj7 a-m7b5',
    );
  });

  it('validates ids', () => {
    expect(isChordShapeId('a-m7b5')).toBe(true);
    expect(isChordShapeId('f')).toBe(false);
    expect(isChordShapeId('E-maj')).toBe(false);
    expect(isChordShapeId(1)).toBe(false);
  });

  it('computes shape roots and barre frets', () => {
    expect(shapeRoots('c')).toEqual([0]);
    expect(shapeRoots('e-maj')).toEqual(ROOTS);
    expect(barreFret('e-maj', 4)).toBe(12);
    expect(barreFret('a-maj', 9)).toBe(12);
    expect(barreFret('e-min', 5)).toBe(1);
    expect(barreFret('c', 0)).toBe(0);
  });
});

describe('open voicings', () => {
  it('c is x-3-2-0-1-0', () => {
    expect(fmt(chordVoicing('c', 0))).toBe('x-3-2-0-1-0');
  });
  it.each(OPEN_IDS)('%s frets and name', (id) => {
    expect(fmt(chordVoicing(id, 0))).toBe(OPEN[id]);
    expect(sym(CHORD_SHAPES[id].root!, CHORD_SHAPES[id].quality, 'auto')).toBe(OPEN_NAME[id]);
  });
});

describe('movable voicings', () => {
  it.each(MOVABLE_IDS.flatMap((id) => ROOTS.map((r) => [id, r] as const)))('%s root %i', (id, r) => {
    expect(fmt(chordVoicing(id, r))).toBe(MOVABLE[id][r]);
  });
});

describe('voicing properties against the M5 layer', () => {
  it.each(CHORD_SHAPE_IDS.flatMap((id) => shapeRoots(id).map((r) => [id, r] as const)))('%s root %i', (id, root) => {
    const shape = CHORD_SHAPES[id];
    const q = shape.quality;
    const sevenths = !isTriad(q);
    let d = 0;
    let k = 0;
    for (let dd = 1; dd <= 7 && !d; dd++) {
      if (degreeQuality('major', dd, sevenths) !== q) continue;
      for (const kk of ROOTS) {
        if (chordRootClass('major', kk, dd) === root) {
          d = dd;
          k = kk;
          break;
        }
      }
    }
    expect(d).toBeGreaterThan(0);
    const expected = new Set(spellChord('major', k as NoteIndex, d, sevenths, 'auto').tones.map(pcOf));
    if (shape.omitsFifth) expected.delete((root + 7) % 12);
    const v = chordVoicing(id, root as NoteIndex);
    expect(new Set(v.notes.map((n) => n.pitch % 12))).toEqual(expected);
    expect(v.notes[0].isRoot).toBe(true);
    expect(v.notes[0].pitch % 12).toBe(root);
    for (const n of v.fretted) {
      expect(n.position.fret).toBeGreaterThanOrEqual(1);
      expect(n.position.fret).toBeLessThanOrEqual(14);
      expect(n.position.fret).toBeGreaterThanOrEqual(v.fretMin);
      expect(n.position.fret).toBeLessThanOrEqual(v.fretMax);
    }
    expect(new Set(v.notes.map((n) => n.position.string)).size).toBe(v.notes.length);
    expect(Math.max(...v.notes.map((n) => n.pitch))).toBeLessThanOrEqual(76);
  });

  it('only c7 omits the fifth', () => {
    expect(CHORD_SHAPE_IDS.filter((id) => CHORD_SHAPES[id as ChordShapeId].omitsFifth)).toEqual(['c7']);
  });
});

describe('windows and extras', () => {
  it('open c', () => {
    const v = chordVoicing('c', 0);
    expect([v.fretMin, v.fretMax]).toEqual([1, 4]);
    expect(v.stringMarks).toEqual(['open', null, 'open', null, null, 'muted']);
    expect(v.barre).toBeUndefined();
    expect(voicingPitches(v)).toEqual([48, 52, 55, 60, 64]);
  });
  it('e-maj on 9', () => {
    const v = chordVoicing('e-maj', 9);
    expect([v.fretMin, v.fretMax]).toEqual([4, 8]);
    expect(v.barre).toEqual({ fret: 5, fromString: 6, toString: 1 });
    expect(voicingPitches(v)).toEqual([45, 52, 57, 61, 64, 69]);
    expect(v.stringMarks).toEqual([null, null, null, null, null, null]);
  });
  it('a-min on 11', () => {
    const v = chordVoicing('a-min', 11);
    expect([v.fretMin, v.fretMax]).toEqual([1, 5]);
    expect(v.barre).toEqual({ fret: 2, fromString: 5, toString: 1 });
    expect(v.stringMarks[5]).toBe('muted');
  });
  it('e-maj on 4 sits at the twelfth fret', () => {
    const v = chordVoicing('e-maj', 4);
    expect([v.fretMin, v.fretMax]).toEqual([11, 15]);
  });
  it('a-m7b5 has no barre', () => {
    expect(chordVoicing('a-m7b5', 0).barre).toBeUndefined();
  });
  it('functions of am7', () => {
    expect(chordVoicing('am7', 0).notes.map((n) => n.func)).toEqual(['1', '5', '♭7', '♭3', '5']);
  });
  it('highest pitch is 76', () => {
    const all = CHORD_SHAPE_IDS.flatMap((id) => shapeRoots(id).map((r) => chordVoicing(id, r)));
    expect(Math.max(...all.flatMap((v) => voicingPitches(v)))).toBe(76);
  });
});
