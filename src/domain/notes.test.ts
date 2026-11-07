import { describe, it, expect } from 'vitest';
import { ACCIDENTALS, ALL_NOTES, NATURAL_NOTES, isNatural, noteLabel } from './notes';
import type { Accidentals, Notation } from './notes';
import { STANDARD_TUNING } from './tuning';

describe('notes', () => {
  it('has 12 notes and 7 naturals', () => {
    expect(ALL_NOTES).toHaveLength(12);
    expect(NATURAL_NOTES).toEqual([0, 2, 4, 5, 7, 9, 11]);
  });

  it('knows which notes are natural', () => {
    expect(isNatural(0)).toBe(true);
    expect(isNatural(1)).toBe(false);
    expect(isNatural(11)).toBe(true);
  });

  it('formats labels in each notation', () => {
    expect(noteLabel(0, 'cifra')).toBe('C');
    expect(noteLabel(0, 'solfejo')).toBe('Dó');
    expect(noteLabel(0, 'ambos')).toBe('C · Dó');
    expect(noteLabel(1, 'cifra')).toBe('C#');
    expect(noteLabel(7, 'solfejo')).toBe('Sol');
    expect(noteLabel(11, 'ambos')).toBe('B · Si');
  });
});

describe('tuning', () => {
  it('is E A D G B E, string 1 = high E', () => {
    expect(STANDARD_TUNING.map((n) => noteLabel(n, 'cifra'))).toEqual([
      'E', 'B', 'G', 'D', 'A', 'E',
    ]);
  });
});

describe('noteLabel with accidentals', () => {
  const TABLES: Record<Accidentals, [string[], string[]]> = {
    sharp: [
      'C C# D D# E F F# G G# A A# B'.split(' '),
      'Dó Dó# Ré Ré# Mi Fá Fá# Sol Sol# Lá Lá# Si'.split(' '),
    ],
    flat: [
      'C Db D Eb E F Gb G Ab A Bb B'.split(' '),
      'Dó Réb Ré Mib Mi Fá Solb Sol Láb Lá Sib Si'.split(' '),
    ],
    auto: [
      'C Db D Eb E F F# G Ab A Bb B'.split(' '),
      'Dó Réb Ré Mib Mi Fá Fá# Sol Láb Lá Sib Si'.split(' '),
    ],
  };

  it.each(['sharp', 'flat', 'auto'] as const)('labels every note with the %s table', (acc) => {
    const [cifra, solfejo] = TABLES[acc];
    for (const n of ALL_NOTES) {
      expect(noteLabel(n, 'cifra', acc)).toBe(cifra[n]);
      expect(noteLabel(n, 'solfejo', acc)).toBe(solfejo[n]);
      expect(noteLabel(n, 'ambos', acc)).toBe(`${cifra[n]} · ${solfejo[n]}`);
    }
  });

  it('defaults to sharp, identical to the two-argument call', () => {
    for (const n of ALL_NOTES) {
      for (const notation of ['cifra', 'solfejo', 'ambos'] as Notation[]) {
        expect(noteLabel(n, notation)).toBe(noteLabel(n, notation, 'sharp'));
      }
    }
  });

  it('exposes the accidentals options', () => {
    expect(ACCIDENTALS).toEqual(['sharp', 'flat', 'auto']);
  });
});
