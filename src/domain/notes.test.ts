import { describe, it, expect } from 'vitest';
import { ALL_NOTES, NATURAL_NOTES, isNatural, noteLabel } from './notes';
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
