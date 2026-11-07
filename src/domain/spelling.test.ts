import { describe, it, expect } from 'vitest';
import { ACCIDENTALS, ALL_NOTES } from './notes';
import { INTERVALS, intervalAnswer, intervalById } from './intervals';
import { spellInterval, spellNote, spellingLabel } from './spelling';
import type { Letter } from './spelling';

const NATURAL_PC: Record<Letter, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

// rows: root (Auto table), columns: INTERVALS order 2m 2M 3m 3M 4J 4A 5J 6m 6M 7m 7M
const AUTO_ARRIVALS: string[][] = [
  ['Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'],
  ['D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B', 'C'],
  ['Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B', 'C', 'C#'],
  ['E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B', 'C', 'Db', 'D'],
  ['F', 'F#', 'G', 'G#', 'A', 'A#', 'B', 'C', 'C#', 'D', 'D#'],
  ['Gb', 'G', 'Ab', 'A', 'Bb', 'B', 'C', 'Db', 'D', 'Eb', 'E'],
  ['G', 'G#', 'A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F'],
  ['Ab', 'A', 'Bb', 'B', 'C', 'C#', 'D', 'Eb', 'E', 'F', 'F#'],
  ['A', 'Bb', 'B', 'C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G'],
  ['Bb', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#'],
  ['B', 'C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A'],
  ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#'],
];

function pitchClass(s: { letter: Letter; accidental: number }): number {
  return (NATURAL_PC[s.letter] + s.accidental + 12) % 12;
}

describe('spelling', () => {
  it('spellNote letter + accidental always lands on the pitch class', () => {
    for (const acc of ACCIDENTALS) {
      for (const n of ALL_NOTES) expect(pitchClass(spellNote(n, acc))).toBe(n);
    }
  });

  it('spellingLabel formats both notations', () => {
    const bb = { letter: 'B', accidental: -1 } as const;
    expect(spellingLabel(bb, 'cifra')).toBe('Bb');
    expect(spellingLabel(bb, 'solfejo')).toBe('Sib');
    expect(spellingLabel(bb, 'ambos')).toBe('Bb · Sib');
    const fs = { letter: 'F', accidental: 1 } as const;
    expect(spellingLabel(fs, 'cifra')).toBe('F#');
    expect(spellingLabel(fs, 'solfejo')).toBe('Fá#');
    expect(spellingLabel({ letter: 'G', accidental: 0 }, 'solfejo')).toBe('Sol');
  });

  it.each(ALL_NOTES.map((n) => [n]))('spells auto arrivals from root %i', (root) => {
    INTERVALS.forEach((iv, i) => {
      expect(spellingLabel(spellInterval(root, iv, 'auto'), 'cifra')).toBe(AUTO_ARRIVALS[root][i]);
    });
  });

  it('names the arrival in solfejo and ambos', () => {
    expect(spellingLabel(spellInterval(0, intervalById('3m'), 'auto'), 'solfejo')).toBe('Mib');
    expect(spellingLabel(spellInterval(6, intervalById('3M'), 'auto'), 'solfejo')).toBe('Lá#');
    expect(spellingLabel(spellInterval(6, intervalById('3M'), 'auto'), 'ambos')).toBe('A# · Lá#');
  });

  it('keeps the pitch class in every mode', () => {
    for (const acc of ACCIDENTALS) {
      for (const root of ALL_NOTES) {
        for (const iv of INTERVALS) {
          expect(pitchClass(spellInterval(root, iv, acc))).toBe(intervalAnswer({ root, interval: iv.id }));
        }
      }
    }
  });

  it('never shows a double or a rare enharmonic', () => {
    for (const acc of ACCIDENTALS) {
      for (const root of ALL_NOTES) {
        for (const iv of INTERVALS) {
          const s = spellInterval(root, iv, acc);
          expect([-1, 0, 1]).toContain(s.accidental);
          expect(['Fb', 'Cb', 'E#', 'B#']).not.toContain(spellingLabel(s, 'cifra'));
        }
      }
    }
  });

  it('uses the root from the chosen table in sharp and flat', () => {
    expect(spellingLabel(spellInterval(0, intervalById('3m'), 'sharp'), 'cifra')).toBe('Eb');
    expect(spellingLabel(spellInterval(1, intervalById('3M'), 'sharp'), 'cifra')).toBe('F');
    expect(spellingLabel(spellInterval(6, intervalById('2m'), 'flat'), 'cifra')).toBe('G');
  });
});
