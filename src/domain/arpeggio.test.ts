import { describe, it, expect } from 'vitest';
import { TONIC_CHORD, arpeggioKey, arpeggioOf, buildArpeggioQueue, isArpeggioKey, isArpeggioTap } from './arpeggio';
import { chordSemitones } from './chords';
import { BASS, GUITAR } from './instruments';
import type { NoteIndex } from './notes';
import { SCALES, SCALE_IDS } from './scales';
import { scalePlayPool } from './scaleItems';
import type { BoxNote } from './scales';

const pos = (ns: BoxNote[]) => new Set(ns.map((n) => `${n.position.string}-${n.position.fret}`));

describe('TONIC_CHORD', () => {
  it('matches the spec table', () => {
    expect(TONIC_CHORD).toEqual({ 'pent-minor': 'min7', 'pent-major': 'major', blues: 'min7', major: 'maj7', minor: 'min7', dorian: 'min7', phrygian: 'min7', lydian: 'maj7', mixolydian: 'dom7', locrian: 'half-dim' });
  });
});

describe('arpeggioOf literals', () => {
  it('pent-minor box 1 in A, guitar', () => {
    const a = arpeggioOf('pent-minor', 1, 9, GUITAR);
    expect(pos(a.notes)).toEqual(new Set(['6-5', '6-8', '5-7', '4-5', '4-7', '3-5', '2-5', '2-8', '1-5', '1-8']));
    expect(a.rootPitches).toEqual(new Set([45, 57, 69]));
    expect(a.pitches.size).toBe(10);
  });
  it('blues leaves the flat five out', () => {
    expect(pos(arpeggioOf('blues', 1, 9, GUITAR).notes)).toEqual(
      new Set(['6-5', '6-8', '5-7', '4-5', '4-7', '3-5', '2-5', '2-8', '1-5', '1-8']),
    );
  });
  it('pent-major box 1 in C', () => {
    expect(pos(arpeggioOf('pent-major', 1, 0, GUITAR).notes)).toEqual(new Set(['6-8', '5-7', '5-10', '4-10', '3-9', '2-8', '1-8']));
  });
  it('pent-minor box 1 in A, bass', () => {
    const a = arpeggioOf('pent-minor', 1, 9, BASS);
    expect(pos(a.notes)).toEqual(new Set(['4-5', '4-8', '3-7', '2-5', '2-7', '1-5']));
    expect(a.rootPitches.size).toBe(2);
  });
  it('mixolydian box 2 in G', () => {
    expect(pos(arpeggioOf('mixolydian', 2, 7, GUITAR).notes)).toEqual(
      new Set(['6-7', '5-5', '5-8', '4-5', '4-9', '3-7', '2-6', '2-8', '1-7', '1-10']),
    );
  });
});

describe('arpeggio "faltam" sizes', () => {
  const seven = SCALE_IDS.filter((s) => SCALES[s].semitones.length === 7);
  const faltam = (s: (typeof SCALE_IDS)[number], inst: typeof GUITAR, root: number) =>
    Array.from({ length: SCALES[s].boxCount }, (_, i) => {
      const a = arpeggioOf(s, i + 1, root as NoteIndex, inst);
      return a.pitches.size - a.rootPitches.size;
    });
  const cases: [string, typeof GUITAR, (typeof SCALE_IDS)[number][], number[]][] = [
    ['guitar pent-minor', GUITAR, ['pent-minor'], [7, 7, 7, 8, 7]],
    ['guitar pent-major', GUITAR, ['pent-major'], [4, 5, 6, 5, 4]],
    ['guitar blues', GUITAR, ['blues'], [7, 7, 7, 8, 7]],
    ['guitar seven', GUITAR, seven, [7, 8, 8, 8, 8, 7, 8]],
    ['bass pent-minor', BASS, ['pent-minor'], [4, 5, 5, 5, 5]],
    ['bass pent-major', BASS, ['pent-major'], [3, 4, 4, 3, 2]],
    ['bass blues', BASS, ['blues'], [4, 5, 5, 5, 5]],
    ['bass seven', BASS, seven, [5, 5, 6, 5, 5, 5, 5]],
  ];
  it.each(cases)('%s', (_n, inst, scales, expected) => {
    for (const s of scales) for (let r = 0; r < 12; r++) expect(faltam(s, inst, r)).toEqual(expected);
  });
});

describe('arpeggio property', () => {
  it('notes are exactly the chord classes and every such fret is in pitches', () => {
    for (const inst of [GUITAR, BASS]) {
      for (const s of SCALE_IDS) {
        const chord = new Set(chordSemitones(TONIC_CHORD[s]));
        for (let box = 1; box <= SCALES[s].boxCount; box++) {
          for (let root = 0; root < 12; root++) {
            const a = arpeggioOf(s, box, root as NoteIndex, inst);
            const classes = new Set(a.notes.map((n) => (n.pitch - root + 120) % 12));
            expect(classes).toEqual(chord);
            for (let string = 1; string <= inst.stringCount; string++) {
              for (let fret = a.box.fretMin; fret <= a.box.fretMax; fret++) {
                const pitch = inst.openMidi[string - 1] + fret;
                if (chord.has((pitch - root + 120) % 12)) expect(a.pitches.has(pitch)).toBe(true);
              }
            }
          }
        }
      }
    }
  });
});

describe('isArpeggioTap', () => {
  it('compares by pitch', () => {
    const a = arpeggioOf('pent-minor', 1, 9, GUITAR);
    expect(isArpeggioTap(a, { string: 6, fret: 8 }, GUITAR)).toBe(true);
    expect(isArpeggioTap(a, { string: 5, fret: 5 }, GUITAR)).toBe(false);
    expect(isArpeggioTap(a, { string: 5, fret: 6 }, GUITAR)).toBe(false);
    // mesma classe de altura (A), outra oitava fora do desenho
    expect(isArpeggioTap(a, { string: 1, fret: 17 }, GUITAR)).toBe(false);
    expect(isArpeggioTap(arpeggioOf('major', 1, 0, GUITAR), { string: 1, fret: 8 }, GUITAR)).toBe(true);
  });
});

describe('arpeggio keys', () => {
  it('builds keys', () => {
    expect(arpeggioKey({ scale: 'pent-minor', root: 9, box: 1 })).toBe('arp:pent-minor:9:1');
  });
  it.each(['arp:pent-minor:9:1', 'arp:major:0:7', 'arp:blues:11:5'])('accepts %s', (k) => expect(isArpeggioKey(k)).toBe(true));
  it.each(['arp:blues:0:6', 'arp:major:12:1', 'arp:major:01:1', 'arp:foo:0:1', 'arp:major:0:0', 'scaleplay:major:0:1'])(
    'rejects %s',
    (k) => expect(isArpeggioKey(k)).toBe(false),
  );
  it('queue is a permutation', () => {
    const items = scalePlayPool('major', 'all');
    const q = buildArpeggioQueue(items, () => 0.4);
    expect(q.map(arpeggioKey).sort()).toEqual(items.map(arpeggioKey).sort());
  });
});
